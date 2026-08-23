from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TrajectoryType(str, Enum):
    STATIONARY = "stationary"
    LINEAR = "linear"
    CIRCULAR = "circular"
    SINUSOIDAL = "sinusoidal"
    ERRATIC = "erratic"


class LockState(str, Enum):
    ACQUIRING = "ACQUIRING"
    LOCKED = "LOCKED"
    LOST = "LOST"
    REACQUIRING = "REACQUIRING"


class DetectorType(str, Enum):
    OPENCV = "opencv"
    YOLO = "yolo"


class ControllerType(str, Enum):
    PROPORTIONAL = "proportional"
    PID = "pid"


class TargetConfig(BaseModel):
    trajectory: TrajectoryType = TrajectoryType.CIRCULAR
    initial_x: float = 0.0      # world coordinates (m)
    initial_y: float = 0.0
    speed: float = 6.0          # m/s
    radius: float = 20.0        # m for circular
    frequency: float = 0.2      # Hz for sinusoidal
    intensity: float = 255.0    # brightness (0-255)
    size_radius: float = 8.0    # beacon radius in pixels


class DisturbanceConfig(BaseModel):
    noise: float = Field(0.0, ge=0.0, le=100.0)         # Gaussian noise (0-100%)
    vibration: float = Field(0.0, ge=0.0, le=100.0)     # Camera jitter (0-100%)
    turbulence: float = Field(0.0, ge=0.0, le=100.0)    # Scintillation/refraction (0-100%)
    blur: float = Field(0.0, ge=0.0, le=100.0)          # Motion blur (0-100%)
    occlusion: bool = False                              # Target hidden
    occlusion_duration_s: float = 2.0


class CameraConfig(BaseModel):
    fov_x: float = 60.0         # degrees
    fov_y: float = 45.0         # degrees
    frame_width: int = 640      # px
    frame_height: int = 480     # px
    max_pan_rate: float = 90.0  # deg/s
    max_tilt_rate: float = 90.0 # deg/s


class PIDConfig(BaseModel):
    kp: float = 0.15
    ki: float = 0.01
    kd: float = 0.02


class ScenarioConfig(BaseModel):
    id: str = "default_scenario"
    name: str = "Nominal Trajectory"
    duration_s: float = 60.0
    fps: float = 30.0
    target: TargetConfig = Field(default_factory=TargetConfig)
    camera: CameraConfig = Field(default_factory=CameraConfig)
    disturbances: DisturbanceConfig = Field(default_factory=DisturbanceConfig)
    pid: PIDConfig = Field(default_factory=PIDConfig)
    detector_type: DetectorType = DetectorType.OPENCV
    controller_type: ControllerType = ControllerType.PID
    lock_tolerance_px: float = 20.0


class BeaconWorldState(BaseModel):
    x: float
    y: float
    vx: float
    vy: float
    visible: bool = True


class CameraState(BaseModel):
    pan: float = 0.0   # deg
    tilt: float = 0.0  # deg
    pan_rate: float = 0.0
    tilt_rate: float = 0.0


class DetectionResult(BaseModel):
    valid: bool
    x: Optional[float] = None
    y: Optional[float] = None
    confidence: float = 0.0
    bbox: Optional[List[int]] = None # [x, y, w, h]


class TrackState(BaseModel):
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    predicted: bool = False
    lock_state: LockState = LockState.ACQUIRING


class TelemetryFrame(BaseModel):
    timestamp: float
    frame_index: int
    beacon_world: BeaconWorldState
    camera: CameraState
    detection: DetectionResult
    track: TrackState
    error_x: float
    error_y: float
    total_error_px: float
    total_error_deg: float
    fps: float
    lock_state: LockState
    acquisition_time_s: Optional[float] = None
    image_base64: Optional[str] = None  # Processed JPEG frame encoded in base64


class PerformanceMetrics(BaseModel):
    simulation_duration_s: float = 0.0
    processed_frames: int = 0
    effective_fps: float = 0.0
    acquisition_time_s: Optional[float] = None
    average_error_px: float = 0.0
    max_error_px: float = 0.0
    average_error_deg: float = 0.0
    lock_retention_rate: float = 0.0 # percentage (0-100%)
    lost_target_events: int = 0
    successful_recoveries: int = 0
    avg_processing_latency_ms: float = 0.0
