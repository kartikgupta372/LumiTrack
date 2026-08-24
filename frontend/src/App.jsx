<<<<<<< HEAD
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Download, Radio, Wifi, WifiOff } from "lucide-react";
import StatusBar from "./components/StatusBar";
import CameraView from "./components/CameraView";
import SimControls from "./components/SimControls";
import DisturbPanel from "./components/DisturbPanel";
import Charts from "./components/Charts";
import ReportModal from "./components/ReportModal";
=======
<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Download, Radio, Wifi, WifiOff } from "lucide-react";
import { api, createSimulationSocket } from "./services/websocket";
import CameraFeedCanvas from "./components/CameraFeedCanvas";
import SimulationControls from "./components/SimulationControls";
import DisturbancePanel from "./components/DisturbancePanel";
import StatusCard from "./components/StatusCard";
import AnalyticsCharts from "./components/AnalyticsCharts";
import ReportModal from "./components/ReportModal";

const initialMetrics = {
  fps: 0,
  error: 0,
  pan: 0,
  tilt: 0,
  acquisitionTime: null,
  confidence: 0,
  locked: false,
  detected: false,
  averageError: 0,
  maxError: 0,
  lockRetention: 0,
  lostTargets: 0,
  recoveryRate: 0,
  processingTime: 0,
};

const initialState = {
  target: { x: 390, y: 215 },
  camera: { x: 390, y: 215 },
  metrics: initialMetrics,
};

function normalizeBackendState(payload) {
  const s = payload?.state || payload?.data || payload || {};
  const target = s.target || s.beacon || {};
  const camera = s.camera || {};
  const m = s.metrics || s;

  return {
    target: {
      x: Number(target.x ?? s.target_x ?? 390),
      y: Number(target.y ?? s.target_y ?? 215),
    },
    camera: {
      x: Number(camera.x ?? s.camera_x ?? 390),
      y: Number(camera.y ?? s.camera_y ?? 215),
    },
    metrics: {
      ...initialMetrics,
      ...m,
      fps: Number(m.fps ?? 0),
      error: Number(m.error ?? m.tracking_error ?? 0),
      pan: Number(m.pan ?? s.pan ?? 0),
      tilt: Number(m.tilt ?? s.tilt ?? 0),
      confidence: Number(m.confidence ?? m.detection_confidence ?? 0),
      locked: Boolean(m.locked ?? s.locked),
      detected: Boolean(m.detected ?? s.detected ?? true),
    },
  };
}

export default function App() {
  const [sim, setSim] = useState(initialState);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scenario, setScenario] = useState("sinusoidal");
  const [speed, setSpeed] = useState(1);
  const [disturbances, setDisturbances] = useState({
    noise: 12,
    vibration: 8,
    turbulence: 5,
    blur: 0,
    occlusion: false,
  });
  const [history, setHistory] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const mockRef = useRef(null);

  const pushHistory = useCallback((metrics) => {
    setHistory((old) => {
      const point = {
        t: Number((Date.now() / 1000).toFixed(1)),
        error: Number(metrics.error || 0),
        fps: Number(metrics.fps || 0),
        pan: Number(metrics.pan || 0),
        tilt: Number(metrics.tilt || 0),
        locked: metrics.locked ? 1 : 0,
      };
      return [...old, point].slice(-60);
    });
  }, []);

  const applyState = useCallback((payload) => {
    const next = normalizeBackendState(payload);
    setSim(next);
    pushHistory(next.metrics);
  }, [pushHistory]);

  useEffect(() => {
    try {
      socketRef.current = createSimulationSocket({
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
        onError: () => setConnected(false),
        onMessage: applyState,
      });
    } catch {
      setConnected(false);
    }

    return () => socketRef.current?.close();
  }, [applyState]);

  const sendCommand = async (path, body) => {
    if (connected) {
      socketRef.current?.send({ action: path.replace("/simulation/", ""), ...(body || {}) });
      return;
    }

    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify(body || {}),
      });
    } catch {
      // Backend may not be running yet; local demo continues.
    }
  };

  // Local demo fallback: lets you demonstrate the dashboard before FastAPI is connected.
  useEffect(() => {
    if (!running || paused || connected) {
      if (mockRef.current) cancelAnimationFrame(mockRef.current);
      return;
    }

    let start = performance.now();
    let last = start;

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const elapsed = (now - start) / 1000;
      const w = 760, h = 430;

      let x, y;
      if (scenario === "circular") {
        x = w / 2 + Math.cos(elapsed * speed * 0.8) * 125;
        y = h / 2 + Math.sin(elapsed * speed * 0.8) * 85;
      } else if (scenario === "straight") {
        x = 90 + ((elapsed * speed * 80) % 580);
        y = h / 2 + Math.sin(elapsed * speed * 0.8) * 25;
      } else if (scenario === "random") {
        x = w / 2 + Math.sin(elapsed * speed * 1.7) * 145 + Math.sin(elapsed * speed * 4) * 25;
        y = h / 2 + Math.cos(elapsed * speed * 1.2) * 90;
      } else {
        x = w / 2 + Math.sin(elapsed * speed * 1.1) * 170;
        y = h / 2 + Math.sin(elapsed * speed * 2.1) * 90;
      }

      const noisePx = disturbances.noise * 0.12;
      x += (Math.random() - 0.5) * noisePx;
      y += (Math.random() - 0.5) * noisePx;

      const cx = w / 2;
      const cy = h / 2;
      const dx = x - cx;
      const dy = y - cy;
      const errorPx = Math.sqrt(dx * dx + dy * dy);
      const errorDeg = errorPx / 38;

      // Simple proportional camera response for visual demo only.
      const follow = Math.min(1, dt * (0.9 + speed * 0.3));
      const target = sim.target;
      const camX = target.x + (x - target.x) * follow;
      const camY = target.y + (y - target.y) * follow;

      const locked = errorDeg < 1.0;
      const metrics = {
        ...sim.metrics,
        fps: 57 + Math.sin(elapsed * 2) * 3,
        error: errorDeg,
        pan: dx / 38,
        tilt: dy / 38,
        confidence: Math.max(0.65, 1 - errorDeg / 12),
        detected: true,
        locked,
        processingTime: 2.5,
      };

      setSim({
        target: { x, y },
        camera: { x: camX, y: camY },
        metrics,
      });
      pushHistory(metrics);

      mockRef.current = requestAnimationFrame(tick);
    };

    mockRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(mockRef.current);
  }, [running, paused, connected, scenario, speed, disturbances.noise, pushHistory]);

  const start = async () => {
    setRunning(true);
    setPaused(false);
    await sendCommand("/simulation/start", {
      scenario,
      speed,
      disturbances,
    });
  };

  const pause = async () => {
    const next = !paused;
    setPaused(next);
    await sendCommand(next ? "/simulation/pause" : "/simulation/resume");
  };

  const stop = async () => {
    setRunning(false);
    setPaused(false);
    await sendCommand("/simulation/stop");
  };

  const reset = async () => {
    setRunning(false);
    setPaused(false);
    setHistory([]);
    setSim(initialState);
    await sendCommand("/simulation/reset");
  };

  const updateScenario = async (value) => {
    setScenario(value);
    await sendCommand("/simulation/config", { scenario: value, speed, disturbances });
  };

  const updateDisturbances = async (nextOrUpdater) => {
    setDisturbances((old) => {
      const next = typeof nextOrUpdater === "function" ? nextOrUpdater(old) : nextOrUpdater;
      if (connected) {
        socketRef.current?.send({ action: "config", disturbances: next });
      }
      return next;
    });
  };

  const topStats = useMemo(() => ({
    duration: history.length ? (history.length / 60).toFixed(1) : "0.0",
    samples: history.length,
  }), [history]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Radio size={21} /></div>
          <div>
            <div className="brand-name">LUMITRACK</div>
            <div className="brand-sub">FSOC • COARSE PAT COMMAND CENTER</div>
          </div>
        </div>

        <div className="topbar-right">
          <span className={`connection ${connected ? "online" : "offline"}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? "BACKEND CONNECTED" : "LOCAL DEMO"}
          </span>
          <span className="system-time">SESSION {topStats.duration} MIN</span>
          <button className="report-btn" onClick={() => setReportOpen(true)}>
            <Download size={15} /> REPORT
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="hero-row">
          <div>
            <span className="eyebrow">AUTONOMOUS ALIGNMENT</span>
            <h1>Virtual Camera Tracking</h1>
            <p>AI-assisted software-in-the-loop testbed for mobile FSOC coarse alignment.</p>
          </div>
          <div className="demo-badge"><span /> MVP SIMULATION</div>
        </div>

        <StatusCard metrics={sim.metrics} />

        <div className="main-grid">
          <section className="panel camera-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">CAMERA VIEW</span>
                <h2>Virtual Pan-Tilt Sensor</h2>
              </div>
              <span className="mini-label">30° FOV</span>
            </div>

            <CameraFeedCanvas
              target={sim.target}
              detected={sim.metrics.detected}
              locked={sim.metrics.locked}
              noise={disturbances.noise}
              blur={disturbances.blur}
            />

            <div className="camera-readout">
              <div><span>TARGET X</span><b>{sim.target.x.toFixed(1)} px</b></div>
              <div><span>TARGET Y</span><b>{sim.target.y.toFixed(1)} px</b></div>
              <div><span>CENTER Δ</span><b>{sim.metrics.error.toFixed(2)}°</b></div>
              <div><span>DETECTION</span><b>{sim.metrics.detected ? "VALID" : "LOST"}</b></div>
            </div>
          </section>

          <aside className="side-stack">
            <SimulationControls
              running={running}
              paused={paused}
              scenario={scenario}
              setScenario={updateScenario}
              speed={speed}
              setSpeed={setSpeed}
              onStart={start}
              onPause={pause}
              onStop={stop}
              onReset={reset}
            />
            <DisturbancePanel
              disturbances={disturbances}
              setDisturbances={updateDisturbances}
            />
          </aside>
        </div>

        <AnalyticsCharts history={history} />

        <footer className="footer-note">
          <span><Activity size={13} /> Closed-loop flow: Simulation → Detection → Tracking → Control → Camera</span>
          <span>REST + WebSocket ready</span>
        </footer>
      </main>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        metrics={sim.metrics}
        history={history}
      />
    </div>
  );
}
=======
/**
 * App.jsx — LumiTrack Root Component
 *
 * Architecture:
 *   useSimulation() hook  — all state, WS, and API logic
 *   <Navbar />            — header with view toggle + connection badge
 *   <SimulationView />    — full dashboard layout
 */
>>>>>>> fd72f99e81b27682b7b4e06683189149817245ec

// ── Canvas dimensions ──────────────────────────────────────────────────────
const W = 760;
const H = 430;
const CX = W / 2;
const CY = H / 2;
const FOV_DEG = 30;
const PX_PER_DEG = W / FOV_DEG;

// ── Trajectory Generators ──────────────────────────────────────────────────
function computeTarget(scenario, elapsed, speed) {
  switch (scenario) {
    case "stationary":
      return { x: CX + 70, y: CY - 40 };

    case "circular":
      return {
        x: CX + Math.cos(elapsed * speed * 0.75) * 140,
        y: CY + Math.sin(elapsed * speed * 0.75) * 95,
      };

    case "linear": {
      // Linear bounce left-right with slight vertical wave
      const period = 5.5 / Math.max(0.2, speed);
      const t = elapsed % (2 * period);
      const norm = t < period ? t / period : 2 - t / period; // 0 -> 1 -> 0
      return {
        x: 90 + norm * (W - 180),
        y: CY + Math.sin(elapsed * speed * 0.45) * 35,
      };
    }

    case "sinusoidal":
      return {
        x: CX + Math.sin(elapsed * speed * 0.95) * 180,
        y: CY + Math.sin(elapsed * speed * 1.9) * 90,
      };

    case "erratic":
      return {
        x: CX + Math.sin(elapsed * speed * 1.4) * 155 + Math.cos(elapsed * speed * 3.6) * 35,
        y: CY + Math.cos(elapsed * speed * 1.1) * 95 + Math.sin(elapsed * speed * 3.1) * 25,
      };

    default:
      return { x: CX, y: CY };
  }
}

// ── 1D Kalman-like Filter ──────────────────────────────────────────────────
class Kalman1D {
  constructor(q = 0.8, r = 3.5) {
    this.x = CX;
    this.v = 0;
    this.p = 10;
    this.q = q;
    this.r = r;
  }
  predict(dt) {
    this.x += this.v * dt;
    this.p += this.q;
  }
  update(z, dt = 0.016) {
    const k = this.p / (this.p + this.r);
    const measuredV = (z - this.x) / Math.max(dt, 0.001);
    this.v += k * (measuredV - this.v) * 0.12;
    this.x += k * (z - this.x);
    this.p *= (1 - k);
  }
}

const INITIAL = {
  targetX: CX - 60,
  targetY: CY - 30,
  camX: CX,
  camY: CY,
  fps: 60,
  errorDeg: 1.85,
  errorPx: 47.0,
  pan: 0.0,
  tilt: 0.0,
  locked: false,
  detected: true,
  occluded: false,
  acquisitionTime: 0,
  avgError: 1.75,
  maxError: 2.1,
  lockRetention: 26.1,
  lostCount: 0,
  lockFrames: 0,
  totalFrames: 0,
};

export default function App() {
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [scenario, setScenario] = useState("linear");
  const [speed, setSpeed] = useState(1.9);
  const [disturbances, setDisturbances] = useState({
    noise: 48,
    vibration: 48,
    turbulence: 48,
    blur: 45,
    occlusion: false,
  });
  const [sim, setSim] = useState(INITIAL);
  const [history, setHistory] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [sessionSec, setSessionSec] = useState(0);

  const rafRef = useRef(null);
  const stateRef = useRef({ ...INITIAL });
  const paramsRef = useRef({ scenario, speed, disturbances, running, paused });
  const kalmanX = useRef(new Kalman1D());
  const kalmanY = useRef(new Kalman1D());
  const sessionRef = useRef(null);

  // Sync parameters to ref for RAF loop
  useEffect(() => {
    paramsRef.current = { scenario, speed, disturbances, running, paused };
  }, [scenario, speed, disturbances, running, paused]);

  // ── Main Simulation Loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!running || paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let start = performance.now();
    let lastTs = start;
    let frameCount = 0;
    let fpsTimer = 0;
    let liveFps = 60;
    let acqStart = null;
    let acqTime = 0;

    const tick = (now) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      const elapsed = (now - start) / 1000;
      const { scenario, speed, disturbances } = paramsRef.current;

      // Cyclic occlusion (4s cycle: 2s occluded, 2s visible)
      const occluded = disturbances.occlusion && Math.floor(elapsed / 4) % 2 === 1;

      // 1. Compute ground truth beacon target position
      const { x: tx, y: ty } = computeTarget(scenario, elapsed, speed);

      // 2. Add sensor measurement noise
      const noiseAmp = (disturbances.noise / 100) * 9.0;
      const mX = tx + (Math.random() - 0.5) * noiseAmp;
      const mY = ty + (Math.random() - 0.5) * noiseAmp;

      // 3. Kalman prediction & update
      kalmanX.current.predict(dt);
      kalmanY.current.predict(dt);
      if (!occluded) {
        kalmanX.current.update(mX, dt);
        kalmanY.current.update(mY, dt);
      }
      const kX = kalmanX.current.x;
      const kY = kalmanY.current.y;

      // 4. PID Camera Controller (Camera boresight chases target)
      const prev = stateRef.current;
      const errX_px = kX - prev.camX;
      const errY_px = kY - prev.camY;

      const Kp = 3.0 + speed * 0.45;
      const velX = Math.max(-260, Math.min(260, Kp * errX_px));
      const velY = Math.max(-260, Math.min(260, Kp * errY_px));

      // Platform vibration jitter
      const vibAmp = (disturbances.vibration / 100) * 3.5;
      const vibX = (Math.random() - 0.5) * vibAmp;
      const vibY = (Math.random() - 0.5) * vibAmp;

      const newCamX = Math.max(15, Math.min(W - 15, prev.camX + velX * dt + vibX));
      const newCamY = Math.max(15, Math.min(H - 15, prev.camY + velY * dt + vibY));

      // 5. Tracking error calculation
      const errX = tx - newCamX;
      const errY = ty - newCamY;
      const errorPx = Math.hypot(errX, errY);
      const errorDeg = errorPx / PX_PER_DEG;
      const pan = (newCamX - CX) / PX_PER_DEG;
      const tilt = (CY - newCamY) / PX_PER_DEG;

      // Lock threshold: error under 0.85 degrees and not occluded
      const locked = !occluded && errorDeg < 0.85;

      // Acquisition time calculation
      if (!locked && acqStart === null && !occluded) acqStart = elapsed;
      if (locked && acqStart !== null) {
        acqTime = elapsed - acqStart;
        acqStart = null;
      }

      // FPS Calculation
      fpsTimer += dt;
      frameCount++;
      if (fpsTimer >= 0.4) {
        liveFps = Math.round(frameCount / fpsTimer);
        fpsTimer = 0;
        frameCount = 0;
      }

      const lockFrames = prev.lockFrames + (locked ? 1 : 0);
      const totalFrames = prev.totalFrames + 1;
      const lostCount = prev.lostCount + (prev.locked && !locked ? 1 : 0);
      const lockRetention = totalFrames > 0 ? (lockFrames / totalFrames) * 100 : 100;
      const avgError = prev.avgError + (errorDeg - prev.avgError) * 0.005;
      const maxError = Math.max(prev.maxError, errorDeg);

      const next = {
        targetX: tx,
        targetY: ty,
        camX: newCamX,
        camY: newCamY,
        fps: liveFps,
        errorDeg,
        errorPx,
        pan,
        tilt,
        locked,
        detected: !occluded,
        occluded,
        acquisitionTime: acqTime,
        avgError,
        maxError,
        lockRetention,
        lostCount,
        lockFrames,
        totalFrames,
      };

      stateRef.current = next;
      setSim(next);

      // Decimate history chart points (~10 Hz)
      if (Math.floor(elapsed * 10) !== Math.floor((elapsed - dt) * 10)) {
        setHistory((h) =>
          [
            ...h,
            {
              t: Number(elapsed.toFixed(1)),
              error: Number(errorDeg.toFixed(4)),
              fps: liveFps,
              pan: Number(pan.toFixed(2)),
              tilt: Number(tilt.toFixed(2)),
              locked: locked ? 1 : 0,
            },
          ].slice(-120)
        );
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, paused]);

  // Session clock
  useEffect(() => {
    if (running && !paused) {
      sessionRef.current = setInterval(() => setSessionSec((s) => s + 1), 1000);
    } else {
      clearInterval(sessionRef.current);
    }
    return () => clearInterval(sessionRef.current);
  }, [running, paused]);

  const start = () => {
    setRunning(true);
    setPaused(false);
  };
  const pause = () => {
    setPaused((p) => !p);
  };
  const stop = () => {
    setRunning(false);
    setPaused(false);
    stateRef.current = { ...INITIAL };
    setSim({ ...INITIAL });
  };
  const reset = () => {
    setRunning(false);
    setPaused(false);
    setHistory([]);
    setSessionSec(0);
    stateRef.current = { ...INITIAL };
    setSim({ ...INITIAL });
    kalmanX.current = new Kalman1D();
    kalmanY.current = new Kalman1D();
  };

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Radio size={18} />
          </div>
          <div>
            <div className="brand-name">LUMITRACK</div>
            <div className="brand-sub">FSOC · COARSE PAT SIMULATOR</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="conn-badge online">
            <Wifi size={13} />
            SIMULATING
          </span>
          <span className="session-label">SESSION {fmtTime(sessionSec)}</span>
          <button className="report-btn" onClick={() => setReportOpen(true)}>
            <Download size={14} /> REPORT
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="hero-row">
          <div>
            <span className="eyebrow">AUTONOMOUS ALIGNMENT</span>
            <h1>Virtual Camera Tracking</h1>
            <p>Simulation → OpenCV Detection → Kalman Filter → PID Controller → Gimbal</p>
          </div>
          <div className="mvp-badge">
            <span className="mvp-dot" />
            {running && !paused ? "SIMULATING" : paused ? "PAUSED" : "STANDBY"}
          </div>
        </div>

        <StatusBar sim={sim} />

        <div className="main-grid">
          <section className="panel camera-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">CAMERA VIEW</span>
                <h2>Virtual Pan-Tilt Sensor</h2>
              </div>
              <span className="mini-label">30° FOV · 760×430</span>
            </div>

            <CameraView sim={sim} disturbances={disturbances} />

            <div className="cam-readout">
              <div>
                <span>Target X</span>
                <b>{sim.targetX.toFixed(1)} px</b>
              </div>
              <div>
                <span>Target Y</span>
                <b>{sim.targetY.toFixed(1)} px</b>
              </div>
              <div>
                <span>Error Δ</span>
                <b>{sim.errorDeg.toFixed(3)}°</b>
              </div>
              <div>
                <span>State</span>
                <b>
                  {sim.occluded
                    ? "OCCLUDED"
                    : sim.locked
                    ? "LOCKED"
                    : sim.detected
                    ? "TRACKING"
                    : "SEARCHING"}
                </b>
              </div>
            </div>
          </section>

          <aside className="side-stack">
            <SimControls
              running={running}
              paused={paused}
              scenario={scenario}
              setScenario={setScenario}
              speed={speed}
              setSpeed={setSpeed}
              onStart={start}
              onPause={pause}
              onStop={stop}
              onReset={reset}
            />
            <DisturbPanel disturbances={disturbances} setDisturbances={setDisturbances} />
          </aside>
        </div>

        <Charts history={history} />

        <footer className="footer-note">
          <span>
            <Activity size={12} /> Beacon → Noise+Occlusion → Kalman Filter → PID Controller →
            Gimbal
          </span>
          <span>SIH 2026 #26169 · FSOC Coarse Tracking System</span>
        </footer>
      </main>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        sim={sim}
        history={history}
      />
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
>>>>>>> fd72f99e81b27682b7b4e06683189149817245ec
