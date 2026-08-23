import math
import random
from typing import Tuple
from app.core.schemas import TrajectoryType, TargetConfig, BeaconWorldState


class WorldEngine:
    """
    Simulates the 2D world space containing the moving optical beacon target.
    Coordinates are centered at (0, 0) in meters.
    """
    def __init__(self, config: TargetConfig):
        self.config = config
        self.reset()

    def reset(self):
        self.time = 0.0
        self.x = self.config.initial_x
        self.y = self.config.initial_y
        self.vx = 0.0
        self.vy = 0.0
        self.visible = True
        
        # Internal state for random erratic trajectories
        self.target_vx = 0.0
        self.target_vy = 0.0

    def update(self, dt: float) -> BeaconWorldState:
        self.time += dt
        t = self.time
        cfg = self.config

        if cfg.trajectory == TrajectoryType.STATIONARY:
            self.x = cfg.initial_x
            self.y = cfg.initial_y
            self.vx = 0.0
            self.vy = 0.0

        elif cfg.trajectory == TrajectoryType.LINEAR:
            # Constant velocity vector along 45-degree direction
            v = cfg.speed
            self.vx = v * math.cos(math.pi / 4)
            self.vy = v * math.sin(math.pi / 4)
            self.x = cfg.initial_x + self.vx * t
            self.y = cfg.initial_y + self.vy * t

        elif cfg.trajectory == TrajectoryType.CIRCULAR:
            # Circular path: x = r * cos(w*t), y = r * sin(w*t)
            omega = cfg.speed / max(cfg.radius, 1.0)
            self.x = cfg.initial_x + cfg.radius * math.cos(omega * t)
            self.y = cfg.initial_y + cfg.radius * math.sin(omega * t)
            self.vx = -cfg.radius * omega * math.sin(omega * t)
            self.vy = cfg.radius * omega * math.cos(omega * t)

        elif cfg.trajectory == TrajectoryType.SINUSOIDAL:
            # Move horizontally at constant speed, oscillate vertically
            omega = 2 * math.pi * cfg.frequency
            self.vx = cfg.speed
            self.x = cfg.initial_x + self.vx * t
            self.y = cfg.initial_y + cfg.radius * math.sin(omega * t)
            self.vy = cfg.radius * omega * math.cos(omega * t)

        elif cfg.trajectory == TrajectoryType.ERRATIC:
            # Smooth random walk / waypoint acceleration
            if random.random() < 0.05:
                angle = random.uniform(0, 2 * math.pi)
                self.target_vx = cfg.speed * math.cos(angle)
                self.target_vy = cfg.speed * math.sin(angle)
            
            # Smooth lerp to target velocity
            self.vx += (self.target_vx - self.vx) * 0.1
            self.vy += (self.target_vy - self.vy) * 0.1
            self.x += self.vx * dt
            self.y += self.vy * dt

        return BeaconWorldState(
            x=self.x,
            y=self.y,
            vx=self.vx,
            vy=self.vy,
            visible=self.visible
        )
