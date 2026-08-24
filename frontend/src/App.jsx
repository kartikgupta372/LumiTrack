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

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SimulationView from './components/SimulationView';
import { useSimulation } from './hooks/useSimulation';

export default function App() {
  const [viewMode, setViewMode] = useState('camera'); // 'camera' | '3d'

  const {
    telemetry,
    metrics,
    history,
    scenarios,
    selectedScenarioId,
    isRunning,
    isPaused,
    isConnected,
    actions,
  } = useSimulation();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <Navbar
        isConnected={isConnected}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <SimulationView
        telemetry={telemetry}
        metrics={metrics}
        history={history}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        isRunning={isRunning}
        isPaused={isPaused}
        viewMode={viewMode}
        actions={actions}
      />
    </div>
  );
}
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
