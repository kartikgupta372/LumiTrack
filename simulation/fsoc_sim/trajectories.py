"""Deterministic angular beacon trajectories."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from math import cos, pi, sin
from typing import Protocol

import numpy as np

from fsoc_sim.models import BeaconState


class Trajectory(Protocol):
    def sample(self, time_seconds: float) -> BeaconState:
        """Return the beacon state at absolute simulation time."""


class TrajectoryType(str, Enum):
    STATIONARY = "stationary"
    LINEAR = "linear"
    CIRCULAR = "circular"
    SINUSOIDAL = "sinusoidal"
    ERRATIC = "erratic"
    FIGURE_EIGHT = "figure_eight"


@dataclass(frozen=True, slots=True)
class StationaryTrajectory:
    azimuth_rad: float = 0.0
    elevation_rad: float = 0.0
    intensity: int = 255
    range_m: float = 100.0

    def sample(self, time_seconds: float) -> BeaconState:
        del time_seconds
        return BeaconState(
            self.azimuth_rad,
            self.elevation_rad,
            self.intensity,
            self.range_m,
        )


@dataclass(frozen=True, slots=True)
class LinearTrajectory:
    initial_azimuth_rad: float = 0.0
    initial_elevation_rad: float = 0.0
    azimuth_rate_rad_s: float = 0.0
    elevation_rate_rad_s: float = 0.0
    intensity: int = 255
    range_m: float = 100.0

    def sample(self, time_seconds: float) -> BeaconState:
        return BeaconState(
            self.initial_azimuth_rad + self.azimuth_rate_rad_s * time_seconds,
            self.initial_elevation_rad + self.elevation_rate_rad_s * time_seconds,
            self.intensity,
            self.range_m,
            self.azimuth_rate_rad_s,
            self.elevation_rate_rad_s,
        )

@dataclass(frozen=True, slots=True)
class CircularTrajectory:
    centre_azimuth_rad: float = 0.0
    centre_elevation_rad: float = 0.0
    azimuth_radius_rad: float = 0.1
    elevation_radius_rad: float = 0.1
    frequency_hz: float = 0.1
    phase_rad: float = 0.0
    intensity: int = 255
    range_m: float = 100.0

    def sample(self, time_seconds: float) -> BeaconState:
        phase = 2.0 * pi * self.frequency_hz * time_seconds + self.phase_rad
        return BeaconState(
            self.centre_azimuth_rad + self.azimuth_radius_rad * cos(phase),
            self.centre_elevation_rad + self.elevation_radius_rad * sin(phase),
            self.intensity,
            self.range_m,
            -self.azimuth_radius_rad * 2.0 * pi * self.frequency_hz * sin(phase),
            self.elevation_radius_rad * 2.0 * pi * self.frequency_hz * cos(phase),
        )


@dataclass(frozen=True, slots=True)
class SinusoidalTrajectory:
    centre_azimuth_rad: float = 0.0
    centre_elevation_rad: float = 0.0
    azimuth_amplitude_rad: float = 0.1
    elevation_amplitude_rad: float = 0.05
    azimuth_frequency_hz: float = 0.1
    elevation_frequency_hz: float = 0.15
    azimuth_phase_rad: float = 0.0
    elevation_phase_rad: float = pi / 2.0
    intensity: int = 255
    range_m: float = 100.0

    def sample(self, time_seconds: float) -> BeaconState:
        azimuth_phase = 2.0 * pi * self.azimuth_frequency_hz * time_seconds + self.azimuth_phase_rad
        elevation_phase = 2.0 * pi * self.elevation_frequency_hz * time_seconds + self.elevation_phase_rad
        return BeaconState(
            self.centre_azimuth_rad + self.azimuth_amplitude_rad * sin(azimuth_phase),
            self.centre_elevation_rad + self.elevation_amplitude_rad * sin(elevation_phase),
            self.intensity,
            self.range_m,
            self.azimuth_amplitude_rad * 2.0 * pi * self.azimuth_frequency_hz * cos(azimuth_phase),
            self.elevation_amplitude_rad
            * 2.0
            * pi
            * self.elevation_frequency_hz
            * cos(elevation_phase),
        )


@dataclass(frozen=True, slots=True)
class FigureEightTrajectory:
    """Smooth Lissajous figure-eight movement with analytic velocity."""

    centre_azimuth_rad: float = 0.0
    centre_elevation_rad: float = 0.0
    azimuth_amplitude_rad: float = 0.18
    elevation_amplitude_rad: float = 0.10
    frequency_hz: float = 0.1
    phase_rad: float = 0.0
    intensity: int = 255
    range_m: float = 100.0

    def sample(self, time_seconds: float) -> BeaconState:
        phase = 2.0 * pi * self.frequency_hz * time_seconds + self.phase_rad
        omega = 2.0 * pi * self.frequency_hz
        return BeaconState(
            self.centre_azimuth_rad + self.azimuth_amplitude_rad * sin(phase),
            self.centre_elevation_rad + self.elevation_amplitude_rad * sin(2.0 * phase),
            self.intensity,
            self.range_m,
            self.azimuth_amplitude_rad * omega * cos(phase),
            self.elevation_amplitude_rad * 2.0 * omega * cos(2.0 * phase),
        )


@dataclass(frozen=True, slots=True)
class ErraticTrajectory:
    """Seeded, continuous random movement suitable for stress testing.

    A deterministic velocity is generated for each fixed segment.  The beacon
    integrates all completed segments and the current partial segment, so
    sampling is repeatable and independent of call order.
    """

    initial_azimuth_rad: float = 0.0
    initial_elevation_rad: float = 0.0
    max_azimuth_rate_rad_s: float = 0.20
    max_elevation_rate_rad_s: float = 0.12
    segment_duration_s: float = 0.5
    seed: int = 169
    intensity: int = 255
    range_m: float = 100.0

    def __post_init__(self) -> None:
        if self.segment_duration_s <= 0.0:
            raise ValueError("segment_duration_s must be greater than zero")
        if self.max_azimuth_rate_rad_s < 0.0 or self.max_elevation_rate_rad_s < 0.0:
            raise ValueError("maximum erratic rates must be non-negative")
        if self.seed < 0:
            raise ValueError("seed must be non-negative")

    def sample(self, time_seconds: float) -> BeaconState:
        if time_seconds < 0.0:
            raise ValueError("time_seconds must be non-negative")
        completed = int(time_seconds // self.segment_duration_s)
        partial = time_seconds - completed * self.segment_duration_s
        rng = np.random.default_rng(self.seed)
        rates = rng.uniform(-1.0, 1.0, (completed + 1, 2))
        rates[:, 0] *= self.max_azimuth_rate_rad_s
        rates[:, 1] *= self.max_elevation_rate_rad_s
        if completed:
            integrated = rates[:completed].sum(axis=0) * self.segment_duration_s
            azimuth = self.initial_azimuth_rad + float(integrated[0])
            elevation = self.initial_elevation_rad + float(integrated[1])
        else:
            azimuth = self.initial_azimuth_rad
            elevation = self.initial_elevation_rad
        az_rate, el_rate = (float(value) for value in rates[completed])
        azimuth += az_rate * partial
        elevation += el_rate * partial
        return BeaconState(
            azimuth,
            elevation,
            self.intensity,
            self.range_m,
            az_rate,
            el_rate,
        )


def create_trajectory(kind: TrajectoryType | str, *, seed: int = 169) -> Trajectory:
    """Create a demonstration-ready trajectory for every supported movement."""
    trajectory_type = TrajectoryType(kind)
    if trajectory_type is TrajectoryType.STATIONARY:
        return StationaryTrajectory(azimuth_rad=0.12, elevation_rad=0.05)
    if trajectory_type is TrajectoryType.LINEAR:
        return LinearTrajectory(-0.18, 0.08, 0.035, -0.008)
    if trajectory_type is TrajectoryType.CIRCULAR:
        return CircularTrajectory(0.03, 0.02, 0.16, 0.10, 0.08)
    if trajectory_type is TrajectoryType.SINUSOIDAL:
        return SinusoidalTrajectory(0.04, 0.01, 0.20, 0.10, 0.08, 0.12)
    if trajectory_type is TrajectoryType.ERRATIC:
        return ErraticTrajectory(seed=seed)
    return FigureEightTrajectory()
