"""
services/engine.py — Simulation Engine Service Layer

Wraps ModularSimEngine (simulation/engine.py) to provide:
  - running / paused state management
  - WebSocket listener registration
  - HITL serial driver integration
  - Async-compatible step loop
"""

from typing import Optional, List, Callable

from app.core.schemas import ScenarioConfig, TelemetryFrame, PerformanceMetrics
from app.simulation.engine import ModularSimEngine
from app.services.serial_driver import SerialGimbalDriver


class SimulationEngine:
    """
    Top-level service wrapper for the LumiTrack SIL simulation.

    All closed-loop physics and control logic lives in ModularSimEngine.
    This class only manages lifecycle (start/pause/resume/stop/reset),
    telemetry listeners, and optional HITL serial forwarding.
    """

    def __init__(
        self,
        config: Optional[ScenarioConfig] = None,
        serial_driver: Optional[SerialGimbalDriver] = None,
    ):
        self.config = config or ScenarioConfig()
        self.running = False
        self.paused = False
        self.serial_driver: Optional[SerialGimbalDriver] = serial_driver
        self._listeners: List[Callable[[TelemetryFrame], None]] = []

        # Inner modular engine — all heavy lifting happens here
        self._sim = ModularSimEngine(self.config)

        # Telemetry history buffer for PDF report generation (avoiding HTTP spam)
        self._telemetry_history = {
            "errors_px": [],
            "pan_angles": [],
            "tilt_angles": [],
            "timestamps": []
        }

    # ─── Lifecycle ─────────────────────────────────────────────────────────────

    def reconfigure(self, config: ScenarioConfig):
        """Apply a new scenario configuration (resets simulation state)."""
        self.config = config
        self._sim.reconfigure(config)

    def reset(self):
        """Reset simulation counters, physics, and tracker."""
        self._sim.reset()
        self._telemetry_history["errors_px"].clear()
        self._telemetry_history["pan_angles"].clear()
        self._telemetry_history["tilt_angles"].clear()
        self._telemetry_history["timestamps"].clear()

    def start(self):
        self.running = True
        self.paused = False

    def pause(self):
        self.paused = True

    def resume(self):
        self.paused = False

    def stop(self):
        self.running = False
        self.paused = False

    # ─── Telemetry Listeners ───────────────────────────────────────────────────

    def add_telemetry_listener(self, callback: Callable[[TelemetryFrame], None]):
        self._listeners.append(callback)

    def remove_telemetry_listener(self, callback: Callable[[TelemetryFrame], None]):
        self._listeners.discard(callback) if hasattr(self._listeners, 'discard') else None

    # ─── Step ──────────────────────────────────────────────────────────────────

    def step(self) -> TelemetryFrame:
        """
        Execute one simulation step via ModularSimEngine.
        Forwards gimbal commands to HITL serial driver if connected.
        """
        frame = self._sim.step()

        # Record to history buffer for PDF report generation
        self._telemetry_history["errors_px"].append(frame.total_error_px)
        self._telemetry_history["pan_angles"].append(frame.camera.pan)
        self._telemetry_history["tilt_angles"].append(frame.camera.tilt)
        self._telemetry_history["timestamps"].append(frame.timestamp)

        # HITL: Forward pan/tilt to physical hardware when connected
        if self.serial_driver and self.serial_driver.is_connected:
            self.serial_driver.send(
                self._sim.gimbal.pan,
                self._sim.gimbal.tilt,
            )

        # Notify all WebSocket listeners
        for cb in self._listeners:
            try:
                cb(frame)
            except Exception:
                pass

        return frame

    # ─── Metrics Proxy ─────────────────────────────────────────────────────────

    @property
    def evaluator(self):
        """Expose evaluator so routes.py can call evaluator.get_metrics()."""
        return self._sim.evaluator

    @property
    def telemetry_history(self):
        return self._telemetry_history
