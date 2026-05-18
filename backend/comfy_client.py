"""
comfy_client.py — ComfyUI API client for a REMOTE tunnel (Pinggy / ngrok).

All requests go to cfg.comfy_url, which is the public HTTPS URL that
Pinggy exposes for your Colab ComfyUI instance.

Pinggy notes:
  - Free tier tunnels reset every ~60 min; update cfg.comfy_url via PATCH /config
  - The tunnel adds ~100-300 ms latency per request — timeouts are generous
  - Large file downloads (output video) use streaming to avoid memory blow-up
"""

import logging
import time
from pathlib import Path
from typing import Optional

import requests

from config import cfg

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _base(comfy_url: Optional[str] = None) -> str:
    url = (comfy_url or cfg.comfy_url).rstrip("/")
    if "REPLACE_ME" in url:
        raise RuntimeError(
            "COMFY_URL is not configured. "
            "Set the COMFY_URL environment variable, call PATCH /config, "
            "or provide comfy_url on /generate before generating."
        )
    return url


def _session() -> requests.Session:
    s = requests.Session()
    # Pinggy free tier: no auth headers needed.
    # Pinggy Pro with password: uncomment below
    # import base64, os
    # token = base64.b64encode(b"user:pass").decode()
    # s.headers["Authorization"] = f"Basic {token}"
    return s


# ── Connection check ──────────────────────────────────────────────────────────

def check_connection(comfy_url: Optional[str] = None) -> dict:
    """Ping ComfyUI. Returns {"reachable": bool, ...}."""
    try:
        resp = _session().get(f"{_base(comfy_url)}/system_stats", timeout=8)
        resp.raise_for_status()
        return {"reachable": True, "comfy_url": _base(comfy_url), "system": resp.json()}
    except RuntimeError as e:
        return {"reachable": False, "error": str(e)}
    except Exception as e:
        return {"reachable": False, "comfy_url": (comfy_url or cfg.comfy_url), "error": str(e)}


# ── Image upload ─────────────────────────────────────────────────────────────

def upload_image(
    image_path: Path,
    filename: str = "start_frame.jpg",
    comfy_url: Optional[str] = None,
) -> Optional[str]:
    """
    Upload a local image to ComfyUI /upload/image over the Pinggy tunnel.
    Returns the ComfyUI-assigned filename, or None on failure.
    """
    url = f"{_base(comfy_url)}/upload/image"
    try:
        with open(image_path, "rb") as f:
            resp = _session().post(
                url,
                files={"image": (filename, f, "image/jpeg")},
                data={"overwrite": "true", "type": "input"},
                timeout=cfg.upload_timeout,
            )
        resp.raise_for_status()
        result = resp.json()
        assigned = result.get("name") or result.get("filename")
        logger.info(f"Uploaded {image_path.name} -> ComfyUI: {assigned}")
        return assigned
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Cannot reach ComfyUI at {_base(comfy_url)} — is the Pinggy tunnel active? {e}")
        return None
    except Exception as e:
        logger.error(f"upload_image failed: {e}")
        return None


# ── Workflow submission ───────────────────────────────────────────────────────

def submit_workflow(workflow: dict, comfy_url: Optional[str] = None) -> Optional[str]:
    """
    POST the patched workflow to ComfyUI /prompt.
    Returns the prompt_id string, or None on failure.
    """
    url = f"{_base(comfy_url)}/prompt"
    try:
        api_prompt = _build_api_prompt(workflow)
        resp = _session().post(
            url,
            json={"prompt": api_prompt},
            timeout=cfg.submit_timeout,
        )
        if not resp.ok:
            logger.error(
                "ComfyUI /prompt failed (%s): %s",
                resp.status_code,
                resp.text,
            )
            return None
        data = resp.json()
        prompt_id = data.get("prompt_id")
        if not prompt_id:
            logger.error(f"No prompt_id in response: {data}")
            return None
        logger.info(f"Submitted workflow -> prompt_id: {prompt_id}")
        return prompt_id
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Cannot reach ComfyUI at {_base(comfy_url)} — tunnel down? {e}")
        return None
    except Exception as e:
        logger.error(f"submit_workflow failed: {e}")
        return None


# ── Polling ───────────────────────────────────────────────────────────────────

def poll_until_done(prompt_id: str, comfy_url: Optional[str] = None) -> bool:
    """
    Poll /history/{prompt_id} until done, error, or timeout.
    Returns True on success.
    """
    url = f"{_base(comfy_url)}/history/{prompt_id}"
    start = time.time()
    last_status = None

    while time.time() - start < cfg.poll_timeout:
        try:
            resp = _session().get(url, timeout=cfg.poll_req_timeout)
            resp.raise_for_status()
            data = resp.json()

            if prompt_id in data:
                job = data[prompt_id]
                status = job.get("status", {})
                status_str = status.get("status_str")

                if status_str and status_str != last_status:
                    logger.info("ComfyUI status for %s: %s", prompt_id, status_str)
                    last_status = status_str

                if status_str == "error":
                    logger.error(f"ComfyUI error: {status.get('messages')}")
                    return False

                if status_str in ("success", "completed", "done"):
                    logger.info(f"Segment done (status={status_str}): {prompt_id}")
                    return True

                for node_out in job.get("outputs", {}).values():
                    if node_out.get("videos") or node_out.get("gifs"):
                        logger.info(f"Segment done: {prompt_id}")
                        return True

        except requests.exceptions.Timeout:
            logger.warning("Poll request timed out — retrying...")
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Poll connection error (tunnel flap?): {e}")
        except Exception as e:
            logger.warning(f"Poll error: {e}")

        time.sleep(cfg.poll_interval)

    logger.error(f"Timed out after {cfg.poll_timeout}s for {prompt_id}")
    return False


# ── Output download ───────────────────────────────────────────────────────────

def get_output_video_path(
    prompt_id: str,
    work_dir: Path,
    segment_index: int,
    comfy_url: Optional[str] = None,
) -> Optional[str]:
    """
    Download the generated video from ComfyUI /view to a local file.
    Returns the local path string, or None on failure.
    """
    # Fetch history to find filename
    try:
        resp = _session().get(
            f"{_base(comfy_url)}/history/{prompt_id}",
            timeout=cfg.poll_req_timeout,
        )
        resp.raise_for_status()
        outputs = resp.json()[prompt_id]["outputs"]
    except Exception as e:
        logger.error(f"History fetch failed for {prompt_id}: {e}")
        return None

    for node_out in outputs.values():
        # Prefer video/gif outputs; fall back to files/images with video extensions
        for key in ("videos", "gifs", "files", "images"):
            items = node_out.get(key) or []
            for video_info in items:
                filename = video_info.get("filename") or video_info.get("name")
                if not filename:
                    continue
                if key in ("files", "images"):
                    lower = filename.lower()
                    if not lower.endswith((".mp4", ".webm", ".mov", ".gif")):
                        continue

                subfolder = video_info.get("subfolder", "")
                ftype = video_info.get("type", "output")

                local_path = work_dir / f"segment_{segment_index:03d}.mp4"
                try:
                    with _session().get(
                        f"{_base(comfy_url)}/view",
                        params={"filename": filename, "subfolder": subfolder, "type": ftype},
                        stream=True,
                        timeout=cfg.download_timeout,
                    ) as dl:
                        dl.raise_for_status()
                        with open(local_path, "wb") as out_f:
                            for chunk in dl.iter_content(chunk_size=131072):
                                out_f.write(chunk)

                    size_mb = local_path.stat().st_size / (1024 * 1024)
                    logger.info(f"Downloaded segment {segment_index} ({size_mb:.1f} MB) -> {local_path}")
                    return str(local_path)

                except Exception as e:
                    logger.error(f"Download failed for segment {segment_index}: {e}")
                    return None

    logger.error(f"No video found in outputs for {prompt_id}. Output keys: {[list(o.keys()) for o in outputs.values()]}")
    return None


# ── Node-graph -> API prompt conversion ──────────────────────────────────────

_WIDGET_KEYS = {
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
    "VAEDecode":                [],
}


def _build_api_prompt(workflow: dict) -> dict:
    """Convert ComfyUI UI JSON (nodes + links array) to /prompt API format."""
    link_map = {
        link[0]: (link[1], link[2])
        for link in workflow.get("links", [])
    }

    api_prompt = {}
    for node in workflow["nodes"]:
        class_type = node["type"]
        if class_type in ("MarkdownNote", "Note"):
            continue

        inputs = {}

        for inp in node.get("inputs", []):
            lid = inp.get("link")
            if lid is not None and lid in link_map:
                src_id, src_slot = link_map[lid]
                inputs[inp["name"]] = [str(src_id), src_slot]

        for key, val in zip(_WIDGET_KEYS.get(class_type, []), node.get("widgets_values", [])):
            inputs[key] = val

        api_prompt[str(node["id"])] = {"class_type": class_type, "inputs": inputs}

    return api_prompt