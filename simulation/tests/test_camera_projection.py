from math import pi

import pytest

from fsoc_sim.camera import VirtualCamera
from fsoc_sim.config import CameraConfig
from fsoc_sim.models import BeaconState, CameraState, ControlCommand
from fsoc_sim.projection import project_beacon


@pytest.fixture
def camera_config() -> CameraConfig:
    return CameraConfig(
        width_px=640,
        height_px=480,
        horizontal_fov_rad=pi / 2.0,
        vertical_fov_rad=pi / 3.0,
    )


def test_boresight_projects_to_geometric_image_centre(camera_config: CameraConfig) -> None:
    projection = project_beacon(BeaconState(0.2, -0.1), CameraState(0.2, -0.1), camera_config)
    assert projection.visible
    assert projection.x_px == pytest.approx(319.5)
    assert projection.y_px == pytest.approx(239.5)


def test_projection_sign_conventions(camera_config: CameraConfig) -> None:
    centre = CameraState(0.0, 0.0)
    right = project_beacon(BeaconState(0.1, 0.0), centre, camera_config)
    left = project_beacon(BeaconState(-0.1, 0.0), centre, camera_config)
    up = project_beacon(BeaconState(0.0, 0.1), centre, camera_config)
    down = project_beacon(BeaconState(0.0, -0.1), centre, camera_config)
    assert right.x_px is not None and left.x_px is not None
    assert up.y_px is not None and down.y_px is not None
    assert right.x_px > 319.5 > left.x_px
    assert up.y_px < 239.5 < down.y_px


def test_exact_fov_boundaries_are_visible_and_map_to_edges(camera_config: CameraConfig) -> None:
    half_h = camera_config.horizontal_fov_rad / 2.0
    half_v = camera_config.vertical_fov_rad / 2.0
    assert project_beacon(BeaconState(-half_h, 0.0), CameraState(0.0, 0.0), camera_config).x_px == pytest.approx(0.0)
    assert project_beacon(BeaconState(half_h, 0.0), CameraState(0.0, 0.0), camera_config).x_px == pytest.approx(639.0)
    assert project_beacon(BeaconState(0.0, half_v), CameraState(0.0, 0.0), camera_config).y_px == pytest.approx(0.0)
    assert project_beacon(BeaconState(0.0, -half_v), CameraState(0.0, 0.0), camera_config).y_px == pytest.approx(479.0)


def test_just_outside_fov_is_invisible(camera_config: CameraConfig) -> None:
    projection = project_beacon(
        BeaconState(camera_config.horizontal_fov_rad / 2.0 + 1e-6, 0.0),
        CameraState(0.0, 0.0),
        camera_config,
    )
    assert not projection.visible
    assert projection.x_px is None
    assert projection.y_px is None


def test_camera_rate_and_angle_limits() -> None:
    config = CameraConfig(
        min_pan_rad=-0.2,
        max_pan_rad=0.2,
        min_tilt_rad=-0.1,
        max_tilt_rad=0.1,
        max_pan_rate_rad_s=0.05,
        max_tilt_rate_rad_s=0.04,
    )
    camera = VirtualCamera(config)
    applied = camera.apply(ControlCommand(99.0, -99.0), 1.0)
    assert applied == ControlCommand(0.05, -0.04)
    assert camera.state == CameraState(0.05, -0.04)
    for _ in range(10):
        camera.apply(ControlCommand(99.0, -99.0), 1.0)
    assert camera.state == CameraState(0.2, -0.1)
