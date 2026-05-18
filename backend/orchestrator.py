"""
Orchestrator: drives the full chained-segment generation loop.

Flow per job:
  1. Compute how many segments are needed
  2. For each segment:
       a. Patch workflow JSON (start_image, seed, prompt, dims)
       b. Submit to ComfyUI via API
       c. Poll until done
       d. Retrieve output video path
       e. Extract last frame → next start_image
  3. Stitch all segments with FFmpeg crossfade
  4. Update job status → 'done'
"""

import copy
import json
import logging
import math
from pathlib import Path

from comfy_client import (
    upload_image,
    submit_workflow,
    poll_until_done,
    get_output_video_path,
)
from video_utils import extract_last_frame, stitch_segments, trim_segment_start
from models import jobs, append_job_log
from config import cfg

logger = logging.getLogger(__name__)


def _fail_job(job_id: str, message: str) -> None:
    jobs[job_id]["status"] = "error"
    jobs[job_id]["error"] = message
    append_job_log(job_id, message, level="error")
    logger.error("[%s] %s", job_id, message)

# ── Timing constants ────────────────────────────────────────────────────────
CLIP_FRAMES = cfg.clip_frames          # frames per segment — matches Wan22ImageToVideoLatent
TRIM_FRAMES = cfg.trim_frames          # frames to drop from segment start
BASE_SEED = cfg.base_seed              # base seed for deterministic chaining

WORKFLOW_PATH = Path(__file__).parent / "workflows" / "video_wan2_2_5B_ti2v.json"


def _workflow_fps(workflow: dict) -> float:
    """Read CreateVideo fps from the workflow; fall back to config default."""
    for node in workflow.get("nodes", []):
        if node.get("type") == "CreateVideo":
            wv = node.get("widgets_values", [])
            if wv:
                try:
                    return float(wv[0])
                except (TypeError, ValueError):
                    break
    return float(cfg.output_fps)


def run_pipeline(
    job_id: str,
    img_bytes: bytes,
    prompt: str,
    negative_prompt: str,
    duration_seconds: int,
    width: int,
    height: int,
    cfg_scale: float,
    steps: int,
) -> None:
    """Entry point called by FastAPI BackgroundTasks."""
    jobs[job_id]["status"] = "running"
    append_job_log(job_id, "Generation started")

    work_dir = Path(f"/tmp/{job_id}")
    work_dir.mkdir(parents=True, exist_ok=True)
    logger.info("[%s] Work dir: %s", job_id, work_dir)
    append_job_log(job_id, f"Working directory created at {work_dir}")

    # ── Save initial avatar image ───────────────────────────────────────────
    start_img = work_dir / "frame_000.jpg"
    start_img.write_bytes(img_bytes)
    logger.info("[%s] Saved start image -> %s", job_id, start_img)
    append_job_log(job_id, "Uploaded image received and saved")

    # ── Load base workflow ──────────────────────────────────────────────────
    with open(WORKFLOW_PATH) as f:
        base_workflow = json.load(f)

    output_fps = _workflow_fps(base_workflow)
    logger.info("[%s] Workflow FPS: %.2f", job_id, output_fps)

    # ── Compute segment count ───────────────────────────────────────────────
    effective_clip = (CLIP_FRAMES - TRIM_FRAMES) / output_fps
    n_segments = max(1, math.ceil(duration_seconds / effective_clip))
    jobs[job_id]["total_segments"] = n_segments
    append_job_log(job_id, f"Planning {n_segments} segment(s) for {duration_seconds}s output")

    logger.info(
        "[%s] Generating %s segments × %s frames at %.2f fps (effective %.2fs)",
        job_id,
        n_segments,
        CLIP_FRAMES,
        output_fps,
        effective_clip,
    )

    raw_segment_paths = []
    trimmed_segment_paths = []

    for i in range(n_segments):
        logger.info(f"[{job_id}] Segment {i+1}/{n_segments} — start_image: {start_img}")
        jobs[job_id]["progress"] = i
        append_job_log(job_id, f"Segment {i + 1}/{n_segments}: uploading start image")

        # ── Upload start image ──────────────────────────────────────────────
        logger.info("[%s] Uploading start image", job_id)
        comfy_filename = upload_image(start_img, filename=f"start_{job_id}_{i}.jpg")
        if not comfy_filename:
            _fail_job(job_id, f"Image upload failed at segment {i + 1}")
            return
        append_job_log(job_id, f"Segment {i + 1}: image uploaded")

        # ── Patch workflow ──────────────────────────────────────────────────
        logger.info("[%s] Patching workflow", job_id)
        append_job_log(job_id, f"Segment {i + 1}: patching workflow")
        workflow = patch_workflow(
            base_workflow=base_workflow,
            start_image_filename=comfy_filename,
            prompt=prompt,
            negative_prompt=negative_prompt,
            seed=BASE_SEED + i,
            width=width,
            height=height,
            cfg_scale=cfg_scale,
            steps=steps,
            frames=CLIP_FRAMES,
        )

        # ── Submit & poll ───────────────────────────────────────────────────
        logger.info("[%s] Submitting workflow", job_id)
        prompt_id = submit_workflow(workflow)
        if not prompt_id:
            _fail_job(job_id, f"Workflow submit failed at segment {i + 1}")
            return

        logger.info("[%s] Polling ComfyUI for prompt_id=%s", job_id, prompt_id)
        append_job_log(job_id, f"Segment {i + 1}: polling ComfyUI")
        success = poll_until_done(prompt_id)
        if not success:
            _fail_job(job_id, f"Segment {i + 1} timed out or failed")
            return

        # ── Retrieve output video ───────────────────────────────────────────
        logger.info("[%s] Downloading output video", job_id)
        append_job_log(job_id, f"Segment {i + 1}: downloading output video")
        raw_path = get_output_video_path(prompt_id, work_dir, segment_index=i)
        if not raw_path:
            _fail_job(job_id, f"Could not locate output video for segment {i + 1}")
            return

        raw_segment_paths.append(raw_path)
        jobs[job_id]["segments"].append(raw_path)
        append_job_log(job_id, f"Segment {i + 1}: saved video artifact")

        # ── Trim segment start (skip for first segment) ─────────────────────
        if i > 0 and TRIM_FRAMES > 0:
            trimmed = work_dir / f"segment_trimmed_{i:03d}.mp4"
            logger.info("[%s] Trimming %s frames -> %s", job_id, TRIM_FRAMES, trimmed)
            append_job_log(job_id, f"Segment {i + 1}: trimming first {TRIM_FRAMES} frames")
            trim_segment_start(raw_path, str(trimmed), trim_frames=TRIM_FRAMES, fps=output_fps)
            trimmed_segment_paths.append(str(trimmed))
        else:
            trimmed_segment_paths.append(raw_path)

        # ── Extract last frame → next start image ──────────────────────────
        next_frame = work_dir / f"frame_{i+1:03d}.jpg"
        logger.info("[%s] Extracting last frame -> %s", job_id, next_frame)
        append_job_log(job_id, f"Segment {i + 1}: extracting last frame for chaining")
        extract_last_frame(raw_path, str(next_frame))
        start_img = next_frame

    # ── Stitch all segments ─────────────────────────────────────────────────
    final_output = str(work_dir / "final.mp4")
    logger.info("[%s] Stitching %s segments -> %s", job_id, len(trimmed_segment_paths), final_output)
    append_job_log(job_id, "Stitching all segments into final video")
    stitch_segments(
        segment_paths=trimmed_segment_paths,
        output_path=final_output,
        clip_duration=(CLIP_FRAMES - TRIM_FRAMES) / output_fps,
        xfade_duration=0.0,
    )

    jobs[job_id]["output"] = final_output
    jobs[job_id]["progress"] = n_segments
    jobs[job_id]["status"] = "done"
    append_job_log(job_id, f"Generation complete: {final_output}")
    logger.info(f"[{job_id}] Pipeline complete → {final_output}")


# ── Workflow patching ────────────────────────────────────────────────────────

# Maps ComfyUI node type → ordered list of widget_value keys.
# Only nodes we actually patch need entries here.
WIDGET_KEYS = {
    "UNETLoader":               ["unet_name", "weight_dtype"],
    "CLIPLoader":               ["clip_name", "type", "device"],
    "VAELoader":                ["vae_name"],
    "LoadImage":                ["image", "upload"],
    "CLIPTextEncode":           ["text"],
    "KSampler":                 ["seed", "control_after_generate", "steps", "cfg",
                                 "sampler_name", "scheduler", "denoise"],
    "ModelSamplingSD3":         ["shift"],
    "Wan22ImageToVideoLatent":  ["width", "height", "length", "batch_size"],
    "CreateVideo":              ["fps"],
    "SaveVideo":                ["filename_prefix", "format", "codec"],
}


def patch_workflow(
    base_workflow: dict,
    start_image_filename: str,
    prompt: str,
    negative_prompt: str,
    seed: int,
    width: int,
    height: int,
    cfg_scale: float,
    steps: int,
    frames: int,
) -> dict:
    """Return a deep-copied workflow with per-segment values injected."""
    wf = copy.deepcopy(base_workflow)

    for node in wf["nodes"]:
        t = node["type"]
        wv = node.get("widgets_values", [])
        title = node.get("title", "")

        if t == "LoadImage":
            wv[0] = start_image_filename

        elif t == "CLIPTextEncode":
            if "Positive" in title or "positive" in title.lower():
                wv[0] = prompt
            elif "Negative" in title or "negative" in title.lower():
                wv[0] = negative_prompt

        elif t == "KSampler":
            # [seed, control_after_generate, steps, cfg, sampler, scheduler, denoise]
            wv[0] = seed
            wv[1] = "fixed"   # lock seed so it's reproducible
            wv[2] = steps
            wv[3] = cfg_scale

        elif t == "Wan22ImageToVideoLatent":
            # [width, height, length, batch_size]
            wv[0] = width
            wv[1] = height
            wv[2] = frames

        node["widgets_values"] = wv

    return wf
