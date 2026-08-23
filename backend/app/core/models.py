from pydantic import BaseModel


class Point2D(BaseModel):
    x: float = 0.0
    y: float = 0.0


class CameraState(BaseModel):
    position: Point2D = Point2D()
    pan: float = 0.0
    tilt: float = 0.0


class TrackingState(BaseModel):
    detected: bool = False
    position: Point2D = Point2D()
    error_x: float = 0.0
    error_y: float = 0.0
    locked: bool = False


class PerformanceState(BaseModel):
    fps: float = 0.0
    processing_time: float = 0.0


class SimulationState(BaseModel):
    running: bool = False

    beacon: Point2D = Point2D()
    camera: CameraState = CameraState()
    tracking: TrackingState = TrackingState()
    performance: PerformanceState = PerformanceState()