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
