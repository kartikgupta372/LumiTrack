"""Proportional and PID gimbal controllers used by LumiTrack."""

from app.control.pid import PIDController
from app.core.schemas import CameraConfig, ControllerType, PIDConfig


class PController:
    """Compatibility controller for the legacy state service."""

    def __init__(self, kp: float = 0.1):
        self.kp = kp

    def calculate(self, error_x: float, error_y: float):
        return self.kp * error_x, self.kp * error_y


class GimbalController:
    """Dual-axis controller converting pixel errors into gimbal rates."""

    def __init__(
        self,
        pid_config: PIDConfig,
        camera_config: CameraConfig,
        controller_type: ControllerType = ControllerType.PID,
        dt: float = 1.0 / 30.0,
    ):
        self.config = pid_config
        self.camera = camera_config
        self.controller_type = controller_type
        self._ppd_x = camera_config.frame_width / camera_config.fov_x
        self._ppd_y = camera_config.frame_height / camera_config.fov_y
        self._pid_pan = PIDController(
            kp=pid_config.kp,
            ki=pid_config.ki,
            kd=pid_config.kd,
            dt=dt,
            out_min=-camera_config.max_pan_rate,
            out_max=camera_config.max_pan_rate,
        )
        self._pid_tilt = PIDController(
            kp=pid_config.kp,
            ki=pid_config.ki,
            kd=pid_config.kd,
            dt=dt,
            out_min=-camera_config.max_tilt_rate,
            out_max=camera_config.max_tilt_rate,
        )

    def reset(self):
        self._pid_pan.reset()
        self._pid_tilt.reset()

    def compute(self, error_px_x: float, error_px_y: float):
        err_pan_deg = error_px_x / self._ppd_x
        err_tilt_deg = -error_px_y / self._ppd_y
        if self.controller_type == ControllerType.PROPORTIONAL:
            return (
                self.config.kp * err_pan_deg * self._ppd_x,
                self.config.kp * err_tilt_deg * self._ppd_y,
            )
        return self._pid_pan.compute(err_pan_deg), self._pid_tilt.compute(err_tilt_deg)
