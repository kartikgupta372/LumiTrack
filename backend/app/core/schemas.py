from pydantic import BaseModel
from ..core.models import (
    CameraState,
    PerformanceState,
    Point2D,
    TrackingState,
)

class SimulationConfig(BaseModel):
    target_fps: float = 30.0
    noise: float = 0.0
    vibration: float = 0.0


class SimulationResponse(BaseModel):
    message: str
    running: bool

class SimulationStateUpdate(BaseModel):
    beacon: Point2D | None = None
    camera: CameraState | None = None
    tracking: TrackingState | None = None
    performance: PerformanceState | None = None