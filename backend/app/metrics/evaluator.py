import time
import json
import csv
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.schemas import PerformanceMetrics, LockState, ScenarioConfig


class PerformanceEvaluator:
    """
    Computes real-time and cumulative simulation performance metrics:
    - Initial Acquisition Time
    - Mean & Max Tracking Error (px & degrees)
    - Lock Retention Rate (%)
    - Frame processing latency
    """
    def __init__(self, scenario_config: ScenarioConfig):
        self.config = scenario_config
        self.reset()

    def reset(self):
        self.start_time = time.time()
        self.frame_count = 0
        self.locked_frame_count = 0
        self.errors_px: List[float] = []
        self.errors_deg: List[float] = []
        self.latencies_ms: List[float] = []
        self.first_lock_time: Optional[float] = None
        self.lost_events = 0
        self.successful_recoveries = 0

    def record_frame(
        self,
        error_px: float,
        error_deg: float,
        lock_state: LockState,
        latency_ms: float,
        sim_time: float,
        lost_count: int,
        recovery_count: int
    ):
        self.frame_count += 1
        self.errors_px.append(error_px)
        self.errors_deg.append(error_deg)
        self.latencies_ms.append(latency_ms)
        self.lost_events = lost_count
        self.successful_recoveries = recovery_count

        if lock_state == LockState.LOCKED:
            self.locked_frame_count += 1
            if self.first_lock_time is None:
                self.first_lock_time = sim_time

    def get_metrics(self) -> PerformanceMetrics:
        elapsed = time.time() - self.start_time
        effective_fps = self.frame_count / elapsed if elapsed > 0 else 0.0

        avg_err_px = float(np.mean(self.errors_px)) if self.errors_px else 0.0
        max_err_px = float(np.max(self.errors_px)) if self.errors_px else 0.0
        avg_err_deg = float(np.mean(self.errors_deg)) if self.errors_deg else 0.0

        lock_retention = (self.locked_frame_count / self.frame_count * 100.0) if self.frame_count > 0 else 0.0
        avg_latency = float(np.mean(self.latencies_ms)) if self.latencies_ms else 0.0

        return PerformanceMetrics(
            simulation_duration_s=round(elapsed, 2),
            processed_frames=self.frame_count,
            effective_fps=round(effective_fps, 1),
            acquisition_time_s=round(self.first_lock_time, 2) if self.first_lock_time is not None else None,
            average_error_px=round(avg_err_px, 2),
            max_error_px=round(max_err_px, 2),
            average_error_deg=round(avg_err_deg, 3),
            lock_retention_rate=round(lock_retention, 1),
            lost_target_events=self.lost_events,
            successful_recoveries=self.successful_recoveries,
            avg_processing_latency_ms=round(avg_latency, 2)
        )

    def export_csv(self, filepath: str):
        with open(filepath, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Frame", "Error_PX", "Error_DEG", "Latency_MS"])
            for idx, (epx, edeg, lat) in enumerate(zip(self.errors_px, self.errors_deg, self.latencies_ms)):
                writer.writerow([idx + 1, round(epx, 2), round(edeg, 3), round(lat, 2)])

    def export_json(self, filepath: str):
        metrics = self.get_metrics()
        data = {
            "scenario": self.config.model_dump(),
            "metrics": metrics.model_dump()
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
