"""
config.py — all runtime configuration for the avatar pipeline.

Set COMFY_URL to your Pinggy tunnel URL before starting the server:

    # Option A: environment variable (recommended)
    export COMFY_URL="https://xxxxxxxx.a.pinggy.online"
    uvicorn main:app --host 0.0.0.0 --port 8000

    # Option B: .env file (pip install python-dotenv)
    echo 'COMFY_URL=https://xxxxxxxx.a.pinggy.online' > .env

    # Option C: update it at runtime via the API
    PATCH /config   {"comfy_url": "https://..."}
"""

import os
from dataclasses import dataclass, field


@dataclass
class Config:
    # ── ComfyUI remote endpoint ──────────────────────────────────────────────
    # Point this at your Pinggy tunnel URL.  Updated live via PATCH /config.
    comfy_url: str = field(
        default_factory=lambda: os.getenv("COMFY_URL", "http://xmhkq-34-53-126-20.run.pinggy-free.link/")
    )

    # ── Generation defaults ──────────────────────────────────────────────────
    clip_frames: int = 61           # frames per segment (Wan22ImageToVideoLatent length)
    output_fps: int = 16            # Wan 2.2 native output FPS
    trim_frames: int = 2            # frames to drop from segment 1..n start

    # ── Sampler defaults (overridable per-request) ───────────────────────────
    default_width: int = 640
    default_height: int = 480
    default_cfg_scale: float = 5.0
    default_steps: int = 20
    base_seed: int = 192530010836888

    # ── Polling ──────────────────────────────────────────────────────────────
    poll_interval: float = 4.0      # seconds between /history polls
    poll_timeout: int = 600         # max seconds to wait per segment

    # ── HTTP timeouts (seconds) ──────────────────────────────────────────────
    # Pinggy tunnels add latency — be generous
    upload_timeout: int = 60
    submit_timeout: int = 30
    poll_req_timeout: int = 15
    download_timeout: int = 180

    # ── FFmpeg ───────────────────────────────────────────────────────────────
    xfade_duration: float = 0.5     # seconds of crossfade at each segment join
    output_crf: int = 18
    output_preset: str = "fast"


# Singleton — import this everywhere
cfg = Config()