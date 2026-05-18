"""
Avatar Video Pipeline — FastAPI entry point
POST   /generate               → kicks off background generation job
GET    /status/{job_id}        → poll job progress
GET    /download/{job_id}      → download final mp4
GET    /jobs/{job_id}/segments → download intermediate segment videos
GET    /config                 → inspect current ComfyUI URL
PATCH  /config                 → update current ComfyUI URL
"""

from pathlib import Path

from fastapi import FastAPI, BackgroundTasks, UploadFile, Form, HTTPException, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import uuid
from pydantic import BaseModel

from orchestrator import run_pipeline
from comfy_client import check_connection
from config import cfg
from models import jobs, create_job_record

app = FastAPI(title="Avatar Video Pipeline", version="1.0.0")

# Ensure app logs and pipeline logs show up in the terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfigPayload(BaseModel):
    comfy_url: str


def _job_payload(job_id: str, job: dict) -> dict:
    segment_urls = [f"/jobs/{job_id}/segments/{index}" for index in range(len(job.get("segments", [])))]
    payload = {
        "job_id": job_id,
        **job,
        "segment_urls": segment_urls,
        "download_url": f"/download/{job_id}" if job.get("status") == "done" else None,
    }
    return payload


def _get_job_or_404(job_id: str) -> dict:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/config")
def get_config():
    return {"comfy_url": cfg.comfy_url, "connection": check_connection()}


@app.patch("/config")
def update_config(payload: ConfigPayload):
    comfy_url = payload.comfy_url.strip()
    if not comfy_url:
        raise HTTPException(400, "comfy_url is required")

    cfg.comfy_url = comfy_url
    return {"comfy_url": cfg.comfy_url, "connection": check_connection()}


@app.post("/generate")
async def generate(
    image: UploadFile = File(...),
    comfy_url: str = Form(default=""),
    prompt: str = Form(...),
    negative_prompt: str = Form(
        default=(
            "low quality, worst quality, blurry, out of focus, overexposed, "
            "underexposed, low contrast, noisy, distorted face, deformed eyes, "
            "bad anatomy, extra fingers, missing fingers, fused fingers, "
            "poorly drawn hands, poorly drawn face, duplicate person, "
            "multiple people, crowded background, messy background, "
            "background movement, subtitles, watermark, text, logo, artifacts, "
            "jpeg artifacts, cartoon, painting, anime, unrealistic skin, "
            "unnatural lip sync, frozen frame, static pose, weird mouth movement, "
            "asymmetrical face, flickering, shaky camera, mutated limbs, "
            "extra limbs, bad proportions, tilted face, motion blur, "
            "dark lighting, harsh shadows, grainy video, warped body, "
            "inconsistent frames, background characters, walking backwards, "
            "camera jitter"
        )
    ),
    duration_seconds: int = Form(default=30),
    width: int = Form(default=640),
    height: int = Form(default=480),
    cfg_scale: float = Form(default=5.0),
    steps: int = Form(default=20),
    background_tasks: BackgroundTasks = None,
):
    """Submit a video generation job. Returns a job_id to poll."""
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, "Image must be jpeg, png, or webp")

    job_id = str(uuid.uuid4())
    img_bytes = await image.read()

    comfy_url_value = comfy_url.strip() or None

    jobs[job_id] = create_job_record(comfy_url=comfy_url_value)

    background_tasks.add_task(
        run_pipeline,
        job_id=job_id,
        img_bytes=img_bytes,
        comfy_url=comfy_url_value,
        prompt=prompt,
        negative_prompt=negative_prompt,
        duration_seconds=duration_seconds,
        width=width,
        height=height,
        cfg_scale=cfg_scale,
        steps=steps,
    )

    return {"job_id": job_id, "status": "queued"}


@app.get("/status/{job_id}")
def status(job_id: str):
    """Poll job status and progress."""
    job = _get_job_or_404(job_id)
    return _job_payload(job_id, job)


@app.get("/jobs/{job_id}/segments/{segment_index}")
def download_segment(job_id: str, segment_index: int):
    """Download a generated intermediate segment video."""
    job = _get_job_or_404(job_id)
    segments = job.get("segments", [])
    if segment_index < 0 or segment_index >= len(segments):
        raise HTTPException(404, "Segment not found")

    segment_path = Path(segments[segment_index])
    if not segment_path.exists():
        raise HTTPException(404, "Segment file not found")

    return FileResponse(
        segment_path,
        media_type="video/mp4",
        filename=f"avatar_{job_id[:8]}_segment_{segment_index + 1}.mp4",
    )


@app.get("/jobs/{job_id}/artifacts")
def job_artifacts(job_id: str):
    job = _get_job_or_404(job_id)
    segment_urls = [
        {
            "index": index,
            "available": True,
            "url": f"/jobs/{job_id}/segments/{index}",
        }
        for index in range(len(job.get("segments", [])))
    ]

    return {
        "job_id": job_id,
        "segment_urls": segment_urls,
        "download_url": f"/download/{job_id}" if job.get("status") == "done" else None,
        "output_available": bool(job.get("output")),
    }


@app.get("/download/{job_id}")
def download(job_id: str):
    """Download the final stitched video once status == 'done'."""
    job = _get_job_or_404(job_id)
    if job["status"] != "done":
        raise HTTPException(425, f"Not ready — current status: {job['status']}")
    return FileResponse(
        job["output"],
        media_type="video/mp4",
        filename=f"avatar_{job_id[:8]}.mp4",
    )


@app.get("/jobs")
def list_jobs():
    """List all job ids and their statuses."""
    return {jid: {"status": j["status"], "progress": j["progress"]} for jid, j in jobs.items()}


@app.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    """Remove a job and its working files."""
    import shutil

    job = jobs.pop(job_id, None)
    if not job:
        raise HTTPException(404, "Job not found")
    work_dir = Path(f"/tmp/{job_id}")
    if work_dir.exists():
        shutil.rmtree(work_dir)
    return {"deleted": job_id}


@app.get("/health")
def health():
    return {"status": "ok"}
