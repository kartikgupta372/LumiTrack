"""Deterministic angular beacon trajectories."""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from typing import Protocol

from fsoc_sim.models import BeaconState


class Trajectory(Protocol):
    def sample(self, time_seconds: float) -> BeaconState:
        """Return the beacon state at absolute simulation time."""


@dataclass(frozen=True, slots=True)
class StationaryTrajectory:
    azimuth_rad: float = 0.0
    elevation_rad: float = 0.0
    intensity: int = 255

    def sample(self, time_seconds: float) -> BeaconState:
        del time_seconds
        return BeaconState(self.azimuth_rad, self.elevation_rad, self.intensity)


@dataclass(frozen=True, slots=True)
class LinearTrajectory:
    initial_azimuth_rad: float = 0.0
    initial_elevation_rad: float = 0.0
    azimuth_rate_rad_s: float = 0.0
    elevation_rate_rad_s: float = 0.0
    intensity: int = 255

    def sample(self, time_seconds: float) -> BeaconState:
        return BeaconState(
            self.initial_azimuth_rad + self.azimuth_rate_rad_s * time_seconds,
            self.initial_elevation_rad + self.elevation_rate_rad_s * time_seconds,
            self.intensity,
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

    def sample(self, time_seconds: float) -> BeaconState:
        phase = 2.0 * pi * self.frequency_hz * time_seconds + self.phase_rad
        return BeaconState(
            self.centre_azimuth_rad + self.azimuth_radius_rad * cos(phase),
            self.centre_elevation_rad + self.elevation_radius_rad * sin(phase),
            self.intensity,
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

    def sample(self, time_seconds: float) -> BeaconState:
        return BeaconState(
            self.centre_azimuth_rad
            + self.azimuth_amplitude_rad
            * sin(2.0 * pi * self.azimuth_frequency_hz * time_seconds + self.azimuth_phase_rad),
            self.centre_elevation_rad
            + self.elevation_amplitude_rad
            * sin(2.0 * pi * self.elevation_frequency_hz * time_seconds + self.elevation_phase_rad),
            self.intensity,
        )
