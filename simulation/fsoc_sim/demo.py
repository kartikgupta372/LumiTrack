"""Runnable Group 1 demo using scripted camera-rate commands."""

from __future__ import annotations

import argparse
import json
from math import pi
from pathlib import Path

import cv2

from fsoc_sim.adapters import frontend_camera_payload
from fsoc_sim.config import AppConfig, CameraConfig, DisturbanceConfig, SimulationConfig
from fsoc_sim.models import ControlCommand
from fsoc_sim.simulation import Simulation
from fsoc_sim.trajectories import TrajectoryType, create_trajectory


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
    disturbances: DisturbanceConfig | None = None,
) -> dict[str, object]:
    config = AppConfig(
        simulation=SimulationConfig(fps=30.0, seed=169),
        camera=CameraConfig(
            horizontal_fov_rad=60.0 * pi / 180.0,
            vertical_fov_rad=45.0 * pi / 180.0,
            initial_pan_rad=-0.08,
            initial_tilt_rad=-0.04,
        ),
        disturbances=disturbances or DisturbanceConfig(),
    )
    simulation = Simulation(
        config,
        create_trajectory(trajectory_name, seed=config.simulation.seed),
    )
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
    truth_records: list[dict[str, object]] = []
    try:
        for frame_id in range(frames):
            step = simulation.step(_scripted_command(frame_id, config.simulation.fps))
            first_step = first_step or step
            last_step = step
            visible_frames += int(step.truth.visible)
            truth_records.append(
                {
                    "frame_id": step.truth.frame_id,
                    "timestamp_seconds": step.truth.timestamp_seconds,
                    "world_x_m": step.truth.world_x_m,
                    "world_y_m": step.truth.world_y_m,
                    "world_z_m": step.truth.world_z_m,
                    "velocity_x_m_s": step.truth.velocity_x_m_s,
                    "velocity_y_m_s": step.truth.velocity_y_m_s,
                    "in_fov": step.truth.in_fov,
                    "occluded": step.truth.occluded,
                    "visible": step.truth.visible,
                    "projected_x_px": step.truth.projected_x_px,
                    "projected_y_px": step.truth.projected_y_px,
                }
            )
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
    frontend_payload_path = output_dir / "frontend_camera_payload.json"
    frontend_payload_path.write_text(
        json.dumps(frontend_camera_payload(last_step.frame, fps=config.simulation.fps), indent=2),
        encoding="utf-8",
    )
    truth_path = output_dir / "ground_truth.jsonl"
    truth_path.write_text(
        "".join(json.dumps(record, separators=(",", ":")) + "\n" for record in truth_records),
        encoding="utf-8",
    )

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
        "frontend_camera_payload": str(frontend_payload_path),
        "ground_truth": str(truth_path),
        "disturbances": {
            "noise": config.disturbances.noise,
            "vibration": config.disturbances.vibration,
            "turbulence": config.disturbances.turbulence,
            "blur": config.disturbances.blur,
            "occlusion": config.disturbances.occlusion,
        },
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames", type=int, default=180)
    parser.add_argument(
        "--trajectory",
        choices=tuple(item.value for item in TrajectoryType) + ("all",),
        default="sinusoidal",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "demo-output",
    )
    parser.add_argument("--noise", type=float, default=0.0)
    parser.add_argument("--vibration", type=float, default=0.0)
    parser.add_argument("--turbulence", type=float, default=0.0)
    parser.add_argument("--blur", type=float, default=0.0)
    parser.add_argument("--occlusion", action="store_true")
    parser.add_argument("--display", action="store_true", help="Show an OpenCV window; Escape stops it")
    args = parser.parse_args()
    if args.frames <= 0:
        parser.error("--frames must be greater than zero")
    try:
        disturbances = DisturbanceConfig(
            noise=args.noise,
            vibration=args.vibration,
            turbulence=args.turbulence,
            blur=args.blur,
            occlusion=args.occlusion,
            occlusion_start_s=2.0,
            occlusion_duration_s=2.0,
        )
    except ValueError as error:
        parser.error(str(error))
    if args.trajectory == "all":
        summary = {
            item.value: run_demo(
                args.output / item.value,
                args.frames,
                item.value,
                args.display,
                disturbances,
            )
            for item in TrajectoryType
        }
    else:
        summary = run_demo(
            args.output,
            args.frames,
            args.trajectory,
            args.display,
            disturbances,
        )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
