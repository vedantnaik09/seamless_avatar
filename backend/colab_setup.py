# ============================================================
# CELL 1 — System deps + ComfyUI
# ============================================================
# Run this cell once per Colab session.

# !apt-get update -qq
# !apt-get install -y -qq git wget aria2 ffmpeg

# %cd /content
# !git clone https://github.com/comfyanonymous/ComfyUI.git

# !pip install -U pip setuptools wheel -q
# !pip install torch torchvision torchaudio \
#     --index-url https://download.pytorch.org/whl/cu121 -q
# !pip install -r /content/ComfyUI/requirements.txt -q
# !pip install xformers accelerate transformers sentencepiece \
#     safetensors einops diffusers imageio imageio-ffmpeg -q

# # Custom nodes
# %cd /content/ComfyUI/custom_nodes
# !git clone https://github.com/ltdrdata/ComfyUI-Manager.git
# !git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
# !pip install -r \
#     /content/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper/requirements.txt -q || true

# ============================================================
# CELL 2 — Model downloads (run once; ~20 GB total)
# ============================================================
# !mkdir -p /content/ComfyUI/models/diffusion_models
# !mkdir -p /content/ComfyUI/models/text_encoders
# !mkdir -p /content/ComfyUI/models/vae

# %cd /content/ComfyUI/models/diffusion_models
# !wget -q --show-progress -O wan2.2_ti2v_5B_fp16.safetensors \
#     "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors"

# %cd /content/ComfyUI/models/text_encoders
# !wget -q --show-progress -O umt5_xxl_fp8_e4m3fn_scaled.safetensors \
#     "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors"

# %cd /content/ComfyUI/models/vae
# !wget -q --show-progress -O wan2.2_vae.safetensors \
#     "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan2.2_vae.safetensors"

# ============================================================
# CELL 3 — Start ComfyUI + FastAPI pipeline + Pinggy tunnel
# ============================================================

import subprocess
import time
import sys

# Install pipeline deps
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "fastapi", "uvicorn[standard]", "python-multipart", "requests"])

# Copy pipeline code to /content (adjust path if you uploaded the zip)
# If running from the zip:
# !unzip -o /content/avatar_pipeline.zip -d /content/
# %cd /content/avatar_pipeline

# Start ComfyUI (lowvram for T4)
comfy_proc = subprocess.Popen(
    [
        sys.executable, "main.py",
        "--listen", "0.0.0.0",
        "--port", "8188",
        "--dont-print-server",
        "--lowvram",
        "--fp8_e4m3fn",
    ],
    cwd="/content/ComfyUI",
)
print("ComfyUI starting …")
time.sleep(35)
print("ComfyUI should be ready")

# Start FastAPI pipeline server
api_proc = subprocess.Popen(
    [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--log-level", "info",
    ],
    cwd="/content/avatar_pipeline",  # <-- adjust if needed
)
print("FastAPI starting …")
time.sleep(5)
print("FastAPI ready on port 8000")

# ============================================================
# CELL 4 — Expose via Pinggy tunnel
# ============================================================

# Option A: Pinggy (free, no sign-up)
# import pinggy
# tunnel = pinggy.start_tunnel(forwardto="localhost:8000")
# print("Public API URL:", tunnel.urls[0])

# Option B: ngrok (requires auth token)
# !pip install pyngrok -q
# from pyngrok import ngrok
# ngrok.set_auth_token("YOUR_TOKEN_HERE")
# public_url = ngrok.connect(8000)
# print("Public API URL:", public_url)

# Option C: localtunnel (no account needed)
# !npm install -g localtunnel -q
# lt_proc = subprocess.Popen(["lt", "--port", "8000"], stdout=subprocess.PIPE)
# time.sleep(3)
# print(lt_proc.stdout.readline().decode())

# ============================================================
# CELL 5 — Test the pipeline (Python client example)
# ============================================================

# import requests
#
# API = "http://localhost:8000"   # or swap for your tunnel URL
#
# with open("/path/to/avatar.jpg", "rb") as img_f:
#     resp = requests.post(f"{API}/generate", files={"image": img_f}, data={
#         "prompt": (
#             "A well-lit professional man stands centered against a clean modern "
#             "background, speaking directly to the camera with natural facial "
#             "expressions and subtle hand gestures."
#         ),
#         "duration_seconds": 30,
#         "width": 640,
#         "height": 480,
#         "cfg_scale": 5,
#         "steps": 20,
#     })
#
# job_id = resp.json()["job_id"]
# print("Job started:", job_id)
#
# # Poll until done
# import time
# while True:
#     s = requests.get(f"{API}/status/{job_id}").json()
#     print(f"  {s['status']}  segment {s['progress']}/{s['total_segments']}")
#     if s["status"] in ("done", "error"):
#         break
#     time.sleep(10)
#
# # Download
# if s["status"] == "done":
#     with open("final_avatar.mp4", "wb") as f:
#         f.write(requests.get(f"{API}/download/{job_id}").content)
#     print("Saved final_avatar.mp4")

# ============================================================
# KEEP-ALIVE LOOP (paste at the bottom of your last cell)
# ============================================================
# while True:
#     time.sleep(60)
