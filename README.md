# Seamless Avatar Pipeline

A full-stack project that generates and renders seamless avatars using a Python backend and a React frontend. This README explains the project, provides setup instructions for both backend and frontend, and includes running, Docker, and Colab notes. Add your demo video link where indicated.

## Video Demo

Demo (YouTube): VIDEO_DEMO_YT_LINK_HERE

## Project Overview

- **Backend:** Python FastAPI service that orchestrates model clients and video generation workflows. See the `backend/` folder.
- **Frontend:** React + Vite app providing a web UI to generate avatars. See the `frontend/` folder.

## Key Features

- Avatar generation workflows and orchestration
- Video utilities and rendering helpers
- Simple React UI for sending requests to the backend

## Repository Structure

Top-level layout:

```
.
├─ backend/
│  ├─ main.py
│  ├─ orchestrator.py
│  ├─ comfy_client.py
│  ├─ config.py
│  ├─ models.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  ├─ package.json
│  └─ vite.config.ts
└─ render.yaml
```

## Prerequisites

- Git
- Python 3.10+ (recommended) and `pip`
- Node.js 18+ and `npm` or `pnpm`
- (Optional) Docker

## Backend — Setup & Run (local)

1. Open a terminal and go to the `backend/` folder:

```bash
cd backend
```

2. Create and activate a Python virtual environment (Windows example):

```bash
python -m venv .venv
.venv\Scripts\activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Environment variables

Create a `.env` file in `backend/` (or set env vars in your environment). The project reads configuration from `backend/config.py` — adjust as needed. Example variables (replace values):

```
# Example .env
API_PORT=8000
API_HOST=0.0.0.0
COMFY_API_URL=http://localhost:8188
MODEL_CHECKPOINT=/path/to/checkpoint
# Any other provider keys your workflows require
```

5. Run the backend server (development):

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` by default.

See `backend/main.py` and `backend/orchestrator.py` for available endpoints and workflow flow.

## Frontend — Setup & Run (local)

1. Open a terminal and go to the `frontend/` folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
# or `pnpm install` if you prefer pnpm
```

3. Configure the frontend API base URL if needed. By default the frontend expects the backend on the same host/port or uses a Vite env variable such as `VITE_API_BASE_URL`. Create a `.env` in `frontend/` if you need to override:

```
VITE_API_BASE_URL=http://localhost:8000
```

4. Start the development server:

```bash
npm run dev
```

Open the UI at the address printed by Vite (commonly `http://localhost:5173`).

5. Build for production:

```bash
npm run build
```

## Running End-to-End

1. Start the backend (`uvicorn` as above).
2. Start the frontend (`npm run dev`).
3. Use the web UI to submit avatar generation requests or call backend endpoints directly with curl or Postman.

## Docker (optional)

There is a `Dockerfile` under `backend/`. Example workflow to build and run the backend as a container:

```bash
cd backend
docker build -t seamless-avatar-backend .
docker run -p 8000:8000 --env-file .env seamless-avatar-backend
```

Adjust memory and volumes for model checkpoints if needed.

## Colab

The repository contains `backend/colab_setup.py` for convenience when running in Google Colab. That script automates environment setup and dependencies for GPU-backed experimentation. Follow the notebook or open `backend/colab_setup.py` for details.

## Troubleshooting

- If the frontend cannot reach the backend: confirm `VITE_API_BASE_URL` and `API_PORT` match and that CORS is configured in `backend/main.py`.
- If models fail to load: verify `MODEL_CHECKPOINT` paths and that required model files are accessible.

## Contributing

Contributions are welcome. Please open issues or PRs with clear descriptions. Add tests for substantial changes and update this README when adding new features or workflows.

## License

Specify your license here.

## Contact

For questions or help, open an issue in this repository.
