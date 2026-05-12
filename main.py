"""
Avatar Video Pipeline — FastAPI entry point
POST /generate  → kicks off background generation job
GET  /status/{job_id}   → poll job progress
GET  /download/{job_id} → download final mp4
"""

from fastapi import FastAPI, BackgroundTasks, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid

from orchestrator import run_pipeline
from models import jobs

app = FastAPI(title="Avatar Video Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/generate")
async def generate(
    image: UploadFile,
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

    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "total_segments": 0,
        "segments": [],
        "output": None,
        "error": None,
    }

    background_tasks.add_task(
        run_pipeline,
        job_id=job_id,
        img_bytes=img_bytes,
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
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/download/{job_id}")
def download(job_id: str):
    """Download the final stitched video once status == 'done'."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
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
    from pathlib import Path

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
