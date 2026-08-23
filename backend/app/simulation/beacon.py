"""
Beacon Simulation Module
Simulates an optical beacon (FSOC terminal light source) moving through 3D space.
Replaces the role previously split between WorldEngine and TargetConfig.

Trajectory types:
  - STATIONARY  : fixed at initial position
  - LINEAR      : constant velocity at 45° bearing
  - CIRCULAR    : circular orbit at configurable radius
  - SINUSOIDAL  : horizontal sweep with vertical sinusoidal oscillation
  - ERRATIC     : smooth random-walk (waypoint acceleration model)
  - FIGURE8     : Lissajous figure-8 pattern
"""

import math
import random

from app.core.models import BeaconState
from app.core.schemas import TrajectoryType, TargetConfig


class BeaconSimulator:
    """
    Simulates the 2D / 3D world-space position of the optical beacon target.

    The beacon moves in the XY plane at a fixed range Z = 100 m from the
    camera platform.  Units: metres for position, m/s for velocity.
    """

    def __init__(self, config: TargetConfig):
        self.config = config
        self._time: float = 0.0
        self._state = BeaconState()
        self._target_vx: float = 0.0  # for ERRATIC trajectory
        self._target_vy: float = 0.0
        self.reset()

    # ─── Public API ──────────────────────────────────────────────────────────

    def reset(self):
        """Reset beacon to its initial position and zero velocity."""
        self._time = 0.0
        self._target_vx = 0.0
        self._target_vy = 0.0
        self._state = BeaconState(
            x=self.config.initial_x,
            y=self.config.initial_y,
            z=100.0,
            vx=0.0,
            vy=0.0,
            visible=True,
        )

    def step(self, dt: float) -> BeaconState:
        """
        Advance beacon simulation by dt seconds.
        Returns the updated BeaconState.
        """
        self._time += dt
        self._update_position(dt)
        return self._state

    @property
    def state(self) -> BeaconState:
        return self._state

    # ─── Trajectory Logic ─────────────────────────────────────────────────────

    def _update_position(self, dt: float):
        t = self._time
        cfg = self.config
        s = self._state

        traj = cfg.trajectory

        if traj == TrajectoryType.STATIONARY:
            s.x, s.y = cfg.initial_x, cfg.initial_y
            s.vx, s.vy = 0.0, 0.0

        elif traj == TrajectoryType.LINEAR:
            angle = math.radians(45.0)
            s.vx = cfg.speed * math.cos(angle)
            s.vy = cfg.speed * math.sin(angle)
            s.x = cfg.initial_x + s.vx * t
            s.y = cfg.initial_y + s.vy * t

        elif traj == TrajectoryType.CIRCULAR:
            r = max(cfg.radius, 0.1)
            omega = cfg.speed / r           # angular velocity (rad/s)
            s.x = cfg.initial_x + r * math.cos(omega * t)
            s.y = cfg.initial_y + r * math.sin(omega * t)
            s.vx = -r * omega * math.sin(omega * t)
            s.vy = r * omega * math.cos(omega * t)

        elif traj == TrajectoryType.SINUSOIDAL:
            omega = 2.0 * math.pi * cfg.frequency
            s.vx = cfg.speed
            s.x = cfg.initial_x + s.vx * t
            s.y = cfg.initial_y + cfg.radius * math.sin(omega * t)
            s.vy = cfg.radius * omega * math.cos(omega * t)

        elif traj == TrajectoryType.ERRATIC:
            # Random waypoint acceleration: randomly pick a new target velocity
            if random.random() < 0.05:
                angle = random.uniform(0.0, 2.0 * math.pi)
                self._target_vx = cfg.speed * math.cos(angle)
                self._target_vy = cfg.speed * math.sin(angle)
            # Smooth lerp toward target velocity
            alpha = 0.08
            s.vx += (self._target_vx - s.vx) * alpha
            s.vy += (self._target_vy - s.vy) * alpha
            s.x += s.vx * dt
            s.y += s.vy * dt

        else:
            # FIGURE8 / fallback — Lissajous curve
            omega = cfg.speed / max(cfg.radius, 0.1)
            s.x = cfg.initial_x + cfg.radius * math.sin(omega * t)
            s.y = cfg.initial_y + cfg.radius * math.sin(2 * omega * t) / 2.0
            s.vx = cfg.radius * omega * math.cos(omega * t)
            s.vy = cfg.radius * omega * math.cos(2 * omega * t)
