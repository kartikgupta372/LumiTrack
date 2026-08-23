import random
from typing import Tuple
import numpy as np
import cv2
from app.core.schemas import DisturbanceConfig


class DisturbanceEngine:
    """
    Applies synthetic environmental and platform disturbances to camera frames and telemetry:
    - Gaussian Image Sensor Noise
    - Platform Jitter / Vibration
    - Atmospheric Scintillation / Turbulence
    - Motion Blur
    - Target Occlusion / Loss
    """
    def __init__(self, config: DisturbanceConfig):
        self.config = config

    def apply_vibration(self, pan_deg: float, tilt_deg: float) -> Tuple[float, float]:
        """
        Applies random high-frequency platform vibration jitter to camera orientation.
        """
        if self.config.vibration <= 0.0:
            return pan_deg, tilt_deg

        # Scale jitter magnitude up to 0.5 degrees at 100% vibration
        jitter_mag = (self.config.vibration / 100.0) * 0.5
        jitter_pan = random.gauss(0, jitter_mag)
        jitter_tilt = random.gauss(0, jitter_mag)

        return pan_deg + jitter_pan, tilt_deg + jitter_tilt

    def apply_disturbances_to_frame(self, frame: np.ndarray, frame_index: int) -> Tuple[np.ndarray, bool]:
        """
        Applies image-space disturbances to the synthetic camera frame.
        Returns (degraded_frame, target_is_occluded).
        """
        degraded = frame.copy()
        is_occluded = False

        # 1. Target Occlusion / Loss
        if self.config.occlusion:
            # Occlusion cycle: e.g. occluded for 60 frames every 180 frames
            period = 180
            duration = int(self.config.occlusion_duration_s * 30)
            if (frame_index % period) < duration:
                is_occluded = True
                # Blackout / mask the frame center
                degraded[:, :] = (10, 10, 10)

        # 2. Gaussian Image Sensor Noise
        if self.config.noise > 0.0:
            sigma = (self.config.noise / 100.0) * 50.0
            noise_array = np.random.normal(0, sigma, degraded.shape).astype(np.float32)
            noisy = degraded.astype(np.float32) + noise_array
            degraded = np.clip(noisy, 0, 255).astype(np.uint8)

        # 3. Atmospheric Turbulence / Scintillation (Intensity fluctuation & spatial warp)
        if self.config.turbulence > 0.0:
            turb_scale = self.config.turbulence / 100.0
            # Random brightness modulation
            brightness_mod = 1.0 + random.uniform(-0.4 * turb_scale, 0.2 * turb_scale)
            degraded = np.clip(degraded.astype(np.float32) * brightness_mod, 0, 255).astype(np.uint8)

        # 4. Motion Blur
        if self.config.blur > 0.0:
            kernel_size = int(round((self.config.blur / 100.0) * 15)) | 1 # ensure odd
            if kernel_size > 1:
                kernel = np.zeros((kernel_size, kernel_size))
                kernel[int((kernel_size-1)/2), :] = 1.0 / kernel_size
                degraded = cv2.filter2D(degraded, -1, kernel)

        return degraded, is_occluded
