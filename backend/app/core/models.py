<<<<<<< HEAD
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
=======
"""
LumiTrack Core Data Models
Shared dataclasses used across simulation, control, and vision modules.
These are lightweight Python dataclasses (not Pydantic) for intra-process use.
The Pydantic schemas in schemas.py are used only for API serialisation.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BeaconState:
    """3D world-space state of the optical beacon."""
    x: float = 0.0       # metres (horizontal)
    y: float = 0.0       # metres (vertical)
    z: float = 100.0     # metres range / depth
    vx: float = 0.0
    vy: float = 0.0
    visible: bool = True


@dataclass
class CameraState:
    """Gimbal camera orientation state."""
    pan: float = 0.0        # degrees (azimuth)
    tilt: float = 0.0       # degrees (elevation)
    pan_rate: float = 0.0   # deg/s
    tilt_rate: float = 0.0  # deg/s


@dataclass
class DetectionResult:
    """Output of the vision detector for one frame."""
    valid: bool = False
    px: float = 0.0          # pixel column (u)
    py: float = 0.0          # pixel row (v)
    confidence: float = 0.0
    bbox: Optional[tuple] = None   # (x, y, w, h) bounding box


@dataclass
class GimbalCommand:
    """Angular velocity commands from the controller to the gimbal."""
    pan_vel: float = 0.0    # deg/s
    tilt_vel: float = 0.0   # deg/s


@dataclass
class TrackState:
    """Output state of the Kalman tracker."""
    px: float = 0.0
    py: float = 0.0
    vx: float = 0.0
    vy: float = 0.0
    initialised: bool = False
    predicted: bool = False
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
