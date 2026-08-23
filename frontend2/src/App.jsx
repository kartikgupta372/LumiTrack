import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Download, Radio, Wifi, WifiOff } from "lucide-react";
import StatusCard from "./components/StatusCard";
import CameraFeedCanvas from "./components/CameraFeedCanvas";
import SimulationControls from "./components/SimulationControls";
import DisturbancePanel from "./components/DisturbancePanel";
import AnalyticsCharts from "./components/AnalyticsCharts";
import ReportModal from "./components/ReportModal";
import { api, createSimulationSocket } from "./services/websocket";

const initialState = {
  target: { x: 380, y: 215 },
  camera: { x: 380, y: 215 },
  metrics: {
    fps: 60,
    error: 0.12,
    pan: 0,
    tilt: 0,
    acquisitionTime: 0.42,
    confidence: 0.98,
    detected: true,
    locked: true,
    processingTime: 2.1,
    averageError: 0.18,
    maxError: 0.45,
    lockRetention: 98.2,
    lostTargets: 0,
    recoveryRate: 100,
  },
};

function normalizeBackendState(payload) {
  if (!payload) return initialState;
  const target = payload.target || payload.beacon || initialState.target;
  const camera = payload.camera || initialState.camera;
  const metrics = payload.metrics || payload.telemetry || {};

  return {
    target: { x: Number(target.x || 380), y: Number(target.y || 215) },
    camera: { x: Number(camera.x || 380), y: Number(camera.y || 215) },
    metrics: {
      fps: Number(metrics.fps || 60),
      error: Number(metrics.error || metrics.tracking_error || 0),
      pan: Number(metrics.pan || metrics.pan_angle || 0),
      tilt: Number(metrics.tilt || metrics.tilt_angle || 0),
      acquisitionTime: Number(metrics.acquisitionTime || metrics.acquisition_time || 0.4),
      confidence: Number(metrics.confidence || 0.95),
      detected: Boolean(metrics.detected ?? true),
      locked: Boolean(metrics.locked ?? true),
      processingTime: Number(metrics.processingTime || metrics.processing_time || 2.1),
      averageError: Number(metrics.averageError || metrics.avg_error || 0.2),
      maxError: Number(metrics.maxError || metrics.max_error || 0.5),
      lockRetention: Number(metrics.lockRetention || metrics.lock_retention || 98),
      lostTargets: Number(metrics.lostTargets || metrics.lost_targets || 0),
      recoveryRate: Number(metrics.recoveryRate || metrics.recovery_rate || 100),
    },
  };
}

export default function App() {
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [scenario, setScenario] = useState("sinusoidal");
  const [speed, setSpeed] = useState(1);
  const [disturbances, setDisturbances] = useState({
    noise: 15,
    vibration: 10,
    turbulence: 5,
    blur: 0,
    occlusion: false,
  });

  const [sim, setSim] = useState(initialState);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const socketRef = useRef(null);
  const mockRef = useRef(null);

  const pushHistory = useCallback((metrics) => {
    setHistory((old) => {
      const t = Number((old.length * 0.1).toFixed(1));
      const point = {
        t,
        error: Number(metrics.error || 0),
        fps: Number(metrics.fps || 60),
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
      const fullPath = path.startsWith("/api") ? path : `/api${path}`;
      await api(fullPath, {
        method: "POST",
        body: JSON.stringify(body || {}),
      });
    } catch {
      // Backend may not be running yet; local demo continues seamlessly.
    }
  };

  // Local visualizer fallback when FastAPI backend is offline
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
          <button className="report-btn btn" onClick={() => setReportOpen(true)}>
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
