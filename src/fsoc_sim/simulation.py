"""Group 1 orchestration with separated frame and truth outputs."""

from __future__ import annotations

import numpy as np

from fsoc_sim.camera import VirtualCamera
from fsoc_sim.clock import FixedStepClock
from fsoc_sim.config import AppConfig
from fsoc_sim.models import ControlCommand, FramePacket, GroundTruth, SimulationStep
from fsoc_sim.projection import project_beacon
from fsoc_sim.renderer import render_clean_frame
from fsoc_sim.trajectories import Trajectory


class Simulation:
    """Clean deterministic Group 1 simulation.

    A command is applied for one fixed timestep before the current frame is
    produced. This models a command from the prior feedback-loop iteration.
    """

    def __init__(self, config: AppConfig, trajectory: Trajectory) -> None:
        self.config = config
        self.trajectory = trajectory
        self.clock = FixedStepClock(config.simulation.fps)
        self.camera = VirtualCamera(config.camera)
        self.rng = np.random.default_rng(config.simulation.seed)

    def reset(self) -> None:
        self.clock.reset()
        self.camera.reset()
        self.rng = np.random.default_rng(self.config.simulation.seed)

    def step(self, command: ControlCommand | None = None) -> SimulationStep:
        tick = self.clock.tick()
        self.camera.apply(command or ControlCommand(), tick.dt_seconds)
        beacon = self.trajectory.sample(tick.time_seconds)
        projection = project_beacon(beacon, self.camera.state, self.config.camera)
        image = render_clean_frame(projection, self.config.camera, self.config.render)

        frame = FramePacket(
            frame_id=tick.frame_id,
            timestamp_seconds=tick.time_seconds,
            image_bgr=image,
            camera_pan_rad=self.camera.state.pan_rad,
            camera_tilt_rad=self.camera.state.tilt_rad,
            horizontal_fov_rad=self.config.camera.horizontal_fov_rad,
            vertical_fov_rad=self.config.camera.vertical_fov_rad,
        )
        truth = GroundTruth(
            frame_id=tick.frame_id,
            timestamp_seconds=tick.time_seconds,
            beacon_azimuth_rad=beacon.azimuth_rad,
            beacon_elevation_rad=beacon.elevation_rad,
            camera_pan_rad=self.camera.state.pan_rad,
            camera_tilt_rad=self.camera.state.tilt_rad,
            visible=projection.visible,
            projected_x_px=projection.x_px,
            projected_y_px=projection.y_px,
        )
        return SimulationStep(frame=frame, truth=truth)
