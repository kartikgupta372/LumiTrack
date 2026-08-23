"""
Gimbal Controller
Computes per-axis PID velocity commands from pixel error (detection → frame center).

Uses two independent PID instances (one per axis) from control/pid.py.
Converts pixel error → angular error (degrees) → PID output → deg/s command.
"""

from app.control.pid import PIDController
from app.core.schemas import PIDConfig, CameraConfig, ControllerType


class GimbalController:
    """
    Dual-axis gimbal velocity controller.

    Wraps two PIDController instances (pan-axis + tilt-axis) and converts
    pixel-space tracking error into deg/s gimbal velocity commands.

    Args:
        pid_config:        PID gains (kp, ki, kd)
        camera_config:     Camera FOV + resolution (for px→deg conversion)
        controller_type:   PID or PROPORTIONAL
        dt:                Control loop sample time (s)
    """

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
        self.dt = dt

        # Pixels per degree for each axis
        self._ppd_x = camera_config.frame_width / camera_config.fov_x
        self._ppd_y = camera_config.frame_height / camera_config.fov_y

        # Saturation limits match camera max rates
        lim = camera_config.max_pan_rate

        self._pid_pan = PIDController(
            kp=pid_config.kp, ki=pid_config.ki, kd=pid_config.kd,
            dt=dt, out_min=-lim, out_max=lim
        )
        self._pid_tilt = PIDController(
            kp=pid_config.kp, ki=pid_config.ki, kd=pid_config.kd,
            dt=dt, out_min=-camera_config.max_tilt_rate, out_max=camera_config.max_tilt_rate
        )

    def reset(self):
        """Clear both PID integrators and derivative memory."""
        self._pid_pan.reset()
        self._pid_tilt.reset()

    def compute(self, error_px_x: float, error_px_y: float):
        """
        Compute pan/tilt velocity commands from pixel error.

        Args:
            error_px_x: horizontal pixel error (positive = beacon right of centre)
            error_px_y: vertical pixel error   (positive = beacon below centre)

        Returns:
            (pan_vel_deg_s, tilt_vel_deg_s)
        """
        # Convert pixel error → angular error (degrees)
        err_pan_deg = error_px_x / self._ppd_x
        err_tilt_deg = -error_px_y / self._ppd_y   # tilt: pixel-down = negative tilt error

        if self.controller_type == ControllerType.PROPORTIONAL:
            pan_vel = self.config.kp * err_pan_deg * self._ppd_x
            tilt_vel = self.config.kp * err_tilt_deg * self._ppd_y
        else:
            pan_vel = self._pid_pan.compute(err_pan_deg)
            tilt_vel = self._pid_tilt.compute(err_tilt_deg)

        return pan_vel, tilt_vel
