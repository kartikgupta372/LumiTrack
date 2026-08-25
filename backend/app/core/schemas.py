"""Validated API and telemetry contracts for the LumiTrack prototype."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TrajectoryType(str, Enum):
    STATIONARY = "stationary"
    LINEAR = "linear"
    CIRCULAR = "circular"
    SINUSOIDAL = "sinusoidal"
    ERRATIC = "erratic"
    FIGURE_EIGHT = "figure_eight"


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
    initial_x: float = 0.0
    initial_y: float = 0.0
    range_m: float = Field(100.0, gt=0.0)
    speed: float = Field(6.0, ge=0.0)
    radius: float = Field(20.0, ge=0.0)
    frequency: float = Field(0.2, ge=0.0)
    intensity: float = Field(255.0, ge=0.0, le=255.0)
    size_radius: float = Field(8.0, ge=1.0)


class DisturbanceConfig(BaseModel):
    noise: float = Field(0.0, ge=0.0, le=100.0)
    vibration: float = Field(0.0, ge=0.0, le=100.0)
    turbulence: float = Field(0.0, ge=0.0, le=100.0)
    blur: float = Field(0.0, ge=0.0, le=100.0)
    occlusion: bool = False
    occlusion_start_s: float = Field(2.0, ge=0.0)
    occlusion_duration_s: float = Field(2.0, ge=0.0)
    occlusion_period_s: float = Field(6.0, ge=0.0)


class CameraConfig(BaseModel):
    fov_x: float = Field(60.0, gt=0.0, lt=360.0)
    fov_y: float = Field(45.0, gt=0.0, lt=180.0)
    frame_width: int = Field(640, ge=2)
    frame_height: int = Field(480, ge=2)
    max_pan_rate: float = Field(90.0, gt=0.0)
    max_tilt_rate: float = Field(90.0, gt=0.0)
    initial_pan: float = 0.0
    initial_tilt: float = 0.0


class PIDConfig(BaseModel):
    # Re-scaled for degree-domain error as required by the audit.
    kp: float = Field(3.5, ge=0.0)
    ki: float = Field(0.2, ge=0.0)
    kd: float = Field(0.15, ge=0.0)


class ScenarioConfig(BaseModel):
    id: str = "default_scenario"
    name: str = "Nominal Trajectory"
    duration_s: float = Field(60.0, gt=0.0)
    fps: float = Field(30.0, gt=0.0, le=120.0)
    seed: int = Field(169, ge=0)
    target: TargetConfig = Field(default_factory=TargetConfig)
    camera: CameraConfig = Field(default_factory=CameraConfig)
    disturbances: DisturbanceConfig = Field(default_factory=DisturbanceConfig)
    pid: PIDConfig = Field(default_factory=PIDConfig)
    detector_type: DetectorType = DetectorType.OPENCV
    controller_type: ControllerType = ControllerType.PID
    lock_tolerance_px: float = Field(20.0, gt=0.0)


class BeaconWorldState(BaseModel):
    x: float
    y: float
    z: float = 100.0
    vx: float
    vy: float
    visible: bool = True
    in_fov: bool = True
    occluded: bool = False


class CameraState(BaseModel):
    pan: float = 0.0
    tilt: float = 0.0
    pan_rate: float = 0.0
    tilt_rate: float = 0.0


class DetectionResult(BaseModel):
    valid: bool
    associated: bool = False
    x: Optional[float] = None
    y: Optional[float] = None
    confidence: float = 0.0
    bbox: Optional[list[int]] = None


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
    processing_latency_ms: float
    lock_state: LockState
    acquisition_time_s: Optional[float] = None
    image_base64: Optional[str] = None


class PerformanceMetrics(BaseModel):
    simulation_duration_s: float = 0.0
    processed_frames: int = 0
    effective_fps: float = 0.0
    acquisition_time_s: Optional[float] = None
    average_error_px: float = 0.0
    max_error_px: float = 0.0
    average_error_deg: float = 0.0
    lock_retention_rate: float = 0.0
    lost_target_events: int = 0
    successful_recoveries: int = 0
    avg_processing_latency_ms: float = 0.0
