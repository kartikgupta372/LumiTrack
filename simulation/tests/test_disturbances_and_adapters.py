import base64
from dataclasses import fields

import cv2
import numpy as np
import pytest

from fsoc_sim.adapters import encode_jpeg, frontend_camera_payload
from fsoc_sim.config import AppConfig, DisturbanceConfig, SimulationConfig
from fsoc_sim.models import FramePacket
from fsoc_sim.simulation import Simulation
from fsoc_sim.trajectories import StationaryTrajectory


def test_disturbed_runs_replay_exactly_with_same_seed() -> None:
    config = AppConfig(
        simulation=SimulationConfig(seed=77),
        disturbances=DisturbanceConfig(
            noise=35.0,
            vibration=45.0,
            turbulence=55.0,
            blur=30.0,
        ),
    )
    left = Simulation(config, StationaryTrajectory(0.1, 0.04))
    right = Simulation(config, StationaryTrajectory(0.1, 0.04))
    for _ in range(8):
        left_step = left.step()
        right_step = right.step()
        assert left_step.truth == right_step.truth
        assert np.array_equal(left_step.frame.image_bgr, right_step.frame.image_bgr)


def test_runtime_disturbance_update_changes_frames_without_resetting_clock() -> None:
    simulation = Simulation(AppConfig(), StationaryTrajectory(0.0, 0.0))
    clean = simulation.step()
    updated = simulation.update_disturbances(noise=100.0)
    noisy = simulation.step()
    assert updated.noise == 100.0
    assert noisy.frame.frame_id == clean.frame.frame_id + 1
    assert not np.array_equal(clean.frame.image_bgr, noisy.frame.image_bgr)


def test_occlusion_hides_beacon_but_preserves_physical_projection_truth() -> None:
    config = AppConfig(
        disturbances=DisturbanceConfig(
            occlusion=True,
            occlusion_start_s=0.0,
            occlusion_duration_s=1.0,
        )
    )
    step = Simulation(config, StationaryTrajectory(0.0, 0.0)).step()
    assert step.truth.in_fov
    assert step.truth.occluded
    assert not step.truth.visible
    assert step.truth.projected_x_px is not None
    assert step.frame.image_bgr.max() < 255


def test_frame_is_cv_ready_and_frontend_payload_is_valid_jpeg() -> None:
    step = Simulation(AppConfig(), StationaryTrajectory(0.0, 0.0)).step()
    frame = step.frame
    assert frame.image_bgr.shape == (480, 640, 3)
    assert frame.image_bgr.dtype == np.uint8
    assert frame.image_bgr.flags.c_contiguous

    jpeg = encode_jpeg(frame)
    decoded = cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert decoded.shape == frame.image_bgr.shape

    payload = frontend_camera_payload(frame, fps=30.0)
    assert payload["frame_index"] == frame.frame_id
    assert payload["camera"]["pan"] == 0.0
    assert payload["frame"]["width"] == 640
    assert base64.b64decode(payload["image_base64"]).startswith(b"\xff\xd8")


def test_detector_packet_never_contains_ground_truth() -> None:
    frame_fields = {field.name for field in fields(FramePacket)}
    assert frame_fields.isdisjoint(
        {
            "beacon_azimuth_rad",
            "beacon_elevation_rad",
            "world_x_m",
            "world_y_m",
            "projected_x_px",
            "projected_y_px",
            "visible",
            "occluded",
        }
    )


def test_opencv_centroid_detector_can_use_disturbed_camera_feed() -> None:
    config = AppConfig(
        simulation=SimulationConfig(seed=19),
        disturbances=DisturbanceConfig(noise=25.0, turbulence=35.0, blur=20.0),
    )
    step = Simulation(config, StationaryTrajectory(0.08, -0.04)).step()
    grayscale = cv2.cvtColor(step.frame.image_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(grayscale, 180, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    beacon_contour = max(contours, key=cv2.contourArea)
    moments = cv2.moments(beacon_contour)
    detected_x = moments["m10"] / moments["m00"]
    detected_y = moments["m01"] / moments["m00"]
    assert step.truth.projected_x_px is not None
    assert step.truth.projected_y_px is not None
    assert detected_x == pytest.approx(step.truth.projected_x_px, abs=4.0)
    assert detected_y == pytest.approx(step.truth.projected_y_px, abs=4.0)
