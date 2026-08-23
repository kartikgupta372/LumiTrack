"""Clean OpenCV camera-frame renderer."""

from __future__ import annotations

import cv2
import numpy as np
from numpy.typing import NDArray

from fsoc_sim.config import BeaconRenderConfig, CameraConfig
from fsoc_sim.models import Projection


def render_clean_frame(
    projection: Projection,
    camera: CameraConfig,
    render: BeaconRenderConfig,
) -> NDArray[np.uint8]:
    """Render only the clean camera image and a diagnostic centre crosshair."""
    image = np.full(
        (camera.height_px, camera.width_px, 3),
        render.background_intensity,
        dtype=np.uint8,
    )
    centre_x = int(round((camera.width_px - 1) / 2.0))
    centre_y = int(round((camera.height_px - 1) / 2.0))
    half = render.crosshair_half_length_px
    crosshair_colour = (0, render.crosshair_intensity, 0)
    cv2.line(image, (centre_x - half, centre_y), (centre_x + half, centre_y), crosshair_colour, 1)
    cv2.line(image, (centre_x, centre_y - half), (centre_x, centre_y + half), crosshair_colour, 1)

    if projection.visible:
        assert projection.x_px is not None and projection.y_px is not None
        beacon_centre = (
            int(round(projection.x_px)),
            int(round(projection.y_px)),
        )
        intensity = render.intensity
        cv2.circle(
            image,
            beacon_centre,
            render.radius_px,
            (intensity, intensity, intensity),
            thickness=-1,
            lineType=cv2.LINE_AA,
        )
    return image
