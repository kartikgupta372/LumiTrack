"""Group 1 orchestration with separated frame and truth outputs."""

from __future__ import annotations

from dataclasses import replace
from math import cos, tan

from fsoc_sim.camera import VirtualCamera
from fsoc_sim.clock import FixedStepClock
from fsoc_sim.config import AppConfig, DisturbanceConfig
from fsoc_sim.environment import EnvironmentEngine
from fsoc_sim.models import ControlCommand, FramePacket, GroundTruth, SimulationStep
from fsoc_sim.projection import project_beacon
from fsoc_sim.renderer import FrameRenderer
from fsoc_sim.trajectories import Trajectory


class Simulation:
    """Deterministic virtual camera and moving optical beacon simulation.

    A command is applied for one fixed timestep before the current frame is
    produced. This models a command from the prior feedback-loop iteration.
    """

    def __init__(self, config: AppConfig, trajectory: Trajectory) -> None:
        self.config = config
        self.trajectory = trajectory
        self.clock = FixedStepClock(config.simulation.fps)
        self.camera = VirtualCamera(config.camera)
        self.renderer = FrameRenderer(
            config.camera,
            config.render,
            seed=config.simulation.seed,
        )
        self.environment = EnvironmentEngine(
            config.disturbances,
            seed=config.simulation.seed,
        )

    def reset(self) -> None:
        self.clock.reset()
        self.camera.reset()
        self.environment.reset()

    def set_disturbances(self, config: DisturbanceConfig) -> None:
        """Replace disturbance settings during a run without resetting time."""
        self.environment.reconfigure(config)

    def update_disturbances(self, **changes: float | bool) -> DisturbanceConfig:
        """Apply validated dashboard-style disturbance slider changes."""
        return self.environment.update(**changes)

    def set_trajectory(self, trajectory: Trajectory) -> None:
        """Switch target movement at runtime; simulation time remains continuous."""
        self.trajectory = trajectory

    def step(self, command: ControlCommand | None = None) -> SimulationStep:
        tick = self.clock.tick()
        applied_command = self.camera.apply(command or ControlCommand(), tick.dt_seconds)
        beacon = self.trajectory.sample(tick.time_seconds)
        optical_camera = self.environment.optical_camera_state(self.camera.state)
        projection = project_beacon(beacon, optical_camera, self.config.camera)
        occluded = self.environment.is_occluded(tick.time_seconds)
        render_projection = replace(
            projection,
            visible=projection.visible and not occluded,
            x_px=projection.x_px if not occluded else None,
            y_px=projection.y_px if not occluded else None,
        )
        clean_image = self.renderer.render(
            render_projection,
            beacon_intensity=beacon.intensity,
        )
        image = self.environment.apply_to_frame(
            clean_image,
            pan_rate_rad_s=applied_command.pan_rate_rad_s,
            tilt_rate_rad_s=applied_command.tilt_rate_rad_s,
        )

        frame = FramePacket(
            frame_id=tick.frame_id,
            timestamp_seconds=tick.time_seconds,
            image_bgr=image,
            camera_pan_rad=self.camera.state.pan_rad,
            camera_tilt_rad=self.camera.state.tilt_rad,
            horizontal_fov_rad=self.config.camera.horizontal_fov_rad,
            vertical_fov_rad=self.config.camera.vertical_fov_rad,
            camera_pan_rate_rad_s=applied_command.pan_rate_rad_s,
            camera_tilt_rate_rad_s=applied_command.tilt_rate_rad_s,
        )
        world_x_m = beacon.range_m * tan(beacon.azimuth_rad)
        world_y_m = beacon.range_m * tan(beacon.elevation_rad)
        velocity_x_m_s = beacon.range_m * beacon.azimuth_rate_rad_s / (cos(beacon.azimuth_rad) ** 2)
        velocity_y_m_s = beacon.range_m * beacon.elevation_rate_rad_s / (cos(beacon.elevation_rad) ** 2)
        truth = GroundTruth(
            frame_id=tick.frame_id,
            timestamp_seconds=tick.time_seconds,
            beacon_azimuth_rad=beacon.azimuth_rad,
            beacon_elevation_rad=beacon.elevation_rad,
            camera_pan_rad=self.camera.state.pan_rad,
            camera_tilt_rad=self.camera.state.tilt_rad,
            visible=projection.visible and not occluded,
            projected_x_px=projection.x_px,
            projected_y_px=projection.y_px,
            in_fov=projection.visible,
            occluded=occluded,
            world_x_m=world_x_m,
            world_y_m=world_y_m,
            world_z_m=beacon.range_m,
            velocity_x_m_s=velocity_x_m_s,
            velocity_y_m_s=velocity_y_m_s,
        )
        return SimulationStep(frame=frame, truth=truth)
