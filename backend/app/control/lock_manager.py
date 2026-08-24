import math
from typing import Optional
from app.core.schemas import LockState, DetectionResult, TrackState


class LockManager:
    """
    Manages lock acquisition state machine and target retention logic.
    """
    def __init__(self, tolerance_px: float = 20.0, lock_frames_required: int = 10, lost_frames_timeout: int = 15):
        self.tolerance_px = tolerance_px
        self.lock_frames_required = lock_frames_required
        self.lost_frames_timeout = lost_frames_timeout
        self.reset()

    def reset(self):
        self.state = LockState.ACQUIRING
        self.consecutive_in_tolerance = 0
        self.consecutive_missed = 0
        self.first_lock_time: Optional[float] = None
        self.lost_events = 0
        self.successful_recoveries = 0

    def update(self, error_x: float, error_y: float, detection: DetectionResult, sim_time: float) -> LockState:
        total_error = math.sqrt(error_x ** 2 + error_y ** 2)

        if detection.valid:
            self.consecutive_missed = 0
            if total_error <= self.tolerance_px:
                self.consecutive_in_tolerance += 1
            else:
                self.consecutive_in_tolerance = 0

            if self.consecutive_in_tolerance >= self.lock_frames_required:
                if self.state in (LockState.ACQUIRING, LockState.REACQUIRING, LockState.LOST):
                    if self.state in (LockState.REACQUIRING, LockState.LOST):
                        self.successful_recoveries += 1
                    self.state = LockState.LOCKED
                    if self.first_lock_time is None:
                        self.first_lock_time = sim_time
            else:
                if self.state == LockState.LOCKED:
                    self.state = LockState.ACQUIRING
        else:
            self.consecutive_in_tolerance = 0
            self.consecutive_missed += 1

            if self.consecutive_missed > self.lost_frames_timeout:
                if self.state != LockState.LOST:
                    self.lost_events += 1
                self.state = LockState.LOST
            elif self.consecutive_missed > 2:
                self.state = LockState.REACQUIRING

        return self.state
