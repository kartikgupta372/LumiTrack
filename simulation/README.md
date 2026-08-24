# FSOC PAT Testbed - Group 1 Clean Simulation MVP

This folder contains **Group 1: Simulation and Virtual Camera** for SIH 2026 problem statement 169 / PSC26169.

It generates a deterministic angular world, moves a simulated optical beacon, applies scripted pan/tilt rate commands to a virtual camera, projects the beacon into image coordinates, checks the camera field of view, and renders a clean OpenCV camera frame.

It intentionally does **not** implement detection, tracking, autonomous control, backend/frontend integration, disturbances, YOLO, or 3D visualization.

## Architecture

```text
Trajectory --> BeaconState --+--> Angular projection --> Clean OpenCV frame --> FramePacket
                              |
ControlCommand --> Camera ----+-----------------------------------------------> GroundTruth
                  ^                                                            (separate)
                  |
            FixedStepClock
```

- `FramePacket` is the future Group 2 input and contains legitimate camera metadata only.
- `GroundTruth` is a separate evaluation/debug record and must never be passed to a future detector.
- `ControlCommand` is the future Group 3 input. The demo supplies scripted commands only.

## Project layout

```text
simulation/
  pyproject.toml    Python package and pytest configuration
  requirements.txt Direct Group 1 dependencies
  fsoc_sim/         Canonical Group 1 Python source tree
  tests/            Unit and integration tests
```

## Conventions

- Python 3.12 or newer.
- Radians internally; convert to degrees only in presentation layers.
- Beacon direction is `(azimuth, elevation)`.
- Positive azimuth and camera pan point right.
- Positive elevation and camera tilt point upward.
- Image origin is top-left; image `x` increases right and image `y` increases down.
- The geometric centre is `((width - 1) / 2, (height - 1) / 2)`.
- A beacon exactly on a FOV boundary is visible and maps to the corresponding edge pixel.
- Simulation time is `frame_id * dt`; it never depends on rendering speed or wall-clock timing.
- Commands are rate-limited and integrated for one fixed timestep before that step's frame is generated.
- The simulation seed resets deterministically and is reserved for future seeded scenarios.

## Installation from the repository root

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run the tests

```powershell
.\.venv\Scripts\python.exe -m pytest simulation\tests
```

## Run the demo

The default run generates 180 deterministic frames, an MJPG video, first/last PNGs, and a JSON summary in `demo-output/`:

```powershell
.\.venv\Scripts\python.exe -m fsoc_sim.demo
```

Choose a trajectory or frame count:

```powershell
.\.venv\Scripts\python.exe -m fsoc_sim.demo --trajectory circular --frames 240
```

Add `--display` to show an OpenCV window. Press Escape to stop. Headless mode is preferred for CI and repeatable testing.

## Future integration contracts

### Group 1 to Group 2: `FramePacket`

- Frame ID and simulation timestamp
- BGR image
- Camera pan/tilt
- Horizontal/vertical FOV

It deliberately excludes beacon truth, projected target pixels, and visibility truth.

### Group 3 to Group 1: `ControlCommand`

- Requested pan rate in rad/s
- Requested tilt rate in rad/s

Group 1 clips these rates and camera angles using `CameraConfig`. It does not calculate tracking error or decide the command.

## Clean MVP acceptance criteria

- All four trajectories produce mathematically predictable positions.
- The same configuration, commands, and seed reproduce identical frames and ground truth.
- Camera commands obey rate and angle limits.
- Positive azimuth maps right; positive elevation maps upward in the image.
- Exact FOV boundaries map to edge pixels; targets outside the FOV are not rendered.
- Camera motion changes subsequent generated frames.
- Ground truth remains separate from the future detector input.
