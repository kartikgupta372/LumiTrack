"""Seeded synthetic BGR camera-frame renderer."""

from __future__ import annotations

import cv2
import numpy as np
from numpy.typing import NDArray

from fsoc_sim.config import BeaconRenderConfig, CameraConfig
from fsoc_sim.models import Projection


class FrameRenderer:
    """Render a stable star field and optical beacon point-spread function."""

    def __init__(self, camera: CameraConfig, render: BeaconRenderConfig, seed: int) -> None:
        self.camera = camera
        self.render_config = render
        rng = np.random.default_rng(seed)
        self._background = np.full(
            (camera.height_px, camera.width_px, 3),
            render.background_intensity,
            dtype=np.uint8,
        )
        for _ in range(render.star_count):
            x = int(rng.integers(0, camera.width_px))
            y = int(rng.integers(0, camera.height_px))
            low = min(render.background_intensity + 2, render.star_max_intensity)
            intensity = (
                int(rng.integers(low, render.star_max_intensity + 1))
                if low <= render.star_max_intensity
                else low
            )
            self._background[y, x] = (intensity, intensity, intensity)

        centre_x = int(round((camera.width_px - 1) / 2.0))
        centre_y = int(round((camera.height_px - 1) / 2.0))
        half = render.crosshair_half_length_px
        colour = (0, render.crosshair_intensity, 0)
        cv2.line(self._background, (centre_x - half, centre_y), (centre_x + half, centre_y), colour, 1)
        cv2.line(self._background, (centre_x, centre_y - half), (centre_x, centre_y + half), colour, 1)

    def render(
        self,
        projection: Projection,
        *,
        beacon_intensity: int | None = None,
    ) -> NDArray[np.uint8]:
        image = self._background.copy()
        if not projection.visible:
            return image

        assert projection.x_px is not None and projection.y_px is not None
        centre = (int(round(projection.x_px)), int(round(projection.y_px)))
        intensity = int(
            np.clip(
                self.render_config.intensity if beacon_intensity is None else beacon_intensity,
                0,
                255,
            )
        )
        glow_radius = max(
            self.render_config.radius_px + 1,
            int(round(self.render_config.radius_px * self.render_config.glow_radius_multiplier)),
        )
        glow_layer = np.zeros_like(image)
        cv2.circle(
            glow_layer,
            centre,
            glow_radius,
            (intensity, intensity, intensity),
            thickness=-1,
            lineType=cv2.LINE_AA,
        )
        glow_layer = cv2.GaussianBlur(
            glow_layer,
            (0, 0),
            sigmaX=max(1.0, glow_radius / 2.5),
        )
        image = cv2.add(image, glow_layer)
        cv2.circle(
            image,
            centre,
            self.render_config.radius_px,
            (intensity, intensity, intensity),
            thickness=-1,
            lineType=cv2.LINE_AA,
        )
        return image


def render_clean_frame(
    projection: Projection,
    camera: CameraConfig,
    render: BeaconRenderConfig,
) -> NDArray[np.uint8]:
    """Backward-compatible one-frame helper used by external callers."""
    return FrameRenderer(camera, render, seed=0).render(projection)
