"""Shared data contracts at Group 1 boundaries."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True, slots=True)
class BeaconState:
    azimuth_rad: float
    elevation_rad: float
    intensity: int = 255


@dataclass(frozen=True, slots=True)
class CameraState:
    pan_rad: float
    tilt_rad: float


@dataclass(frozen=True, slots=True)
class ControlCommand:
    """Future Group 3 input. Rates use rad/s in camera sign conventions."""

    pan_rate_rad_s: float = 0.0
    tilt_rate_rad_s: float = 0.0


@dataclass(frozen=True, slots=True)
class Projection:
    visible: bool
    x_px: float | None
    y_px: float | None
    relative_azimuth_rad: float
    relative_elevation_rad: float


@dataclass(frozen=True, slots=True)
class FramePacket:
    """Future Group 2 input.

    Deliberately contains the rendered image and camera metadata, but no beacon
    ground truth or projected target coordinate.
    """

    frame_id: int
    timestamp_seconds: float
    image_bgr: NDArray[np.uint8]
    camera_pan_rad: float
    camera_tilt_rad: float
    horizontal_fov_rad: float
    vertical_fov_rad: float


@dataclass(frozen=True, slots=True)
class GroundTruth:
    """Evaluation/debug record kept separate from future detector input."""

    frame_id: int
    timestamp_seconds: float
    beacon_azimuth_rad: float
    beacon_elevation_rad: float
    camera_pan_rad: float
    camera_tilt_rad: float
    visible: bool
    projected_x_px: float | None
    projected_y_px: float | None


@dataclass(frozen=True, slots=True)
class SimulationStep:
    frame: FramePacket
    truth: GroundTruth
