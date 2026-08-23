"""
Simulation Engine (v2 — Modular)
Orchestrates the closed-loop SIL pipeline using the new modular components:

  BeaconSimulator → PanTiltGimbal → EnvironmentEngine →
  VisionDetector → KalmanTracker → GimbalController →
  LockManager → Telemetry

This file lives in app/simulation/ and is imported by services/engine.py.
"""

import math
import base64
import time as _time
from typing import Optional

import cv2
import numpy as np

from app.core.schemas import (
    ScenarioConfig, TelemetryFrame, LockState,
    BeaconWorldState, CameraState as CameraStateSchema,
    DetectionResult as DetectionResultSchema, TrackState,
)
from app.simulation.beacon import BeaconSimulator
from app.simulation.environment import EnvironmentEngine
from app.control.pan_tilt import PanTiltGimbal
from app.control.controller import GimbalController
from app.control.lock_manager import LockManager
from app.vision.detector import get_detector
from app.tracking.kalman import KalmanTracker
from app.metrics.evaluator import PerformanceEvaluator


class ModularSimEngine:
    """
    Modular closed-loop simulation engine (v2).
    Drop-in replacement for the original SimulationEngine in services/engine.py.

    Uses the new modular components:
      - BeaconSimulator  (replaces WorldEngine)
      - PanTiltGimbal    (replaces VirtualCamera)
      - EnvironmentEngine (replaces DisturbanceEngine)
      - GimbalController  (replaces PIDController)
    """

    def __init__(self, config: Optional[ScenarioConfig] = None):
        self.config = config or ScenarioConfig()
        self._build_components()
        self.reset()

    # ─── Lifecycle ─────────────────────────────────────────────────────────────

    def _build_components(self):
        cfg = self.config
        dt = 1.0 / cfg.fps

        self.beacon = BeaconSimulator(cfg.target)
        self.gimbal = PanTiltGimbal(cfg.camera)
        self.env = EnvironmentEngine(cfg.disturbances)
        self.detector = get_detector(cfg.detector_type)
        self.tracker = KalmanTracker(dt=dt)
        self.controller = GimbalController(cfg.pid, cfg.camera, cfg.controller_type, dt=dt)
        self.lock_mgr = LockManager(tolerance_px=cfg.lock_tolerance_px)
        self.evaluator = PerformanceEvaluator(cfg)

    def reconfigure(self, config: ScenarioConfig):
        self.config = config
        self._build_components()
        self.reset()

    def reset(self):
        self.frame_index = 0
        self.sim_time = 0.0
        self.beacon.reset()
        self.gimbal.reset()
        self.tracker.reset()
        self.controller.reset()
        self.lock_mgr.reset()
        self.evaluator.reset()

    # ─── Single Step ───────────────────────────────────────────────────────────

    def step(self) -> TelemetryFrame:
        """
        Advance the simulation by one frame (dt = 1/fps).
        Returns a TelemetryFrame with all data needed for WebSocket broadcast.
        """
        t0 = _time.time()
        dt = 1.0 / self.config.fps
        self.sim_time += dt

        # ── 1. Advance beacon position ─────────────────────────────────────
        beacon_model = self.beacon.step(dt)

        # ── 2. Apply gimbal vibration to orientation ───────────────────────
        pan_d, tilt_d = self.gimbal.pan, self.gimbal.tilt
        pan_d, tilt_d = self.env.apply_vibration(pan_d, tilt_d)

        # ── 3. Project beacon to image pixel coords ────────────────────────
        beacon_u, beacon_v, in_fov = self.gimbal.project(beacon_model)

        # ── 4. Render synthetic frame ──────────────────────────────────────
        raw_frame = self.gimbal.render(beacon_u, beacon_v, self.config.target.size_radius)

        # ── 5. Apply environmental disturbances ────────────────────────────
        frame, occluded = self.env.apply_to_frame(raw_frame, self.frame_index)

        # Mask beacon if occluded or out of FOV
        if occluded or not in_fov:
            frame[:] = (8, 8, 8)

        # ── 6. Detect beacon in frame ──────────────────────────────────────
        detection = self.detector.detect(frame)
        det_schema = DetectionResultSchema(
            valid=detection.valid,
            x=detection.x,
            y=detection.y,
            confidence=detection.confidence,
            bbox=detection.bbox,
        )

        # ── 7. Kalman predict + update ─────────────────────────────────────
        # KalmanTracker.update() expects (DetectionResult, LockState)
        current_lock = self.lock_mgr.state
        track = self.tracker.update(det_schema, current_lock)

        track_schema = TrackState(
            x=float(track.x),
            y=float(track.y),
            vx=float(track.vx),
            vy=float(track.vy),
            predicted=track.predicted,
            lock_state=current_lock,
        )

        # ── 8. Compute tracking error ──────────────────────────────────────
        cx = self.config.camera.frame_width / 2.0
        cy = self.config.camera.frame_height / 2.0

        if self.tracker.initialized:
            error_x = track.x - cx
            error_y = track.y - cy
        else:
            error_x, error_y = 0.0, 0.0

        total_error_px = math.sqrt(error_x ** 2 + error_y ** 2)
        ppd = self.config.camera.frame_width / self.config.camera.fov_x
        total_error_deg = total_error_px / ppd if ppd > 0 else 0.0

        # ── 9. Gimbal control (only when tracker is initialised) ───────────
        if self.tracker.initialized:
            pan_vel, tilt_vel = self.controller.compute(error_x, error_y)
        else:
            pan_vel, tilt_vel = 0.0, 0.0

        self.gimbal.drive(pan_vel, tilt_vel, dt)

        # ── 10. Lock state machine ─────────────────────────────────────────
        lock_state = self.lock_mgr.update(error_x, error_y, det_schema, self.sim_time)

        # ── 11. Performance evaluation ────────────────────────────────────
        latency_ms = (_time.time() - t0) * 1000.0
        self.evaluator.record_frame(
            total_error_px,
            total_error_deg,
            lock_state,
            latency_ms,
            self.sim_time,
            self.lock_mgr.lost_events,
            self.lock_mgr.successful_recoveries,
        )

        # ── 12. Encode frame as JPEG base64 ───────────────────────────────
        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        img_b64 = base64.b64encode(jpeg).decode('utf-8')

        # Build Pydantic-compatible beacon world state
        beacon_world = BeaconWorldState(
            x=beacon_model.x,
            y=beacon_model.y,
            vx=beacon_model.vx,
            vy=beacon_model.vy,
            visible=beacon_model.visible,
        )

        self.frame_index += 1

        return TelemetryFrame(
            timestamp=self.sim_time,
            frame_index=self.frame_index,
            beacon_world=beacon_world,
            camera=self.gimbal.get_state(),
            detection=det_schema,
            track=track_schema,
            error_x=error_x,
            error_y=error_y,
            total_error_px=round(total_error_px, 3),
            total_error_deg=round(total_error_deg, 5),
            fps=round(1.0 / max(latency_ms / 1000.0, 1e-6), 1),
            lock_state=lock_state,
            acquisition_time_s=self.evaluator.get_metrics().acquisition_time_s,
            image_base64=img_b64,
        )
