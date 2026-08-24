from math import pi

import pytest

from fsoc_sim.trajectories import (
    CircularTrajectory,
    ErraticTrajectory,
    FigureEightTrajectory,
    LinearTrajectory,
    SinusoidalTrajectory,
    StationaryTrajectory,
    TrajectoryType,
    create_trajectory,
)


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


def test_figure_eight_returns_to_centre_at_half_period() -> None:
    trajectory = FigureEightTrajectory(
        centre_azimuth_rad=0.2,
        centre_elevation_rad=-0.1,
        azimuth_amplitude_rad=0.4,
        elevation_amplitude_rad=0.3,
        frequency_hz=1.0,
    )
    start = trajectory.sample(0.0)
    quarter = trajectory.sample(0.25)
    half = trajectory.sample(0.5)
    assert (start.azimuth_rad, start.elevation_rad) == pytest.approx((0.2, -0.1))
    assert (quarter.azimuth_rad, quarter.elevation_rad) == pytest.approx((0.6, -0.1))
    assert (half.azimuth_rad, half.elevation_rad) == pytest.approx((0.2, -0.1))


def test_erratic_trajectory_is_seeded_continuous_and_call_order_independent() -> None:
    first = ErraticTrajectory(seed=42, segment_duration_s=0.5)
    second = ErraticTrajectory(seed=42, segment_duration_s=0.5)
    assert first.sample(3.25) == second.sample(3.25)
    sampled_late_first = first.sample(8.0)
    first.sample(1.0)
    assert first.sample(8.0) == sampled_late_first
    boundary_left = first.sample(0.5 - 1e-9)
    boundary = first.sample(0.5)
    assert boundary.azimuth_rad == pytest.approx(boundary_left.azimuth_rad, abs=1e-8)
    assert boundary.elevation_rad == pytest.approx(boundary_left.elevation_rad, abs=1e-8)


@pytest.mark.parametrize("kind", list(TrajectoryType))
def test_factory_supports_every_movement_type(kind: TrajectoryType) -> None:
    state = create_trajectory(kind, seed=5).sample(0.75)
    assert isinstance(state.azimuth_rad, float)
    assert isinstance(state.elevation_rad, float)
