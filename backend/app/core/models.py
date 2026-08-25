"""Shared in-process and legacy compatibility models for LumiTrack."""

from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel, Field


class Point2D(BaseModel):
    x: float = 0.0
    y: float = 0.0


class CameraState(BaseModel):
    position: Point2D = Field(default_factory=Point2D)
    pan: float = 0.0
    tilt: float = 0.0


class TrackingState(BaseModel):
    detected: bool = False
    position: Point2D = Field(default_factory=Point2D)
    error_x: float = 0.0
    error_y: float = 0.0
    locked: bool = False


class PerformanceState(BaseModel):
    fps: float = 0.0
    processing_time: float = 0.0


class SimulationState(BaseModel):
    running: bool = False
    beacon: Point2D = Field(default_factory=Point2D)
    camera: CameraState = Field(default_factory=CameraState)
    tracking: TrackingState = Field(default_factory=TrackingState)
    performance: PerformanceState = Field(default_factory=PerformanceState)


@dataclass
class BeaconState:
    x: float = 0.0
    y: float = 0.0
    z: float = 100.0
    vx: float = 0.0
    vy: float = 0.0
    visible: bool = True


@dataclass
class DetectionResult:
    valid: bool = False
    px: float = 0.0
    py: float = 0.0
    confidence: float = 0.0
    bbox: Optional[tuple] = None


@dataclass
class GimbalCommand:
    pan_vel: float = 0.0
    tilt_vel: float = 0.0


@dataclass
class TrackState:
    px: float = 0.0
    py: float = 0.0
    vx: float = 0.0
    vy: float = 0.0
    initialised: bool = False
    predicted: bool = False
