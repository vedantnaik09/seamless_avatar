# Avatar Video Pipeline

Chained Wan 2.2 TI2V video generation with temporal consistency.

## How it works

1. A FastAPI server receives an avatar image + prompt + desired duration
2. The orchestrator computes how many ~4-second segments are needed
3. For each segment:
   - The ComfyUI workflow JSON is patched (start image, seed, prompt, dims)
   - The workflow is submitted to ComfyUI via its REST API
   - The pipeline polls until the segment is ready
   - The last frame is extracted and becomes the next segment's start image
4. All segments are stitched together with FFmpeg xfade crossfades

## Project structure

```
avatar_pipeline/
├── main.py            # FastAPI app (endpoints)
├── models.py          # Shared in-memory job store
├── orchestrator.py    # Pipeline loop + workflow patching
├── comfy_client.py    # ComfyUI API: upload, submit, poll, retrieve
├── video_utils.py     # FFmpeg: last-frame extract, trim, stitch
├── requirements.txt
├── colab_setup.py     # Annotated Colab cell-by-cell setup script
└── workflows/
    └── video_wan2_2_5B_ti2v.json   # Your ComfyUI workflow
```

## Quick start (Colab / local)

### 1. Install dependencies

```bash
pip install -r requirements.txt
# FFmpeg must be installed: apt-get install ffmpeg
```

### 2. Start ComfyUI (T4 Colab flags)

```bash
cd /content/ComfyUI
python main.py \
  --listen 0.0.0.0 \
  --port 8188 \
  --lowvram \
  --fp8_e4m3fn
```

### 3. Start the pipeline API

```bash
cd avatar_pipeline
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Generate a video

```bash
curl -X POST http://localhost:8000/generate \
  -F "image=@avatar.jpg" \
  -F "prompt=A well-lit professional man speaks to the camera..." \
  -F "duration_seconds=30" \
  -F "width=640" \
  -F "height=480" \
  -F "cfg_scale=5" \
  -F "steps=20"
# → {"job_id": "abc123..."}
```

```bash
# Poll status
curl http://localhost:8000/status/abc123

# Download when done
curl http://localhost:8000/download/abc123 -o final.mp4
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Submit a generation job |
| GET | `/status/{job_id}` | Poll progress |
| GET | `/download/{job_id}` | Download final mp4 |
| GET | `/jobs` | List all jobs |
| DELETE | `/jobs/{job_id}` | Delete job + files |
| GET | `/health` | Health check |

### POST /generate — form fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `image` | file | required | Avatar image (JPEG/PNG/WebP) |
| `prompt` | str | required | Positive text prompt |
| `negative_prompt` | str | (built-in) | Negative text prompt |
| `duration_seconds` | int | 30 | Target video length |
| `width` | int | 640 | Output width |
| `height` | int | 480 | Output height |
| `cfg_scale` | float | 5.0 | Classifier-free guidance scale |
| `steps` | int | 20 | Diffusion steps |

## Temporal consistency tips

- **Keep the prompt identical** across all segments — any variation causes drift
- **Seed = BASE + i** keeps the model in a consistent region per job
- **TRIM_FRAMES = 2** (in orchestrator.py) drops the first 2 frames of segments
  1..n to remove the "snap" from re-conditioning
- **JPEG quality 2** for frame handoff — perceptually lossless, no compounding
  artifacts
- Lower `cfg_scale` (3–4) → smoother temporal motion, less crisp
- Keep `width × height × frames` within T4 VRAM budget (~16 GB)

## Configuration

Key constants in `orchestrator.py`:

```python
CLIP_FRAMES = 61        # frames per segment
OUTPUT_FPS  = 16        # Wan 2.2 output FPS
TRIM_FRAMES = 2         # frames to drop from segment start
BASE_SEED   = 192530010836888
```

Key constants in `comfy_client.py`:

```python
COMFY_URL      = "http://localhost:8188"
POLL_INTERVAL  = 3    # seconds
POLL_TIMEOUT   = 600  # 10 min per segment
```

## Model files required

Download to `ComfyUI/models/` before running:

| File | Directory | Source |
|------|-----------|--------|
| `wan2.2_ti2v_5B_fp16.safetensors` | `diffusion_models/` | Comfy-Org HF repo |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | `text_encoders/` | Comfy-Org HF repo |
| `wan2.2_vae.safetensors` | `vae/` | Comfy-Org HF repo |

See `colab_setup.py` for the full download commands.
