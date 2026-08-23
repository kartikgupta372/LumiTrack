"""Virtual pan-tilt camera dynamics."""

from __future__ import annotations

from dataclasses import replace

import numpy as np

from fsoc_sim.config import CameraConfig
from fsoc_sim.models import CameraState, ControlCommand


class VirtualCamera:
    def __init__(self, config: CameraConfig) -> None:
        self.config = config
        self.reset()

    @property
    def state(self) -> CameraState:
        return self._state

    def reset(self) -> None:
        self._state = CameraState(
            pan_rad=self.config.initial_pan_rad,
            tilt_rad=self.config.initial_tilt_rad,
        )

    def apply(self, command: ControlCommand, dt_seconds: float) -> ControlCommand:
        """Rate-limit a command, integrate it, and enforce angle limits."""
        if dt_seconds <= 0.0:
            raise ValueError("dt_seconds must be greater than zero")

        pan_rate = float(
            np.clip(
                command.pan_rate_rad_s,
                -self.config.max_pan_rate_rad_s,
                self.config.max_pan_rate_rad_s,
            )
        )
        tilt_rate = float(
            np.clip(
                command.tilt_rate_rad_s,
                -self.config.max_tilt_rate_rad_s,
                self.config.max_tilt_rate_rad_s,
            )
        )
        self._state = replace(
            self._state,
            pan_rad=float(
                np.clip(
                    self._state.pan_rad + pan_rate * dt_seconds,
                    self.config.min_pan_rad,
                    self.config.max_pan_rad,
                )
            ),
            tilt_rad=float(
                np.clip(
                    self._state.tilt_rad + tilt_rate * dt_seconds,
                    self.config.min_tilt_rad,
                    self.config.max_tilt_rad,
                )
            ),
        )
        return ControlCommand(pan_rate_rad_s=pan_rate, tilt_rate_rad_s=tilt_rate)
