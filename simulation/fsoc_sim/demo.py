"""Runnable Group 1 demo using scripted camera-rate commands."""

from __future__ import annotations

import argparse
import json
from math import pi
from pathlib import Path

import cv2

from fsoc_sim.config import AppConfig, CameraConfig, SimulationConfig
from fsoc_sim.models import ControlCommand
from fsoc_sim.simulation import Simulation
from fsoc_sim.trajectories import CircularTrajectory, LinearTrajectory, SinusoidalTrajectory, StationaryTrajectory


def _trajectory(name: str):
    if name == "stationary":
        return StationaryTrajectory(azimuth_rad=0.16, elevation_rad=0.08)
    if name == "linear":
        return LinearTrajectory(
            initial_azimuth_rad=-0.18,
            initial_elevation_rad=0.08,
            azimuth_rate_rad_s=0.035,
            elevation_rate_rad_s=-0.008,
        )
    if name == "circular":
        return CircularTrajectory(
            centre_azimuth_rad=0.05,
            centre_elevation_rad=0.02,
            azimuth_radius_rad=0.16,
            elevation_radius_rad=0.10,
            frequency_hz=0.08,
        )
    return SinusoidalTrajectory(
        centre_azimuth_rad=0.04,
        centre_elevation_rad=0.01,
        azimuth_amplitude_rad=0.20,
        elevation_amplitude_rad=0.10,
        azimuth_frequency_hz=0.08,
        elevation_frequency_hz=0.12,
    )


def _scripted_command(frame_id: int, fps: float) -> ControlCommand:
    """Manual open-loop camera motion; this is not an autonomous controller."""
    time_seconds = frame_id / fps
    if time_seconds < 2.0:
        return ControlCommand(pan_rate_rad_s=0.05, tilt_rate_rad_s=0.025)
    if time_seconds < 4.0:
        return ControlCommand(pan_rate_rad_s=-0.025, tilt_rate_rad_s=-0.015)
    return ControlCommand()


def run_demo(
    output_dir: Path,
    frames: int,
    trajectory_name: str,
    display: bool,
) -> dict[str, object]:
    config = AppConfig(
        simulation=SimulationConfig(fps=30.0, seed=169),
        camera=CameraConfig(
            horizontal_fov_rad=60.0 * pi / 180.0,
            vertical_fov_rad=45.0 * pi / 180.0,
            initial_pan_rad=-0.08,
            initial_tilt_rad=-0.04,
        ),
    )
    simulation = Simulation(config, _trajectory(trajectory_name))
    output_dir.mkdir(parents=True, exist_ok=True)
    video_path = output_dir / "fsoc_group1_demo.avi"
    writer = cv2.VideoWriter(
        str(video_path),
        cv2.VideoWriter_fourcc(*"MJPG"),
        config.simulation.fps,
        (config.camera.width_px, config.camera.height_px),
    )
    if not writer.isOpened():
        raise RuntimeError("OpenCV could not open the MJPG video writer")

    first_step = None
    last_step = None
    visible_frames = 0
    try:
        for frame_id in range(frames):
            step = simulation.step(_scripted_command(frame_id, config.simulation.fps))
            first_step = first_step or step
            last_step = step
            visible_frames += int(step.truth.visible)
            writer.write(step.frame.image_bgr)
            if display:
                cv2.imshow("FSOC Group 1 - clean deterministic simulation", step.frame.image_bgr)
                if cv2.waitKey(max(1, int(1000 / config.simulation.fps))) & 0xFF == 27:
                    break
    finally:
        writer.release()
        if display:
            cv2.destroyAllWindows()

    assert first_step is not None and last_step is not None
    first_path = output_dir / "first_frame.png"
    last_path = output_dir / "last_frame.png"
    cv2.imwrite(str(first_path), first_step.frame.image_bgr)
    cv2.imwrite(str(last_path), last_step.frame.image_bgr)

    summary = {
        "trajectory": trajectory_name,
        "requested_frames": frames,
        "generated_frames": last_step.frame.frame_id + 1,
        "visible_frames": visible_frames,
        "seed": config.simulation.seed,
        "fps": config.simulation.fps,
        "first_camera_pan_rad": first_step.frame.camera_pan_rad,
        "last_camera_pan_rad": last_step.frame.camera_pan_rad,
        "video": str(video_path),
        "first_frame": str(first_path),
        "last_frame": str(last_path),
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames", type=int, default=180)
    parser.add_argument(
        "--trajectory",
        choices=("stationary", "linear", "circular", "sinusoidal"),
        default="sinusoidal",
    )
    parser.add_argument("--output", type=Path, default=Path("demo-output"))
    parser.add_argument("--display", action="store_true", help="Show an OpenCV window; Escape stops it")
    args = parser.parse_args()
    if args.frames <= 0:
        parser.error("--frames must be greater than zero")
    summary = run_demo(args.output, args.frames, args.trajectory, args.display)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
