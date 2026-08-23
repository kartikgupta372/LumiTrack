"""Fixed-timestep simulation clock."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SimulationTick:
    frame_id: int
    time_seconds: float
    dt_seconds: float


class FixedStepClock:
    """Produces deterministic timestamps independent of wall-clock speed."""

    def __init__(self, fps: float) -> None:
        if fps <= 0.0:
            raise ValueError("fps must be greater than zero")
        self._dt_seconds = 1.0 / fps
        self.reset()

    @property
    def dt_seconds(self) -> float:
        return self._dt_seconds

    @property
    def next_frame_id(self) -> int:
        return self._frame_id

    def reset(self) -> None:
        self._frame_id = 0

    def tick(self) -> SimulationTick:
        tick = SimulationTick(
            frame_id=self._frame_id,
            time_seconds=self._frame_id * self._dt_seconds,
            dt_seconds=self._dt_seconds,
        )
        self._frame_id += 1
        return tick
