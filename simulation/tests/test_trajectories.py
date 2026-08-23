from math import pi

import pytest

from fsoc_sim.trajectories import CircularTrajectory, LinearTrajectory, SinusoidalTrajectory, StationaryTrajectory


def test_stationary_trajectory_never_moves() -> None:
    trajectory = StationaryTrajectory(0.25, -0.1)
    assert trajectory.sample(0.0) == trajectory.sample(123.0)


def test_linear_trajectory_uses_absolute_time() -> None:
    state = LinearTrajectory(0.1, -0.2, 0.05, 0.02).sample(4.0)
    assert state.azimuth_rad == pytest.approx(0.3)
    assert state.elevation_rad == pytest.approx(-0.12)


def test_circular_trajectory_quarter_period() -> None:
    trajectory = CircularTrajectory(
        centre_azimuth_rad=1.0,
        centre_elevation_rad=2.0,
        azimuth_radius_rad=0.4,
        elevation_radius_rad=0.2,
        frequency_hz=1.0,
    )
    start = trajectory.sample(0.0)
    quarter = trajectory.sample(0.25)
    assert (start.azimuth_rad, start.elevation_rad) == pytest.approx((1.4, 2.0))
    assert (quarter.azimuth_rad, quarter.elevation_rad) == pytest.approx((1.0, 2.2))


def test_sinusoidal_trajectory_phases_and_frequencies() -> None:
    trajectory = SinusoidalTrajectory(
        centre_azimuth_rad=0.2,
        centre_elevation_rad=-0.1,
        azimuth_amplitude_rad=0.4,
        elevation_amplitude_rad=0.3,
        azimuth_frequency_hz=1.0,
        elevation_frequency_hz=0.5,
        azimuth_phase_rad=pi / 2.0,
        elevation_phase_rad=0.0,
    )
    start = trajectory.sample(0.0)
    half_second = trajectory.sample(0.5)
    assert (start.azimuth_rad, start.elevation_rad) == pytest.approx((0.6, -0.1))
    assert (half_second.azimuth_rad, half_second.elevation_rad) == pytest.approx((-0.2, 0.2))
