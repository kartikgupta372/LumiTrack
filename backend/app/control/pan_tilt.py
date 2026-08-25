"""Virtual pan-tilt gimbal and legacy compatibility controller."""

import math
from typing import Tuple

import cv2
import numpy as np

from app.core.models import BeaconState
from app.core.schemas import CameraConfig, CameraState


class PanTiltController:
    """Compatibility integrator for the legacy state service."""

    def __init__(self):
        self.reset()

    def update(self, pan_velocity: float, tilt_velocity: float):
        self.pan += pan_velocity
        self.tilt += tilt_velocity
        return self.pan, self.tilt

    def reset(self):
        self.pan = 0.0
        self.tilt = 0.0


class PanTiltGimbal:
    """Two-axis virtual camera with projection and synthetic-frame rendering."""

    def __init__(self, config: CameraConfig):
        self.config = config
        self.reset()

    def reset(self):
        self.pan = self.config.initial_pan
        self.tilt = self.config.initial_tilt
        self.pan_rate = 0.0
        self.tilt_rate = 0.0

    def drive(self, pan_vel_cmd: float, tilt_vel_cmd: float, dt: float):
        self.pan_rate = float(np.clip(pan_vel_cmd, -self.config.max_pan_rate, self.config.max_pan_rate))
        self.tilt_rate = float(np.clip(tilt_vel_cmd, -self.config.max_tilt_rate, self.config.max_tilt_rate))
        self.pan += self.pan_rate * dt
        self.tilt += self.tilt_rate * dt

    def get_state(self) -> CameraState:
        return CameraState(
            pan=self.pan,
            tilt=self.tilt,
            pan_rate=self.pan_rate,
            tilt_rate=self.tilt_rate,
        )

    def project(self, beacon: BeaconState) -> Tuple[float, float, bool]:
        z = max(beacon.z, 1.0)
        target_pan_deg = math.degrees(math.atan2(beacon.x, z))
        target_tilt_deg = math.degrees(math.atan2(beacon.y, z))
        rel_pan = target_pan_deg - self.pan
        rel_tilt = target_tilt_deg - self.tilt
        inside = (
            -self.config.fov_x / 2.0 <= rel_pan <= self.config.fov_x / 2.0
            and -self.config.fov_y / 2.0 <= rel_tilt <= self.config.fov_y / 2.0
        )
        u = self.config.frame_width / 2.0 + rel_pan * self.config.frame_width / self.config.fov_x
        v = self.config.frame_height / 2.0 - rel_tilt * self.config.frame_height / self.config.fov_y
        return u, v, inside

    def render(
        self,
        beacon_u: float,
        beacon_v: float,
        radius: float = 8.0,
        intensity: float = 255.0,
    ) -> np.ndarray:
        width = self.config.frame_width
        height = self.config.frame_height
        frame = np.full((height, width, 3), (15, 12, 10), dtype=np.uint8)
        rng = np.random.default_rng(seed=42)
        for x, y, brightness in zip(
            rng.integers(0, width, 40),
            rng.integers(0, height, 40),
            rng.integers(60, 160, 40),
        ):
            frame[y, x] = (brightness, brightness, brightness)

        if -radius * 4 <= beacon_u <= width + radius * 4 and -radius * 4 <= beacon_v <= height + radius * 4:
            center = (int(round(beacon_u)), int(round(beacon_v)))
            core_radius = max(1, int(radius))
            peak = int(np.clip(intensity, 0, 255))
            cv2.circle(frame, center, core_radius * 3, (20, 80, 180), -1, cv2.LINE_AA)
            cv2.circle(frame, center, int(core_radius * 1.8), (60, 160, peak), -1, cv2.LINE_AA)
            cv2.circle(frame, center, core_radius, (peak, peak, peak), -1, cv2.LINE_AA)
        return frame
