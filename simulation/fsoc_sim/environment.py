"""Deterministic platform and optical disturbance engine."""

from __future__ import annotations

from dataclasses import replace
from math import pi

import cv2
import numpy as np
from numpy.typing import NDArray

from fsoc_sim.config import DisturbanceConfig
from fsoc_sim.models import CameraState


class EnvironmentEngine:
    """Apply seeded jitter, noise, turbulence, blur, and occlusion.

    A single generator is owned by the simulation and reset with the configured
    seed.  This makes complete runs repeatable while still producing different
    disturbance samples on successive frames.
    """

    def __init__(self, config: DisturbanceConfig, seed: int) -> None:
        self.config = config
        self._seed = seed
        self.reset()

    def reset(self) -> None:
        self._rng = np.random.default_rng(self._seed)

    def reconfigure(self, config: DisturbanceConfig) -> None:
        """Apply runtime slider updates without restarting the random stream."""
        self.config = config

    def update(self, **changes: float | bool) -> DisturbanceConfig:
        self.config = replace(self.config, **changes)
        return self.config

    def optical_camera_state(self, camera: CameraState) -> CameraState:
        """Return the instantaneous optical axis after platform vibration."""
        if self.config.vibration <= 0.0:
            return camera
        sigma_rad = (self.config.vibration / 100.0) * (0.5 * pi / 180.0)
        return CameraState(
            pan_rad=camera.pan_rad + float(self._rng.normal(0.0, sigma_rad)),
            tilt_rad=camera.tilt_rad + float(self._rng.normal(0.0, sigma_rad)),
        )

    def is_occluded(self, timestamp_seconds: float) -> bool:
        config = self.config
        if not config.occlusion or config.occlusion_duration_s <= 0.0:
            return False
        elapsed = timestamp_seconds - config.occlusion_start_s
        if elapsed < 0.0:
            return False
        if config.occlusion_period_s > 0.0:
            elapsed %= config.occlusion_period_s
        return elapsed < config.occlusion_duration_s

    def apply_to_frame(
        self,
        frame: NDArray[np.uint8],
        *,
        pan_rate_rad_s: float = 0.0,
        tilt_rate_rad_s: float = 0.0,
    ) -> NDArray[np.uint8]:
        """Return a degraded BGR frame while preserving shape and dtype."""
        output = frame.copy()
        turbulence_scale = self.config.turbulence / 100.0

        if turbulence_scale > 0.0:
            brightness = float(self._rng.uniform(1.0 - 0.40 * turbulence_scale, 1.0 + 0.20 * turbulence_scale))
            output = np.clip(output.astype(np.float32) * brightness, 0, 255).astype(np.uint8)
            if turbulence_scale >= 0.25:
                height, width = output.shape[:2]
                low_width = max(2, width // 24)
                low_height = max(2, height // 24)
                flow_x = self._rng.normal(0.0, 1.2 * turbulence_scale, (low_height, low_width)).astype(np.float32)
                flow_y = self._rng.normal(0.0, 1.2 * turbulence_scale, (low_height, low_width)).astype(np.float32)
                flow_x = cv2.resize(flow_x, (width, height), interpolation=cv2.INTER_CUBIC)
                flow_y = cv2.resize(flow_y, (width, height), interpolation=cv2.INTER_CUBIC)
                grid_x, grid_y = np.meshgrid(
                    np.arange(width, dtype=np.float32),
                    np.arange(height, dtype=np.float32),
                )
                output = cv2.remap(
                    output,
                    grid_x + flow_x,
                    grid_y + flow_y,
                    cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_REFLECT,
                )

        if self.config.blur > 0.0:
            maximum_kernel = 15
            movement = abs(pan_rate_rad_s) + abs(tilt_rate_rad_s)
            configured = self.config.blur / 100.0
            kernel_size = max(3, int(round(3 + configured * (maximum_kernel - 3)))) | 1
            kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
            if abs(tilt_rate_rad_s) > abs(pan_rate_rad_s):
                kernel[:, kernel_size // 2] = 1.0 / kernel_size
            elif movement > 0.0 or configured > 0.0:
                kernel[kernel_size // 2, :] = 1.0 / kernel_size
            output = cv2.filter2D(output, -1, kernel)

        if self.config.noise > 0.0:
            sigma = (self.config.noise / 100.0) * 50.0
            sensor_noise = self._rng.normal(0.0, sigma, output.shape).astype(np.float32)
            output = np.clip(output.astype(np.float32) + sensor_noise, 0, 255).astype(np.uint8)

        return np.ascontiguousarray(output, dtype=np.uint8)
