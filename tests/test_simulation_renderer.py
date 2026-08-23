from dataclasses import fields

import numpy as np

from fsoc_sim.config import AppConfig, CameraConfig, SimulationConfig
from fsoc_sim.models import ControlCommand, FramePacket
from fsoc_sim.simulation import Simulation
from fsoc_sim.trajectories import LinearTrajectory, StationaryTrajectory


def test_frame_packet_does_not_expose_ground_truth() -> None:
    frame_field_names = {field.name for field in fields(FramePacket)}
    forbidden = {
        "beacon_azimuth_rad",
        "beacon_elevation_rad",
        "projected_x_px",
        "projected_y_px",
        "visible",
        "truth",
    }
    assert frame_field_names.isdisjoint(forbidden)


def test_same_config_and_inputs_replay_identically() -> None:
    config = AppConfig(simulation=SimulationConfig(fps=20.0, seed=42))
    trajectory = LinearTrajectory(-0.1, 0.08, 0.02, -0.01)
    first = Simulation(config, trajectory)
    second = Simulation(config, trajectory)
    commands = [ControlCommand(0.01, -0.02) for _ in range(8)]

    first_steps = [first.step(command) for command in commands]
    second_steps = [second.step(command) for command in commands]
    for left, right in zip(first_steps, second_steps, strict=True):
        assert left.truth == right.truth
        assert np.array_equal(left.frame.image_bgr, right.frame.image_bgr)


def test_reset_replays_from_initial_state() -> None:
    simulation = Simulation(AppConfig(), StationaryTrajectory(0.1, 0.05))
    original = simulation.step(ControlCommand(0.02, 0.01))
    simulation.step(ControlCommand(-0.03, 0.02))
    simulation.reset()
    replay = simulation.step(ControlCommand(0.02, 0.01))
    assert original.truth == replay.truth
    assert np.array_equal(original.frame.image_bgr, replay.frame.image_bgr)


def test_rendered_beacon_is_bright_and_out_of_fov_frame_has_no_white_pixels() -> None:
    visible = Simulation(AppConfig(), StationaryTrajectory(0.0, 0.0)).step()
    assert visible.frame.image_bgr.max() == 255
    assert visible.truth.visible

    narrow_camera = CameraConfig(horizontal_fov_rad=0.2, vertical_fov_rad=0.2)
    hidden = Simulation(AppConfig(camera=narrow_camera), StationaryTrajectory(0.2, 0.0)).step()
    assert not hidden.truth.visible
    assert hidden.frame.image_bgr.max() < 255


def test_camera_command_changes_next_generated_projection() -> None:
    simulation = Simulation(AppConfig(), StationaryTrajectory(0.15, 0.0))
    before = simulation.step()
    after = simulation.step(ControlCommand(pan_rate_rad_s=0.3))
    assert before.truth.projected_x_px is not None
    assert after.truth.projected_x_px is not None
    assert after.truth.projected_x_px < before.truth.projected_x_px
