# LumiTrack - AI-Based Virtual Camera Tracking System for Coarse FSOC Alignment

[![SIH 2026 Problem Statement 26169](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026169-blue.svg)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61DAFB.svg)](https://react.dev)
[![OpenCV](https://img.shields.io/badge/Computer%20Vision-OpenCV%20%2B%20Kalman-5C3EE8.svg)](https://opencv.org)

> **Software-in-the-Loop (SIL) Virtual Testbed & AI-Assisted Simulator for Coarse Pointing, Acquisition, and Tracking (PAT) of Mobile Free Space Optical Communication (FSOC) Terminals.**

---

## Canonical 2D Simulation Core

The deterministic Group 1 package in [`simulation/fsoc_sim`](simulation/fsoc_sim) is the source of truth for 2D simulation timing, trajectories, pan/tilt motion, angular projection, field-of-view behavior, and clean OpenCV frame rendering. Backend and frontend layers must consume its `FramePacket`, `GroundTruth`, and `ControlCommand` contracts instead of reimplementing simulation mathematics.

Internal angles and angular rates use radians. Degree conversion belongs only at API and presentation boundaries. See [`simulation/README.md`](simulation/README.md) for the full conventions and acceptance criteria.

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
- Python 3.12+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# From the repository root, install the canonical simulation package
python -m pip install -e "./simulation[test]"

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
