"""Validated configuration for the deterministic simulation core."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import pi


def _require_finite_positive(name: str, value: float) -> None:
    if not (0.0 < value < float("inf")):
        raise ValueError(f"{name} must be finite and greater than zero")


@dataclass(frozen=True, slots=True)
class SimulationConfig:
    """Timing and reproducibility settings."""

    fps: float = 30.0
    seed: int = 169

    def __post_init__(self) -> None:
        _require_finite_positive("fps", self.fps)
        if self.seed < 0:
            raise ValueError("seed must be non-negative")

    @property
    def dt_seconds(self) -> float:
        return 1.0 / self.fps


@dataclass(frozen=True, slots=True)
class CameraConfig:
    """Virtual pan-tilt camera geometry and motion limits.

    Angles and rates use radians internally. Positive pan points right and
    positive tilt points upward.
    """

    width_px: int = 640
    height_px: int = 480
    horizontal_fov_rad: float = pi / 3.0
    vertical_fov_rad: float = pi / 4.0
    min_pan_rad: float = -pi
    max_pan_rad: float = pi
    min_tilt_rad: float = -pi / 2.0
    max_tilt_rad: float = pi / 2.0
    max_pan_rate_rad_s: float = pi / 3.0
    max_tilt_rate_rad_s: float = pi / 4.0
    initial_pan_rad: float = 0.0
    initial_tilt_rad: float = 0.0

    def __post_init__(self) -> None:
        if self.width_px < 2 or self.height_px < 2:
            raise ValueError("camera resolution must be at least 2 x 2 pixels")
        if not (0.0 < self.horizontal_fov_rad < 2.0 * pi):
            raise ValueError("horizontal_fov_rad must be between 0 and 2*pi")
        if not (0.0 < self.vertical_fov_rad < pi):
            raise ValueError("vertical_fov_rad must be between 0 and pi")
        if self.min_pan_rad >= self.max_pan_rad:
            raise ValueError("min_pan_rad must be less than max_pan_rad")
        if self.min_tilt_rad >= self.max_tilt_rad:
            raise ValueError("min_tilt_rad must be less than max_tilt_rad")
        _require_finite_positive("max_pan_rate_rad_s", self.max_pan_rate_rad_s)
        _require_finite_positive("max_tilt_rate_rad_s", self.max_tilt_rate_rad_s)
        if not self.min_pan_rad <= self.initial_pan_rad <= self.max_pan_rad:
            raise ValueError("initial_pan_rad is outside the configured pan limits")
        if not self.min_tilt_rad <= self.initial_tilt_rad <= self.max_tilt_rad:
            raise ValueError("initial_tilt_rad is outside the configured tilt limits")


@dataclass(frozen=True, slots=True)
class BeaconRenderConfig:
    """Clean beacon and diagnostic overlay appearance."""

    radius_px: int = 5
    intensity: int = 255
    background_intensity: int = 8
    crosshair_half_length_px: int = 10
    crosshair_intensity: int = 110

    def __post_init__(self) -> None:
        if self.radius_px < 1:
            raise ValueError("radius_px must be at least 1")
        if self.crosshair_half_length_px < 1:
            raise ValueError("crosshair_half_length_px must be at least 1")
        for name in ("intensity", "background_intensity", "crosshair_intensity"):
            value = getattr(self, name)
            if not 0 <= value <= 255:
                raise ValueError(f"{name} must be between 0 and 255")


@dataclass(frozen=True, slots=True)
class AppConfig:
    """Top-level Group 1 configuration."""

    simulation: SimulationConfig = field(default_factory=SimulationConfig)
    camera: CameraConfig = field(default_factory=CameraConfig)
    render: BeaconRenderConfig = field(default_factory=BeaconRenderConfig)
