<<<<<<< HEAD
from fastapi import FastAPI

from .api.routes import router as simulation_router
from .api.websocket import router as websocket_router

app = FastAPI(title="LumiTrack Backend")


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(simulation_router)
app.include_router(websocket_router)
=======
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router, sim_engine

app = FastAPI(
    title="LumiTrack - AI-Based Virtual Camera Tracking System for FSOC Coarse Alignment",
    description="Software-in-the-Loop Testbed for Free Space Optical Communication (FSOC) Coarse PAT Simulation",
    version="1.0.0"
)

# CORS middleware for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    """
    WebSocket endpoint streaming live telemetry frames to frontend dashboards at 30 FPS.
    """
    await websocket.accept()
    print("Client connected to /ws/simulation WebSocket")

    try:
        while True:
            # Check for incoming control commands from frontend client
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                cmd = json.loads(data)
                if cmd.get("action") == "start":
                    sim_engine.start()
                elif cmd.get("action") == "pause":
                    sim_engine.pause()
                elif cmd.get("action") == "resume":
                    sim_engine.resume()
                elif cmd.get("action") == "reset":
                    sim_engine.reset()
                elif cmd.get("action") == "stop":
                    sim_engine.stop()
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                pass

            # Step simulation if running and not paused
            if sim_engine.running and not sim_engine.paused:
                frame_data = sim_engine.step()
                await websocket.send_text(frame_data.model_dump_json())
            else:
                # Idle state heartbeat
                await asyncio.sleep(0.1)

            # Control loop frame rate delay (~30 FPS)
            await asyncio.sleep(1.0 / sim_engine.config.fps)

    except WebSocketDisconnect:
        print("Client disconnected from /ws/simulation WebSocket")
    except Exception as e:
        print(f"WebSocket error: {e}")
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
