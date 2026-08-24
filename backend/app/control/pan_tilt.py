<<<<<<< HEAD
class PanTiltController:
    def __init__(self):
        self.pan = 0.0
        self.tilt = 0.0

    def update(self, pan_velocity: float, tilt_velocity: float):
        self.pan += pan_velocity
        self.tilt += tilt_velocity

        return self.pan, self.tilt

    def reset(self):
        self.pan = 0.0
        self.tilt = 0.0
=======
"""
Pan-Tilt Gimbal Model
Simulates the virtual 2-axis pan-tilt camera gimbal platform.

Responsibilities:
  - Tracks current pan/tilt angles and rates
  - Enforces angular velocity saturation limits
  - Maps 3D world beacon position → 2D image pixel coordinates
  - Renders a synthetic camera frame (beacon as optical Gaussian spot)
"""

import math
from typing import Tuple

import cv2
import numpy as np

from app.core.models import BeaconState
from app.core.schemas import CameraConfig, CameraState


class PanTiltGimbal:
    """
    Virtual 2-axis pan-tilt gimbal camera.

    Coordinate conventions:
      - Pan  (θ): rotation around vertical (Y) axis, positive = right
      - Tilt (φ): rotation around horizontal (X) axis, positive = up
      - World X: horizontal, World Y: vertical, World Z: range (depth)
    """

    def __init__(self, config: CameraConfig):
        self.config = config
        self.reset()

    def reset(self):
        self.pan: float = 0.0       # degrees
        self.tilt: float = 0.0      # degrees
        self.pan_rate: float = 0.0  # deg/s
        self.tilt_rate: float = 0.0

    # ─── Gimbal Drive ──────────────────────────────────────────────────────────

    def drive(self, pan_vel_cmd: float, tilt_vel_cmd: float, dt: float):
        """
        Apply velocity commands to pan/tilt axes (with rate saturation).
        """
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

    # ─── Projection ────────────────────────────────────────────────────────────

    def project(self, beacon: BeaconState) -> Tuple[float, float, bool]:
        """
        Project beacon world-space position (x, y at range z) to image pixel (u, v).
        Returns (u, v, is_inside_fov).
        """
        z = max(beacon.z, 1.0)

        # Angular bearing to beacon
        target_pan_deg = math.degrees(math.atan2(beacon.x, z))
        target_tilt_deg = math.degrees(math.atan2(beacon.y, z))

        # Relative displacement from camera boresight
        rel_pan = target_pan_deg - self.pan
        rel_tilt = target_tilt_deg - self.tilt

        # FOV check
        hfov_x = self.config.fov_x / 2.0
        hfov_y = self.config.fov_y / 2.0
        inside = (-hfov_x <= rel_pan <= hfov_x) and (-hfov_y <= rel_tilt <= hfov_y)

        # Pixel mapping
        cx = self.config.frame_width / 2.0
        cy = self.config.frame_height / 2.0
        ppd_x = self.config.frame_width / self.config.fov_x
        ppd_y = self.config.frame_height / self.config.fov_y

        u = cx + rel_pan * ppd_x
        v = cy - rel_tilt * ppd_y   # screen Y is inverted

        return u, v, inside

    # ─── Frame Rendering ──────────────────────────────────────────────────────

    def render(
        self,
        beacon_u: float,
        beacon_v: float,
        radius: float = 8.0,
        intensity: float = 255.0,
    ) -> np.ndarray:
        """
        Generate a synthetic FSOC camera frame.
        Background = dark space scene, beacon = layered Gaussian optical spot.
        """
        w = self.config.frame_width
        h = self.config.frame_height
        frame = np.full((h, w, 3), (15, 12, 10), dtype=np.uint8)

        # Add faint background star field
        n_stars = 40
        rng = np.random.default_rng(seed=42)   # deterministic star positions
        sx = rng.integers(0, w, n_stars)
        sy = rng.integers(0, h, n_stars)
        br = rng.integers(60, 160, n_stars)
        for x, y, b in zip(sx, sy, br):
            frame[y, x] = (b, b, b)

        # Draw beacon optical spot (only when partially visible)
        if -radius * 4 <= beacon_u <= w + radius * 4 and -radius * 4 <= beacon_v <= h + radius * 4:
            ci = (int(round(beacon_u)), int(round(beacon_v)))
            r = max(1, int(radius))

            # Outer diffuse halo
            cv2.circle(frame, ci, r * 3, (20, 80, 180), -1, cv2.LINE_AA)
            # Mid glow ring
            cv2.circle(frame, ci, int(r * 1.8), (60, 160, 255), -1, cv2.LINE_AA)
            # Inner bright core
            cv2.circle(frame, ci, r, (255, 255, 255), -1, cv2.LINE_AA)

        return frame
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
