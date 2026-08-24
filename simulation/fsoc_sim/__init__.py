"""Deterministic virtual-camera simulation for the FSOC coarse-PAT testbed."""

from fsoc_sim.adapters import encode_jpeg, encode_jpeg_base64, frontend_camera_payload
from fsoc_sim.config import (
    AppConfig,
    BeaconRenderConfig,
    CameraConfig,
    DisturbanceConfig,
    SimulationConfig,
)
from fsoc_sim.models import ControlCommand, FramePacket, GroundTruth, SimulationStep
from fsoc_sim.simulation import Simulation
from fsoc_sim.trajectories import (
    CircularTrajectory,
    ErraticTrajectory,
    FigureEightTrajectory,
    LinearTrajectory,
    SinusoidalTrajectory,
    StationaryTrajectory,
    TrajectoryType,
    create_trajectory,
)

__all__ = [
    "AppConfig",
    "BeaconRenderConfig",
    "CameraConfig",
    "CircularTrajectory",
    "ControlCommand",
    "DisturbanceConfig",
    "ErraticTrajectory",
    "FramePacket",
    "FigureEightTrajectory",
    "GroundTruth",
    "LinearTrajectory",
    "Simulation",
    "SimulationConfig",
    "SimulationStep",
    "SinusoidalTrajectory",
    "StationaryTrajectory",
    "TrajectoryType",
    "create_trajectory",
    "encode_jpeg",
    "encode_jpeg_base64",
    "frontend_camera_payload",
]
