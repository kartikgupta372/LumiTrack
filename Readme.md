<<<<<<< HEAD
# LumiTrack

> AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile Free-Space Optical Communication (FSOC) Terminals

LumiTrack is a prototype control and simulation platform for coarse alignment of mobile Free-Space Optical Communication (FSOC) terminals. The system models a camera, beacon/target position, tracking state, pan-tilt control, simulation state, and performance metrics behind a FastAPI backend.

The project is being developed as a modular MVP so simulation, tracking, control, metrics, and frontend components can be developed independently and integrated later.

## 🎯 Problem

Free-Space Optical Communication requires accurate alignment between optical terminals. Small movements of the terminal, target, or camera can introduce pointing errors and degrade the optical link.

LumiTrack aims to provide a software-based prototype that can:

- Detect or simulate a target/beacon position.
- Calculate tracking error between the camera/terminal and target.
- Convert tracking error into pan/tilt control commands.
- Update the virtual camera orientation.
- Monitor tracking and performance state in real time.
- Provide REST APIs and WebSocket communication for frontend and simulation integration.

## 🧩 Current MVP

### Implemented

- FastAPI backend
- Health-check endpoint
- Simulation state management
- Simulation start/stop/reset/configuration APIs
- Simulation state update API
- Camera state model
- Beacon/target position model
- Tracking state model
- Tracking error representation (`error_x`, `error_y`)
- Pan/tilt controller
- PID-based control foundation
- Pan/tilt state update
- WebSocket endpoint for real-time state communication
- Performance metrics collection
- FPS and processing-time fields
- Pydantic request/response schemas
- OpenAPI/Swagger documentation
- Modular structure for future vision and simulation integration

### Current MVP flow

```text
Beacon / Target
      ↓
Tracking Position
      ↓
Calculate Error (X, Y)
      ↓
Controller / PID
      ↓
Pan-Tilt Update
      ↓
Camera State
      ↓
Simulation State
      ↓
REST API / WebSocket
      ↓
Frontend / Simulation
```

## 🏗️ Architecture

```text
LumiTrack/
│
├── backend/
│   └── app/
│       ├── api/
│       │   ├── routes.py
│       │   └── websocket.py
│       ├── control/
│       │   ├── controller.py
│       │   ├── pan_tilt.py
│       │   └── pid.py
│       ├── core/
│       │   ├── models.py
│       │   └── schemas.py
│       ├── metrics/
│       │   ├── collector.py
│       │   └── performance.py
│       ├── services/
│       │   ├── report_service.py
│       │   └── simulation_service.py
│       ├── simulation/
│       ├── tracking/
│       ├── utils/
│       ├── vision/
│       ├── config.py
│       └── main.py
│
├── frontend/
├── simulation/
├── models/
├── reports/
├── experiments/
├── tests/
├── assets/
├── docs/
├── docker-compose.yml
├── requirements.txt
└── Readme.md
```

The backend is separated into API, control, core models/schemas, metrics, services, simulation, tracking, utilities, and vision modules so contributors can work independently.

## ⚙️ Technology Stack

| Component | Technology |
|---|---|
| Backend | FastAPI |
| ASGI server | Uvicorn |
| Language | Python |
| API | REST |
| Real-time communication | WebSocket |
| Validation | Pydantic |
| Documentation | OpenAPI / Swagger UI |
| Version control | Git / GitHub |

## 🚀 Getting Started

### 1. Clone

```bash
git clone https://github.com/kartikgupta372/LumiTrack.git
cd LumiTrack
```

### 2. Create virtual environment

Windows:

```powershell
python -m venv .venv
```

### 3. Install dependencies

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

If PowerShell activation is available:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4. Start backend

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

## 📚 API Documentation

Open Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Health check:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

## 🔌 Simulation API

Current simulation operations include:

```http
GET  /simulation/status
POST /simulation/start
POST /simulation/stop
POST /simulation/reset
POST /simulation/config
PUT  /simulation/state
```

The exact request and response schemas are available in Swagger UI.

### Example simulation state

```json
{
  "running": false,
  "beacon": {
    "x": 250,
    "y": 180
  },
  "camera": {
    "position": {
      "x": 0,
      "y": 0
    },
    "pan": 5,
    "tilt": -2
  },
  "tracking": {
    "detected": true,
    "position": {
      "x": 250,
      "y": 180
    },
    "error_x": 0,
    "error_y": 0,
    "locked": true
  },
  "performance": {
    "fps": 30,
    "processing_time": 0.033
  }
}
```

This state acts as the common contract between backend, simulation, control logic, and the future frontend.

## 🎛️ Control System

The control layer receives tracking error:

```text
error_x
error_y
```

and converts it into pan/tilt control values.

```text
Target Position
      ↓
Tracking Position
      ↓
       Error
     /       \
 error_x    error_y
     ↓         ↓
    Pan       Tilt
 Controller Controller
     ↓         ↓
     Pan/Tilt Update
```

The control structure includes:

- Controller abstraction
- PID controller foundation
- Pan/tilt update logic
- Camera orientation state

The next step is to connect this loop to the real/simulated FSOC alignment environment.

## 📡 WebSocket

The WebSocket layer is intended for real-time streaming of:

- Tracking position
- Tracking errors
- Camera pan/tilt
- Lock status
- Simulation state
- Performance metrics

REST APIs handle commands and state operations, while WebSocket is used for continuously changing real-time data.

## 📊 Performance Metrics

The backend contains a metrics collector and performance state.

Current fields include:

```json
{
  "fps": 30,
  "processing_time": 0.033
}
```

These can later be connected to actual vision-processing and simulation performance.

## 👁️ Vision & Tracking

Dedicated modules are present for future/ongoing vision and tracking work.

### Vision

```text
backend/app/vision/
├── detector.py
├── opencv_detector.py
└── yolo_video_detector.py
```

### Tracking

```text
backend/app/tracking/
├── kalman.py
├── prediction.py
└── tracker.py
```

This allows the detection/tracking implementation to evolve without changing the API contract.

## 🧪 Testing

The backend MVP has been manually tested through FastAPI Swagger UI.

Verified operations include:

- Health check
- Simulation status
- Simulation start
- Simulation stop
- Simulation reset
- Simulation configuration
- Simulation state update
- Tracking state updates
- Pan/tilt control state
- Performance/FPS fields

Automated unit and integration tests are part of the next development stage.

## 🔀 Git Workflow

The project uses feature branches so contributors can work independently.

Example:

```text
main
 │
 ├── B1 → Backend / API / Control / Metrics
 ├── G1 → Simulation / Integration
 └── G2 → Frontend / Integration
```

Recommended workflow:

```bash
git checkout -b feature-name
git add .
git commit -m "Add feature"
git push origin feature-name
```

Then merge through a Pull Request or coordinated branch merge.

Do not commit generated files such as `__pycache__`, `.venv`, or local editor configuration.

## 🛣️ Roadmap

### Phase 1 — Backend MVP

- [x] FastAPI application
- [x] Health endpoint
- [x] Simulation state model
- [x] Simulation REST APIs
- [x] Control layer
- [x] Pan/tilt logic
- [x] PID foundation
- [x] WebSocket foundation
- [x] Performance metrics
- [x] Swagger documentation

### Phase 2 — Integration

- [ ] Connect backend with simulation engine
- [ ] Connect real tracking pipeline
- [ ] Connect vision detector
- [ ] Stream live simulation state
- [ ] Integrate frontend dashboard
- [ ] Add automated tests

### Phase 3 — Tracking & Alignment

- [ ] Kalman filtering
- [ ] Target prediction
- [ ] Disturbance modelling
- [ ] Improved lock detection
- [ ] Alignment accuracy evaluation
- [ ] Control-loop tuning

### Phase 4 — FSOC Prototype

- [ ] Camera/beacon simulation
- [ ] Mobile terminal movement
- [ ] Optical alignment simulation
- [ ] Coarse alignment evaluation
- [ ] Performance benchmarking
- [ ] End-to-end demonstration

## 👥 Team Integration

### Backend

Responsible for:

- API contracts
- State management
- Control logic
- Metrics
- WebSocket communication
- Integration layer

### Simulation

Responsible for:

- Virtual environment
- Beacon/camera movement
- Disturbances
- Simulation engine
- Synthetic tracking data

### Frontend

Responsible for:

- Dashboard
- Simulation controls
- Camera/tracking visualization
- Metrics visualization
- Real-time WebSocket display

The shared API/state contract allows these components to be developed independently and integrated later.

## ⚠️ Current Limitations

LumiTrack is currently an MVP/prototype rather than a production-grade optical tracking system.

- The complete end-to-end vision tracking pipeline is still being integrated.
- Simulation and control components are still being connected.
- Performance values can be test/simulation values until connected to actual processing.
- Hardware-level FSOC alignment is outside the current software MVP.
- Automated test coverage is still being expanded.

## 🤝 Contributing

1. Create a feature branch.
2. Implement your module without unnecessarily modifying other contributors' work.
3. Test the relevant API/module.
4. Commit with a meaningful message.
5. Push the branch.
6. Open a Pull Request or coordinate the merge with the team.

Keep generated files such as `__pycache__`, `.venv`, and `.vscode` out of commits.

## 📄 License

Add the project's chosen license before public release.

## 📌 Project Status

**Backend MVP integrated into `main`.**

The FastAPI backend is operational and exposes the core simulation/control API through Swagger UI. The next major milestone is connecting the backend state/control loop with the simulation and frontend components for a complete end-to-end MVP.
=======
# LumiTrack - AI-Based Virtual Camera Tracking System for Coarse FSOC Alignment

[![SIH 2026 Problem Statement 26169](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026169-blue.svg)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61DAFB.svg)](https://react.dev)
[![OpenCV](https://img.shields.io/badge/Computer%20Vision-OpenCV%20%2B%20Kalman-5C3EE8.svg)](https://opencv.org)

> **Software-in-the-Loop (SIL) Virtual Testbed & AI-Assisted Simulator for Coarse Pointing, Acquisition, and Tracking (PAT) of Mobile Free Space Optical Communication (FSOC) Terminals.**

---

## 🌟 Key Features

1. **Closed-Loop Software Simulation**: Real-time 2D world simulation modeling moving optical beacons (Stationary, Linear, Circular, Sinusoidal, Erratic trajectories) and steerable virtual Pan-Tilt camera platforms.
2. **Disturbance & Stress Engine**: Tunable environmental disturbances including Gaussian sensor noise (0-100%), platform vibration/jitter, atmospheric turbulence/scintillation, motion blur, and target occlusion (disappearing target).
3. **Computer Vision & Tracking**:
   - Classical OpenCV baseline detector (Adaptive thresholding, contour extraction, sub-pixel moment centroids).
   - Modular AI detector interface ready for lightweight YOLOv8 models.
   - **2D Constant Velocity Kalman Filter** for target position estimation, measurement smoothing, and predictive tracking during target loss.
4. **Autonomous Gimbal Control**:
   - Image-space error calculation ($e_x, e_y$).
   - Proportional / PID Controller with anti-windup clamping and angular rate saturation.
   - Lock Acquisition State Machine (`ACQUIRING`, `LOCKED`, `LOST`, `REACQUIRING`).
5. **Real-time Telemetry & Analytics Dashboard**:
   - WebSockets streaming low-latency camera frames at 30 FPS.
   - Control station HUD displaying live FPS, acquisition time, tracking error (pixels/degrees), pan/tilt angles, and lock retention rates.
   - Real-time Recharts tracking error dynamics and exportable JSON/CSV experiment summaries.

---

## 🏗 System Architecture

```
+-----------------------------------------------------------------------------------+
| 1. Virtual Environment & Beacon Motion Generator                                 |
|    (Stationary, Linear, Circular, Sinusoidal, Erratic Trajectories)               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. Virtual Camera & Synthetic Renderer                                           |
|    (Maps world coords -> image coords based on Pan, Tilt, FOV, Resolution)        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. Disturbance Engine                                                             |
|    (Gaussian Noise, Camera Jitter, Turbulence Scintillation, Motion Blur, Loss)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. Perception Engine (OpenCV / AI YOLO Module)                                    |
|    (Thresholding -> Contours -> Centroid Extraction (x, y) & Bounding Box)        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 5. Tracking & State Estimation (Kalman Filter)                                    |
|    (Temporal prediction, measurement update, target loss / re-acquisition state)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 6. Control System & Lock Manager (Proportional / PID Controller)                 |
|    (Error calculation e = target - center -> Pan/Tilt velocity updates -> Gimbal)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 7. Performance Evaluator & Telemetry Streamer (FastAPI + WebSockets)              |
|    (FPS, Lock Retention, Acquisition Time, Mean Error -> React Dashboard)         |
+-----------------------------------------------------------------------------------+
```

---

## 🛠 Quick Start Guide

### 1. Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI backend server (port 8000)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*Backend interactive API docs will be available at `http://localhost:8000/docs`.*

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Launch Vite development dashboard (port 3000)
npm run dev
```
*Open your browser and navigate to `http://localhost:3000` to access the LumiTrack Command Center.*

---

## 📊 Predefined Benchmark Scenarios

1. **Nominal Circular Tracking**: Smooth circular beacon trajectory under zero environmental noise.
2. **High Sensor Noise (30%)**: Tests OpenCV and Kalman filter stability under heavy Gaussian image noise.
3. **Severe Platform Jitter (40%)**: Tests gimbal stabilization under high-frequency platform vibration.
4. **Target Occlusion & Loss Test**: Simulates temporary beacon loss (target hidden for 2.5s) to verify Kalman state prediction and re-acquisition.
5. **Erratic Random Waypoint Motion**: Tests PID controller response under unpredictable directional changes.

---

## 📝 License
Developed for SIH 2026 Problem Statement 26169.
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
