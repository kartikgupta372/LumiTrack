# LumiTrack Stitch Prompt

Use this prompt in Google Stitch. Upload the team's architecture/mockup image as a visual reference if available.

Create a desktop-first dark mission-control dashboard called "LumiTrack — FSOC Coarse PAT Command Center".

Purpose:
A software-in-the-loop simulator for coarse alignment of a mobile Free Space Optical Communication terminal. A virtual camera tracks a moving optical beacon under configurable disturbances.

Visual direction:
- Professional aerospace / research control-station UI.
- Very dark green-black background.
- Thin muted borders, compact cards, dense information layout.
- Primary accent: luminous green.
- Secondary warning accent: amber.
- Monospace micro-labels for telemetry.
- No gradients that look decorative; prioritize technical clarity.
- Responsive, but optimize for a 1440px desktop.
- Do not use stock photos or illustrations.

Layout:
1. Sticky top bar:
   - LUMITRACK logo
   - "FSOC • COARSE PAT COMMAND CENTER"
   - backend connection status
   - session duration
   - REPORT button

2. Header:
   - "AUTONOMOUS ALIGNMENT"
   - "Virtual Camera Tracking"
   - short subtitle
   - "MVP SIMULATION" badge

3. Telemetry strip:
   - TRACKING STATUS: LOCKED / TRACKING / SEARCHING
   - FPS
   - ALIGNMENT ERROR
   - PAN
   - TILT
   - ACQUISITION
   - CONFIDENCE

4. Main content:
   Left large card: "CAMERA VIEW / Virtual Pan-Tilt Sensor"
   - dark simulated camera canvas
   - green crosshair in center
   - bright optical beacon
   - detection box
   - small HUD labels: CAM-01, LIVE, FOV 30°, MODE: COARSE PAT
   - readout row for target X/Y, center delta, detection state

   Right column:
   - Simulation controls: Start, Pause/Resume, Stop, Reset
   - Trajectory dropdown: Sinusoidal, Straight Line, Circular, Random/Erratic
   - Target speed slider
   - Disturbance engine with sliders for Noise, Vibration, Turbulence, Motion Blur
   - Temporary occlusion toggle

5. Analytics:
   - Real-time Tracking Error chart
   - FPS chart
   - Pan Angle chart
   - Tilt Angle chart

6. Report modal:
   - Average Error
   - Maximum Error
   - Lock Retention
   - Lost Targets
   - Recovery Rate
   - Processing Time
   - Export CSV and Export JSON

Interaction requirements:
- Start/Pause/Stop/Reset controls must look functional.
- Sliders should update values.
- Lock status should visually change between SEARCHING, TRACKING and LOCKED.
- Charts should look like live telemetry.
- Include loading/empty/error states subtly.
- Keep component boundaries suitable for React:
  App, CameraFeedCanvas, SimulationControls, DisturbancePanel, StatusCard, AnalyticsCharts, ReportModal.

Implementation target:
Generate a clean React/Vite frontend. The backend will be Python FastAPI with REST endpoints and a WebSocket at /ws/simulation. The frontend should be ready to consume live JSON telemetry without changing the UI structure.

Important:
Do NOT build the Python simulation. This is only the React command-center frontend.
