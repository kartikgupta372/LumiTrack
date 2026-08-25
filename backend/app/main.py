"""FastAPI application serving LumiTrack APIs, telemetry, and the built UI."""

import asyncio
import json
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router, sim_engine


app = FastAPI(
    title="LumiTrack - AI-Based Virtual Camera Tracking System for FSOC Coarse Alignment",
    description="Software-in-the-Loop Testbed for FSOC Coarse PAT Simulation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")


@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    """Stream the authoritative 2D/3D telemetry contract to the UI."""
    await websocket.accept()
    try:
        while True:
            try:
                raw_message = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                action = json.loads(raw_message).get("action")
                if action == "start":
                    sim_engine.start()
                elif action == "pause":
                    sim_engine.pause()
                elif action == "resume":
                    sim_engine.resume()
                elif action == "reset":
                    sim_engine.reset()
                elif action == "stop":
                    sim_engine.stop()
            except asyncio.TimeoutError:
                pass

            if sim_engine.running and not sim_engine.paused:
                frame = sim_engine.step()
                await websocket.send_text(frame.model_dump_json())
                await asyncio.sleep(max(0.0, 1.0 / sim_engine.config.fps))
            else:
                await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        pass
    except (json.JSONDecodeError, RuntimeError, ValueError):
        await websocket.close(code=1011)


# A production build is served by FastAPI so the complete MVP has one URL.
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
