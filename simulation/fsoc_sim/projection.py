"""Angular world-to-image projection."""

from __future__ import annotations

from math import atan2, cos, sin

from fsoc_sim.config import CameraConfig
from fsoc_sim.models import BeaconState, CameraState, Projection


_BOUNDARY_EPSILON = 1e-12


def signed_angular_difference(target_rad: float, reference_rad: float) -> float:
    """Shortest signed target-reference difference in [-pi, pi]."""
    raw = target_rad - reference_rad
    return atan2(sin(raw), cos(raw))


def project_beacon(
    beacon: BeaconState,
    camera: CameraState,
    config: CameraConfig,
) -> Projection:
    """Project an angular beacon direction into the camera image.

    A target exactly on a FOV boundary is visible and maps to an edge pixel.
    Positive relative azimuth maps right. Positive relative elevation maps up.
    """
    relative_azimuth = signed_angular_difference(beacon.azimuth_rad, camera.pan_rad)
    relative_elevation = beacon.elevation_rad - camera.tilt_rad
    half_horizontal_fov = config.horizontal_fov_rad / 2.0
    half_vertical_fov = config.vertical_fov_rad / 2.0

    visible = (
        abs(relative_azimuth) <= half_horizontal_fov + _BOUNDARY_EPSILON
        and abs(relative_elevation) <= half_vertical_fov + _BOUNDARY_EPSILON
    )
    if not visible:
        return Projection(
            visible=False,
            x_px=None,
            y_px=None,
            relative_azimuth_rad=relative_azimuth,
            relative_elevation_rad=relative_elevation,
        )

    centre_x = (config.width_px - 1) / 2.0
    centre_y = (config.height_px - 1) / 2.0
    x_px = centre_x + (relative_azimuth / half_horizontal_fov) * centre_x
    y_px = centre_y - (relative_elevation / half_vertical_fov) * centre_y
    return Projection(
        visible=True,
        x_px=float(min(max(x_px, 0.0), config.width_px - 1.0)),
        y_px=float(min(max(y_px, 0.0), config.height_px - 1.0)),
        relative_azimuth_rad=relative_azimuth,
        relative_elevation_rad=relative_elevation,
    )
