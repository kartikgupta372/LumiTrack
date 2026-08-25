# LumiTrack

LumiTrack is a software-in-the-loop MVP for coarse pointing, acquisition, and tracking of a Free-Space Optical Communication beacon. The unified application exposes a live 2D virtual camera feed and an interactive 3D alignment scene driven by the same backend telemetry stream.

## Unified MVP architecture

- `frontend/` is the single React application. Use the header toggle to switch between the 2D camera feed and 3D scene.
- `backend/` is the FastAPI control plane. It runs the beacon, environment, detector, tracker, PID controller, gimbal, metrics, reports, REST API, and WebSocket stream.
- `/api/*` carries configuration, lifecycle controls, metrics, serial/HITL controls, and reports.
- `/ws/simulation` streams one authoritative telemetry frame used by both frontend simulations.
- `frontend2/` and `frontend3/` remain as historical prototypes; new MVP work belongs in `frontend/`.

If the backend is temporarily unavailable, the frontend keeps the same telemetry contract and runs an offline demo. When the backend reconnects, its camera frames and closed-loop state automatically take over.

## Quick start for development

Create the project environment and install dependencies once:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm.cmd --prefix frontend install
```

Run the backend in terminal 1:

```powershell
npm.cmd run dev:backend
```

Run the frontend in terminal 2:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`. Vite proxies REST and WebSocket traffic to the backend at port 8000.

## Single-URL MVP

Build the frontend and start FastAPI:

```powershell
npm.cmd run build
npm.cmd start
```

Open `http://localhost:8000`. FastAPI serves the compiled frontend, APIs, telemetry WebSocket, and API documentation (`/docs`) from one process and origin.

## Verification

```powershell
npm.cmd run build
.\.venv\Scripts\python.exe -m pytest -q
```

The primary frontend configuration is in `frontend/vite.config.js`. Override remote deployments with `VITE_API_URL` and `VITE_WS_URL` as documented in `.env.example`.
