from fastapi import FastAPI

from .api.routes import router as simulation_router
from .api.websocket import router as websocket_router

app = FastAPI(title="LumiTrack Backend")


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(simulation_router)
app.include_router(websocket_router)
