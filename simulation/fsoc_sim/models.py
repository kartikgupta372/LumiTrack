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
    range_m: float = 100.0
    azimuth_rate_rad_s: float = 0.0
    elevation_rate_rad_s: float = 0.0


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
    """Detection/tracking input.

    It deliberately contains the rendered image and legitimate camera metadata,
    but no beacon ground truth or projected target coordinate.  A perception
    system can consume ``image_bgr`` directly without decoding JPEG.
    """

    frame_id: int
    timestamp_seconds: float
    image_bgr: NDArray[np.uint8]
    camera_pan_rad: float
    camera_tilt_rad: float
    horizontal_fov_rad: float
    vertical_fov_rad: float
    camera_pan_rate_rad_s: float = 0.0
    camera_tilt_rate_rad_s: float = 0.0


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
    in_fov: bool = False
    occluded: bool = False
    world_x_m: float = 0.0
    world_y_m: float = 0.0
    world_z_m: float = 100.0
    velocity_x_m_s: float = 0.0
    velocity_y_m_s: float = 0.0


@dataclass(frozen=True, slots=True)
class SimulationStep:
    frame: FramePacket
    truth: GroundTruth
