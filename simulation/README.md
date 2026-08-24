# FSOC PAT Virtual Camera Simulation

This folder is the self-contained software-in-the-loop simulation and virtual
camera source for the FSOC coarse Pointing, Acquisition, and Tracking system.
It produces deterministic target motion, a steerable pan/tilt optical view,
realistic seeded disturbances, detector-ready OpenCV frames, browser-ready JPEG
payloads, and separate ground truth for evaluation.

All implementation and tests for this subsystem live under `simulation/`.

## Pipeline

```text
movement profile -> beacon direction/world state -> jittered camera projection
                 -> optical frame renderer -> turbulence/blur/noise
                 -> FramePacket.image_bgr  (detection and tracking)
                 -> JPEG/base64 adapter     (backend/WebSocket/frontend)

separate output  -> GroundTruth             (evaluation only)
control input    -> ControlCommand           (pan/tilt rates from controller)
```

Ground truth is never placed in `FramePacket` or the frontend camera payload, so
a detector/tracker cannot accidentally use privileged simulated coordinates.

## Supported movement

- `stationary`
- `linear`
- `circular`
- `sinusoidal`
- `erratic` (seeded, continuous piecewise-random velocity)
- `figure_eight` (Lissajous movement)

Every trajectory exposes angular position and rate. Ground truth also includes
Cartesian position/velocity at the configured beacon range for 3D visualization
and quantitative evaluation.

## Camera and environment

- 640 x 480 BGR frames at 30 FPS by default
- Configurable horizontal/vertical FOV, pan/tilt limits, and slew limits
- Seeded star background and optical spot/glow
- Gaussian sensor noise (`noise`, 0-100)
- Platform orientation jitter (`vibration`, 0-100)
- Brightness scintillation and smooth spatial warp (`turbulence`, 0-100)
- Rate-aware horizontal/vertical motion blur (`blur`, 0-100)
- One-shot or periodic scheduled occlusion
- Runtime disturbance updates without resetting the simulation clock

## Integration contracts

Detection and tracking consume the frame without a codec round trip:

```python
step = simulation.step(control_command)
detection = detector.detect(step.frame.image_bgr)
```

`image_bgr` is a contiguous `numpy.uint8` array shaped `(height, width, 3)`.
`FramePacket` also contains timestamp, frame number, optical FOV, gimbal angles,
and the applied gimbal rates.

The current React frontend expects a bare base64 JPEG in `image_base64`:

```python
from fsoc_sim import frontend_camera_payload

camera_fields = frontend_camera_payload(step.frame, fps=30.0)
telemetry = {**camera_fields, **detection_tracking_fields}
await websocket.send_json(telemetry)
```

The adapter returns the camera-owned subset of the existing dashboard schema:
`timestamp`, `frame_index`, `fps`, `camera`, `frame`, and `image_base64`.
Detection, tracking, lock state, and errors must be merged by downstream code.

Slider-compatible runtime updates use the same names as the dashboard/backend:

```python
simulation.update_disturbances(
    noise=35,
    vibration=20,
    turbulence=45,
    blur=10,
    occlusion=False,
)
```

## Install and test

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r simulation\requirements.txt
.\.venv\Scripts\python.exe -m pytest simulation\tests
```

## Generate camera-feed artifacts

One movement:

```powershell
.\.venv\Scripts\python.exe -m fsoc_sim.demo --trajectory circular --frames 240
```

All movement types with representative disturbances:

```powershell
.\.venv\Scripts\python.exe -m fsoc_sim.demo --trajectory all --frames 180 `
  --noise 25 --vibration 20 --turbulence 35 --blur 15 --occlusion
```

Each output directory contains:

- `fsoc_group1_demo.avi`: MJPG camera feed
- `first_frame.png` and `last_frame.png`: visual inspection frames
- `frontend_camera_payload.json`: directly consumable base64 camera payload
- `ground_truth.jsonl`: evaluation-only world and projection truth
- `summary.json`: run configuration and artifact paths

The default output path is `simulation/demo-output/`. Add `--display` for an
interactive OpenCV window; headless output is preferable for repeatable tests.

## Coordinate and timing conventions

- Radians internally; frontend adapter converts camera values to degrees.
- Positive azimuth/pan points right; positive elevation/tilt points upward.
- Image origin is top-left; `x` grows right and `y` grows down.
- Geometric center is `((width - 1) / 2, (height - 1) / 2)`.
- An exact FOV boundary is visible and maps to the corresponding edge pixel.
- Simulation time is `frame_id / fps`, independent of rendering/wall-clock time.
- Commands are rate-limited and integrated before the current frame is rendered.
- Resetting replays target, camera, star field, and disturbances exactly for the
  same configuration, seed, and command sequence.
