import math
from typing import Tuple, Optional
import numpy as np
import cv2
from app.core.schemas import CameraConfig, CameraState, BeaconWorldState


class VirtualCamera:
    """
    Virtual Camera model mapping world coordinates to 2D image coordinates.
    Pan (Theta) rotates around Y-axis (horizontal).
    Tilt (Phi) rotates around X-axis (vertical).
    """
    def __init__(self, config: CameraConfig):
        self.config = config
        self.reset()

    def reset(self):
        self.pan = 0.0   # deg
        self.tilt = 0.0  # deg
        self.pan_rate = 0.0
        self.tilt_rate = 0.0

    def update_orientation(self, pan_velocity: float, tilt_velocity: float, dt: float):
        """
        Updates camera pan and tilt angles given target velocity commands,
        enforcing maximum angular velocity limits.
        """
        max_pan = self.config.max_pan_rate
        max_tilt = self.config.max_tilt_rate

        self.pan_rate = np.clip(pan_velocity, -max_pan, max_pan)
        self.tilt_rate = np.clip(tilt_velocity, -max_tilt, max_tilt)

        self.pan += self.pan_rate * dt
        self.tilt += self.tilt_rate * dt

    def get_state(self) -> CameraState:
        return CameraState(
            pan=self.pan,
            tilt=self.tilt,
            pan_rate=self.pan_rate,
            tilt_rate=self.tilt_rate
        )

    def world_to_image(self, beacon: BeaconWorldState) -> Tuple[float, float, bool]:
        """
        Maps a 2D world position (x, y in meters at distance D=100m) to pixel coordinates (u, v).
        Returns (pixel_x, pixel_y, is_inside_fov).
        """
        distance = 100.0  # assumed baseline range in meters

        # Angular position relative to world origin
        target_pan_deg = math.degrees(math.atan2(beacon.x, distance))
        target_tilt_deg = math.degrees(math.atan2(beacon.y, distance))

        # Relative angular displacement from camera center
        rel_pan_deg = target_pan_deg - self.pan
        rel_tilt_deg = target_tilt_deg - self.tilt

        # Check if inside FOV boundaries
        half_fov_x = self.config.fov_x / 2.0
        half_fov_y = self.config.fov_y / 2.0

        is_inside = (-half_fov_x <= rel_pan_deg <= half_fov_x) and (-half_fov_y <= rel_tilt_deg <= half_fov_y)

        # Map relative angles to pixel coordinates
        # Center of frame (cx, cy)
        cx = self.config.frame_width / 2.0
        cy = self.config.frame_height / 2.0

        # Pixels per degree
        px_per_deg_x = self.config.frame_width / self.config.fov_x
        px_per_deg_y = self.config.frame_height / self.config.fov_y

        u = cx + rel_pan_deg * px_per_deg_x
        v = cy - rel_tilt_deg * px_per_deg_y # inverted Y for computer vision screen coords

        return u, v, is_inside

    def render_frame(self, beacon_u: float, beacon_v: float, beacon_radius: float = 8.0, intensity: float = 255.0) -> np.ndarray:
        """
        Generates a synthetic camera image (BGR format).
        Background is dark/space-like, beacon is rendered as a Gaussian-like bright optical spot.
        """
        w = self.config.frame_width
        h = self.config.frame_height

        # Create dark background image
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        # Add subtle background stars / space noise
        frame[:, :] = (15, 12, 10)

        # Draw optical beacon spot if within expanded frame bounds
        if -50 <= beacon_u <= w + 50 and -50 <= beacon_v <= h + 50:
            center_int = (int(round(beacon_u)), int(round(beacon_v)))
            
            # Outer optical glow / halo
            cv2.circle(frame, center_int, int(beacon_radius * 2.5), (40, 120, 255), -1, lineType=cv2.LINE_AA)
            cv2.circle(frame, center_int, int(beacon_radius * 1.5), (100, 200, 255), -1, lineType=cv2.LINE_AA)
            # Bright central laser core
            cv2.circle(frame, center_int, int(beacon_radius), (255, 255, 255), -1, lineType=cv2.LINE_AA)

        return frame
