import time
import math


class MetricsCollector:
    def __init__(self):
        self.error_history = []

        self.start_time = None
        self.lock_time = None

        self.frame_count = 0
        self.last_frame_time = None

    def update(
        self,
        error_x: float,
        error_y: float,
        locked: bool
    ):
        # Calculate tracking error magnitude
        error = math.sqrt(
            error_x ** 2 +
            error_y ** 2
        )

        self.error_history.append(error)

        # Count processed frames
        self.frame_count += 1

        # Start timer
        if self.start_time is None:
            self.start_time = time.perf_counter()

        # Record first lock
        if locked and self.lock_time is None:
            self.lock_time = time.perf_counter()

    def get_average_error(self):
        if not self.error_history:
            return 0.0

        return sum(self.error_history) / len(self.error_history)

    def get_max_error(self):
        if not self.error_history:
            return 0.0

        return max(self.error_history)

    def get_acquisition_time(self):
        if self.start_time is None or self.lock_time is None:
            return 0.0

        return self.lock_time - self.start_time


    def get_fps(self):
        if self.start_time is None:
            return 0.0

        elapsed = time.perf_counter() - self.start_time

        if elapsed <= 0:
            return 0.0

        return self.frame_count / elapsed


    def reset(self):
        self.error_history.clear()

        self.start_time = None
        self.lock_time = None

        self.frame_count = 0
        self.last_frame_time = None