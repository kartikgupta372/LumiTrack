import numpy as np
from typing import Tuple
from app.core.schemas import PIDConfig, ControllerType, CameraConfig


class PIDController:
    """
    Proportional-Integral-Derivative (PID) Controller for Pan-Tilt Gimbal Alignment.
    Converts image-space pixel error (target position - frame center) into angular velocity commands (deg/s).
    """
    def __init__(self, pid_config: PIDConfig, camera_config: CameraConfig, controller_type: ControllerType = ControllerType.PID):
        self.pid_config = pid_config
        self.camera_config = camera_config
        self.controller_type = controller_type
        self.reset()

    def reset(self):
        self.integral_x = 0.0
        self.integral_y = 0.0
        self.prev_error_x = 0.0
        self.prev_error_y = 0.0

    def compute(self, target_x: float, target_y: float, dt: float) -> Tuple[float, float, float, float]:
        """
        Computes control velocities (pan_rate_deg_s, tilt_rate_deg_s) and errors.
        Frame Center: (W/2, H/2).
        """
        cx = self.camera_config.frame_width / 2.0
        cy = self.camera_config.frame_height / 2.0

        # Pixel Errors (target relative to frame center)
        error_x = target_x - cx
        error_y = cy - target_y # invert Y so positive error moves tilt up

        kp = self.pid_config.kp
        ki = self.pid_config.ki if self.controller_type == ControllerType.PID else 0.0
        kd = self.pid_config.kd if self.controller_type == ControllerType.PID else 0.0

        # Proportional term
        p_x = kp * error_x
        p_y = kp * error_y

        # Integral term with anti-windup clamping
        self.integral_x += error_x * dt
        self.integral_y += error_y * dt
        max_integral = 50.0
        self.integral_x = float(np.clip(self.integral_x, -max_integral, max_integral))
        self.integral_y = float(np.clip(self.integral_y, -max_integral, max_integral))

        i_x = ki * self.integral_x
        i_y = ki * self.integral_y

        # Derivative term
        d_x = kd * (error_x - self.prev_error_x) / dt if dt > 0 else 0.0
        d_y = kd * (error_y - self.prev_error_y) / dt if dt > 0 else 0.0

        self.prev_error_x = error_x
        self.prev_error_y = error_y

        # Total control output in deg/s
        pan_rate = p_x + i_x + d_x
        tilt_rate = p_y + i_y + d_y

        # Saturate output rates to camera hardware limits
        max_pan = self.camera_config.max_pan_rate
        max_tilt = self.camera_config.max_tilt_rate

        pan_rate = float(np.clip(pan_rate, -max_pan, max_pan))
        tilt_rate = float(np.clip(tilt_rate, -max_tilt, max_tilt))

        return pan_rate, tilt_rate, error_x, error_y
