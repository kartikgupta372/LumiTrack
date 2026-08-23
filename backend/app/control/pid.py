"""
PID Controller Module (Modular)
Single-axis discrete-time PID controller with:
  - Anti-windup integral clamping
  - Derivative low-pass filter (alpha = 0.2)
  - Output saturation
  - Reset on demand
"""


class PIDController:
    """
    Discrete-time PID controller for a single axis.

    Args:
        kp:       Proportional gain
        ki:       Integral gain
        kd:       Derivative gain
        dt:       Sample time (seconds)
        out_min:  Minimum output (saturation)
        out_max:  Maximum output (saturation)
        windup:   Integral windup clamp limit
    """

    def __init__(
        self,
        kp: float = 0.15,
        ki: float = 0.01,
        kd: float = 0.02,
        dt: float = 1.0 / 30.0,
        out_min: float = -90.0,
        out_max: float = 90.0,
        windup: float = 50.0,
    ):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.dt = dt
        self.out_min = out_min
        self.out_max = out_max
        self.windup = windup

        self._integral: float = 0.0
        self._prev_error: float = 0.0
        self._prev_derivative: float = 0.0
        self._alpha: float = 0.2   # derivative LPF coefficient

    def reset(self):
        """Clear integrator and derivative memory."""
        self._integral = 0.0
        self._prev_error = 0.0
        self._prev_derivative = 0.0

    def compute(self, error: float) -> float:
        """
        Compute one PID step from error signal.
        Returns the control output (saturated to [out_min, out_max]).
        """
        # Proportional
        p = self.kp * error

        # Integral with windup clamp
        self._integral += error * self.dt
        self._integral = max(-self.windup, min(self.windup, self._integral))
        i = self.ki * self._integral

        # Derivative with low-pass filter
        raw_d = (error - self._prev_error) / max(self.dt, 1e-6)
        d_filtered = self._alpha * raw_d + (1.0 - self._alpha) * self._prev_derivative
        d = self.kd * d_filtered

        self._prev_error = error
        self._prev_derivative = d_filtered

        output = p + i + d
        return max(self.out_min, min(self.out_max, output))
