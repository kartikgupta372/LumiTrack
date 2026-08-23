# FSOC PAT Testbed — Group 1 Clean Simulation MVP

This folder contains **Group 1: Simulation and Virtual Camera** for SIH'26 problem statement 169 / PSC26169.

The code generates a deterministic angular world, moves a simulated optical beacon, applies scripted pan/tilt rate commands to a virtual camera, projects the beacon into image coordinates, checks the camera field of view, and renders a clean OpenCV camera frame.

It intentionally does **not** implement detection, tracking, autonomous control, backend/frontend, disturbances, YOLO, or 3D visualization.

## Architecture

```text
Trajectory ──> BeaconState ─┐
                            ├─> Angular projection ─> Clean OpenCV frame ─> FramePacket
ControlCommand ─> Camera ───┘                         └───────────────> GroundTruth (separate)
                  ↑
           FixedStepClock
```

- `FramePacket` is the future Group 2 input. It contains the image and legitimate camera metadata only.
- `GroundTruth` is a separate evaluation/debug record and must never be passed to a future detector.
- `ControlCommand` is the future Group 3 input. The demo supplies scripted commands only; it is not an autonomous controller.

## Project layout

```text
simulation/
  pyproject.toml    Python package and pytest configuration
  requirements.txt Direct Group 1 dependencies
  fsoc_sim/
    camera.py       Pan/tilt dynamics, rate limits and angle limits
    clock.py        Deterministic fixed-timestep clock
    config.py       Validated immutable configuration
    demo.py         Scripted open-loop demonstration
    models.py       Boundary data contracts
    projection.py   Angular direction to image-coordinate projection
    renderer.py     Clean OpenCV frame generation
    simulation.py   Group 1 orchestration
    trajectories.py Stationary, linear, circular and sinusoidal motion
  tests/            Unit and integration tests for the clean MVP
```

## Conventions

- Python 3.12 or newer.
- Radians internally; convert to degrees only in future presentation layers.
- Beacon direction is `(azimuth, elevation)`.
- Positive azimuth and positive camera pan point right.
- Positive elevation and positive camera tilt point upward.
- Image origin is top-left; image `x` increases right and image `y` increases down.
- The geometric centre is `((width - 1) / 2, (height - 1) / 2)`.
- A beacon exactly on a FOV boundary is visible and maps to the corresponding edge pixel.
- Simulation time is `frame_id * dt`; it never depends on rendering speed or wall-clock timing.
- A command is rate-limited and integrated for one fixed timestep before that step's frame is generated.
- A run seed is owned by `Simulation`. It is reset deterministically and is reserved for later seeded scenarios/disturbances.

## Windows setup

Python 3.12.10 is installed for the current Windows user. From PowerShell at the repository root:

```powershell
cd simulation
..\.venv\Scripts\python.exe -m pip install -e ".[test]"
```

Alternatively, activate the environment before entering the folder:

```powershell
.\.venv\Scripts\Activate.ps1
cd simulation
python -m pip install -e ".[test]"
```

## Run the tests

```powershell
..\.venv\Scripts\python.exe -m pytest
```

## Run the demo

The default run generates 180 deterministic frames, an MJPG video, first/last PNGs and a JSON summary in `demo-output/`:

```powershell
..\.venv\Scripts\python.exe -m fsoc_sim.demo
```

Choose a trajectory or frame count:

```powershell
..\.venv\Scripts\python.exe -m fsoc_sim.demo --trajectory circular --frames 240
```

To display the OpenCV window while also writing the artifacts:

```powershell
..\.venv\Scripts\python.exe -m fsoc_sim.demo --display
```

Press Escape to stop the displayed demo. The normal headless form is preferred for CI and repeatable testing.

## Future integration contracts

### Group 1 → Group 2: `FramePacket`

- Frame ID and simulation timestamp
- BGR image
- Camera pan/tilt
- Horizontal/vertical FOV

It deliberately excludes beacon truth, projected target pixels and visibility truth.

### Group 3 → Group 1: `ControlCommand`

- Requested pan rate in rad/s
- Requested tilt rate in rad/s

Group 1 clips these rates and camera angles using `CameraConfig`. It does not calculate tracking error or decide the command.

## Clean MVP acceptance criteria

- All four trajectories produce mathematically predictable positions.
- Same configuration, command sequence and seed reproduce identical frames and ground truth.
- Camera commands obey rate and angle limits.
- Positive azimuth maps right; positive elevation maps upward in the image.
- Exact FOV boundaries map to edge pixels; targets outside the FOV are not rendered.
- Camera motion changes subsequent generated frames.
- Ground truth remains separate from the future detector input.
