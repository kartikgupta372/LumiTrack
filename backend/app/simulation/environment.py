"""
Environment / Disturbance Module
Applies synthetic physical disturbances to the camera frame and gimbal state.

Replaces and extends DisturbanceEngine from disturbances.py with:
  - Structured config access via DisturbanceConfig
  - Gaussian sensor noise
  - Platform jitter / vibration
  - Atmospheric turbulence (brightness + spatial warp)
  - Motion blur (horizontal kernel)
  - Target occlusion (periodic blackout)
  - Lens flare (optional cosmetic effect)
"""

import random
from typing import Tuple

import cv2
import numpy as np

from app.core.schemas import DisturbanceConfig


class EnvironmentEngine:
    """
    Applies real-world disturbances to the virtual simulation.

    Usage:
        env = EnvironmentEngine(config)
        pan, tilt = env.apply_vibration(pan, tilt)
        frame, occluded = env.apply_to_frame(frame, frame_index)
    """

    def __init__(self, config: DisturbanceConfig):
        self.config = config

    def reconfigure(self, config: DisturbanceConfig):
        self.config = config

    # ─── Gimbal Jitter ────────────────────────────────────────────────────────

    def apply_vibration(self, pan_deg: float, tilt_deg: float) -> Tuple[float, float]:
        """
        Add Gaussian vibration jitter to camera orientation angles.
        Max jitter: ±0.5° at 100% vibration level.
        """
        v = self.config.vibration
        if v <= 0.0:
            return pan_deg, tilt_deg

        sigma = (v / 100.0) * 0.5
        return pan_deg + random.gauss(0, sigma), tilt_deg + random.gauss(0, sigma)

    # ─── Frame Disturbances ───────────────────────────────────────────────────

    def apply_to_frame(self, frame: np.ndarray, frame_index: int) -> Tuple[np.ndarray, bool]:
        """
        Apply all configured image-space disturbances to a frame.
        Returns (degraded_frame, is_occluded).
        """
        out = frame.copy()
        is_occluded = False

        # 1. Target Occlusion (periodic blackout)
        if self.config.occlusion:
            period = 180
            duration = int(self.config.occlusion_duration_s * 30)
            if (frame_index % period) < duration:
                is_occluded = True
                out[:] = (8, 8, 8)
                return out, is_occluded   # skip other effects during blackout

        # 2. Gaussian Sensor Noise
        if self.config.noise > 0.0:
            sigma = (self.config.noise / 100.0) * 50.0
            noise = np.random.normal(0, sigma, out.shape).astype(np.float32)
            out = np.clip(out.astype(np.float32) + noise, 0, 255).astype(np.uint8)

        # 3. Atmospheric Turbulence — brightness scintillation + spatial shimmer
        if self.config.turbulence > 0.0:
            scale = self.config.turbulence / 100.0
            # Brightness flicker
            bmod = 1.0 + random.uniform(-0.4 * scale, 0.2 * scale)
            out = np.clip(out.astype(np.float32) * bmod, 0, 255).astype(np.uint8)
            # Spatial warp (small random displacement map)
            if scale > 0.3:
                h, w = out.shape[:2]
                flow = np.random.uniform(-scale * 2.5, scale * 2.5, (h, w, 2)).astype(np.float32)
                grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
                map_x = (grid_x + flow[:, :, 0]).astype(np.float32)
                map_y = (grid_y + flow[:, :, 1]).astype(np.float32)
                out = cv2.remap(out, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        # 4. Motion Blur (horizontal kernel)
        if self.config.blur > 0.0:
            ksize = int(round((self.config.blur / 100.0) * 15)) | 1
            if ksize > 1:
                kernel = np.zeros((ksize, ksize), dtype=np.float32)
                kernel[ksize // 2, :] = 1.0 / ksize
                out = cv2.filter2D(out, -1, kernel)

        return out, is_occluded
