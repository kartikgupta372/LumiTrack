import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Download, Radio, Wifi, WifiOff } from "lucide-react";
import StatusBar from "./components/StatusBar";
import CameraView from "./components/CameraView";
import SimControls from "./components/SimControls";
import DisturbPanel from "./components/DisturbPanel";
import Charts from "./components/Charts";
import ReportModal from "./components/ReportModal";

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
}