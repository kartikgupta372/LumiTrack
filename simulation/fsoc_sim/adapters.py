"""Boundary adapters for perception pipelines and browser frontends."""

from __future__ import annotations

import base64
from math import degrees
from typing import Any

import cv2

from fsoc_sim.models import FramePacket


def encode_jpeg(frame: FramePacket, quality: int = 80) -> bytes:
    """Encode a detector-ready BGR frame as a transport-ready JPEG."""
    if not 1 <= quality <= 100:
        raise ValueError("quality must be between 1 and 100")
    success, jpeg = cv2.imencode(
        ".jpg",
        frame.image_bgr,
        [cv2.IMWRITE_JPEG_QUALITY, quality],
    )
    if not success:
        raise RuntimeError("OpenCV could not encode the camera frame as JPEG")
    return jpeg.tobytes()


def encode_jpeg_base64(frame: FramePacket, quality: int = 80) -> str:
    """Return the bare base64 value expected by the existing React frontend."""
    return base64.b64encode(encode_jpeg(frame, quality)).decode("ascii")


def frontend_camera_payload(
    frame: FramePacket,
    *,
    fps: float,
    jpeg_quality: int = 80,
) -> dict[str, Any]:
    """Return the simulation-owned subset of the dashboard telemetry schema.

    Detection, tracking error, and lock state are intentionally absent; the
    backend can merge those downstream results into this dictionary.  This
    prevents simulated truth from leaking into a detector or tracker.
    """
    return {
        "timestamp": frame.timestamp_seconds,
        "frame_index": frame.frame_id,
        "fps": fps,
        "camera": {
            "pan": degrees(frame.camera_pan_rad),
            "tilt": degrees(frame.camera_tilt_rad),
            "pan_rate": degrees(frame.camera_pan_rate_rad_s),
            "tilt_rate": degrees(frame.camera_tilt_rate_rad_s),
        },
        "frame": {
            "width": int(frame.image_bgr.shape[1]),
            "height": int(frame.image_bgr.shape[0]),
            "encoding": "jpeg",
            "colour_space": "BGR",
            "horizontal_fov_deg": degrees(frame.horizontal_fov_rad),
            "vertical_fov_deg": degrees(frame.vertical_fov_rad),
        },
        "image_base64": encode_jpeg_base64(frame, jpeg_quality),
    }
