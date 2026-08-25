import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import api from '../services/api';
import { useWebSocket } from './useWebSocket';


const HISTORY_MAX = 120;
const METRICS_POLL_MS = 500;
const DEFAULT_DISTURBANCES = {
  noise: 0,
  vibration: 0,
  turbulence: 0,
  blur: 0,
  occlusion: false,
  occlusion_start_s: 2,
  occlusion_duration_s: 2,
  occlusion_period_s: 6,
};

const DEFAULT_SCENARIOS = [
  {
    id: 'nominal',
    name: 'Nominal Circular Tracking',
    target: { trajectory: 'circular', speed: 6, radius: 20, frequency: 0.2 },
    disturbances: DEFAULT_DISTURBANCES,
  },
  {
    id: 'noisy_environment',
    name: 'High Sensor Noise (30%)',
    target: { trajectory: 'circular', speed: 6, radius: 20, frequency: 0.2 },
    disturbances: { ...DEFAULT_DISTURBANCES, noise: 30, vibration: 5, turbulence: 10 },
  },
  {
    id: 'severe_vibration',
    name: 'Severe Platform Jitter (40%)',
    target: { trajectory: 'sinusoidal', speed: 8, radius: 15, frequency: 0.3 },
    disturbances: { ...DEFAULT_DISTURBANCES, noise: 10, vibration: 40, turbulence: 15 },
  },
  {
    id: 'occlusion_test',
    name: 'Target Occlusion & Loss Test',
    target: { trajectory: 'linear', speed: 10, radius: 20, frequency: 0.2 },
    disturbances: { ...DEFAULT_DISTURBANCES, noise: 10, occlusion: true, occlusion_duration_s: 2.5 },
  },
  {
    id: 'erratic_target',
    name: 'Erratic Random Waypoint Motion',
    target: { trajectory: 'erratic', speed: 12, radius: 20, frequency: 0.4 },
    disturbances: { ...DEFAULT_DISTURBANCES, noise: 15, vibration: 15, turbulence: 20 },
  },
];


function historyPoint(frame) {
  return {
    timestamp: Number(frame.timestamp ?? 0).toFixed(1),
    total_error_px: frame.total_error_px ?? 0,
    camera_pan: frame.camera?.pan ?? 0,
    camera_tilt: frame.camera?.tilt ?? 0,
    fps: frame.fps ?? 0,
  };
}


export function useSimulation() {
  const [telemetry, setTelemetry] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState('nominal');
  const [disturbances, setDisturbances] = useState(DEFAULT_DISTURBANCES);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const lastWsTimeRef = useRef(0);
  const autoStartRef = useRef(false);
  const demoTimeRef = useRef(0);
  const panRef = useRef(0);
  const tiltRef = useRef(0);
  const maxErrorRef = useRef(0);
  const errorTotalRef = useRef(0);
  const demoFramesRef = useRef(0);
  const lockedFramesRef = useRef(0);

  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [scenarios, selectedScenarioId],
  );

  const handleTelemetry = useCallback((frame) => {
    lastWsTimeRef.current = Date.now();
    setTelemetry(frame);
    setHistory((previous) => [
      ...previous.slice(-(HISTORY_MAX - 1)),
      historyPoint(frame),
    ]);
  }, []);

  const { isConnected, send } = useWebSocket({ onTelemetry: handleTelemetry });

  useEffect(() => {
    api.getScenarios()
      .then((fetched) => {
        if (!fetched?.length) return;
        setScenarios(fetched);
        const selected = fetched.find((scenario) => scenario.id === selectedScenarioId) ?? fetched[0];
        setSelectedScenarioId(selected.id);
        setDisturbances({ ...DEFAULT_DISTURBANCES, ...selected.disturbances });
      })
      .catch(() => {});
  }, []);

  // Start the backend automatically when the single UI connects. Offline mode
  // continues with the same telemetry contract for a reliable demo.
  useEffect(() => {
    if (!isConnected || autoStartRef.current) return;
    autoStartRef.current = true;
    api.getSimulationStatus()
      .then((status) => {
        if (!status.running) return api.startSimulation();
        if (status.paused) return api.resumeSimulation();
        return null;
      })
      .catch(() => send('start'));
  }, [isConnected, send]);

  // Propagate stress controls to the backend without flooding it while a slider moves.
  useEffect(() => {
    if (!isConnected || !activeScenario) return undefined;
    const timer = window.setTimeout(() => {
      api.updateConfig({
        ...activeScenario,
        disturbances: { ...DEFAULT_DISTURBANCES, ...activeScenario.disturbances, ...disturbances },
      }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeScenario, disturbances, isConnected]);

  // Local fallback uses the backend telemetry shape, so 2D and 3D never diverge.
  useEffect(() => {
    if (!isRunning || isPaused) return undefined;
    const interval = window.setInterval(() => {
      if (Date.now() - lastWsTimeRef.current < 1200) return;

      demoTimeRef.current += 1 / 30;
      const t = demoTimeRef.current;
      const target = activeScenario?.target ?? DEFAULT_SCENARIOS[0].target;
      const speed = Math.max(0.2, Number(target.speed ?? 6) / 10);
      const radius = Math.max(4, Number(target.radius ?? 20));
      let beaconX = 0;
      let beaconY = 0;

      switch (target.trajectory) {
        case 'linear':
          beaconX = radius * Math.sin(t * speed);
          beaconY = 4 * Math.sin(t * speed * 0.45);
          break;
        case 'sinusoidal':
          beaconX = radius * Math.sin(t * speed);
          beaconY = radius * 0.55 * Math.sin(t * speed * 2);
          break;
        case 'erratic':
          beaconX = radius * (0.7 * Math.sin(t * speed * 1.3) + 0.2 * Math.cos(t * speed * 3.7));
          beaconY = radius * (0.45 * Math.cos(t * speed) + 0.15 * Math.sin(t * speed * 3.1));
          break;
        case 'stationary':
          beaconX = radius * 0.45;
          beaconY = radius * 0.2;
          break;
        default:
          beaconX = radius * Math.sin(t * speed);
          beaconY = radius * 0.6 * Math.cos(t * speed);
      }

      const noiseScale = disturbances.noise / 100;
      beaconX += (Math.random() - 0.5) * noiseScale * 5;
      beaconY += (Math.random() - 0.5) * noiseScale * 5;

      const cycle = Math.max(0.1, disturbances.occlusion_period_s || 6);
      const cycleTime = t % cycle;
      const occluded = Boolean(
        disturbances.occlusion
        && cycleTime >= (disturbances.occlusion_start_s || 2)
        && cycleTime < (disturbances.occlusion_start_s || 2) + (disturbances.occlusion_duration_s || 2),
      );

      const targetPan = Math.atan2(beaconX, 100) * 180 / Math.PI;
      const targetTilt = Math.atan2(beaconY, Math.hypot(beaconX, 100)) * 180 / Math.PI;
      const vibration = disturbances.vibration / 100;
      const trackingSpeed = Math.max(0.06, 0.16 - vibration * 0.08);
      const currentPan = panRef.current + (targetPan - panRef.current) * trackingSpeed + (Math.random() - 0.5) * vibration * 0.12;
      const currentTilt = tiltRef.current + (targetTilt - tiltRef.current) * trackingSpeed + (Math.random() - 0.5) * vibration * 0.12;
      panRef.current = currentPan;
      tiltRef.current = currentTilt;

      const errorDeg = Math.hypot(targetPan - currentPan, targetTilt - currentTilt);
      const errorPx = errorDeg * (640 / 60);
      const lockState = occluded ? 'LOST' : errorPx < 20 ? 'LOCKED' : errorPx < 50 ? 'ACQUIRING' : 'LOST';
      const frame = {
        timestamp: t,
        frame_index: Math.floor(t * 30),
        beacon_world: {
          x: beaconX,
          y: beaconY,
          z: 100,
          vx: 0,
          vy: 0,
          visible: !occluded,
          in_fov: true,
          occluded,
        },
        camera: {
          pan: currentPan,
          tilt: currentTilt,
          pan_rate: (targetPan - currentPan) * 6,
          tilt_rate: (targetTilt - currentTilt) * 6,
        },
        detection: { valid: !occluded, confidence: occluded ? 0 : 0.98 },
        track: { x: 320, y: 240, predicted: occluded, lock_state: lockState },
        total_error_px: errorPx,
        total_error_deg: errorDeg,
        fps: 30,
        processing_latency_ms: 8 + noiseScale * 5,
        lock_state: lockState,
        is_demo: true,
      };

      demoFramesRef.current += 1;
      errorTotalRef.current += errorPx;
      maxErrorRef.current = Math.max(maxErrorRef.current, errorPx);
      if (lockState === 'LOCKED') lockedFramesRef.current += 1;
      setTelemetry(frame);
      setHistory((previous) => [...previous.slice(-(HISTORY_MAX - 1)), historyPoint(frame)]);
      setMetrics({
        simulation_duration_s: t,
        processed_frames: demoFramesRef.current,
        effective_fps: 30,
        acquisition_time_s: 0.4,
        average_error_px: errorTotalRef.current / demoFramesRef.current,
        max_error_px: maxErrorRef.current,
        average_error_deg: (errorTotalRef.current / demoFramesRef.current) / (640 / 60),
        lock_retention_rate: 100 * lockedFramesRef.current / demoFramesRef.current,
        lost_target_events: 0,
        successful_recoveries: 0,
        avg_processing_latency_ms: frame.processing_latency_ms,
      });
    }, 1000 / 30);
    return () => window.clearInterval(interval);
  }, [activeScenario, disturbances, isPaused, isRunning]);

  useEffect(() => {
    if (!isRunning || !isConnected) return undefined;
    const interval = window.setInterval(() => {
      api.getCurrentMetrics().then(setMetrics).catch(() => {});
    }, METRICS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [isConnected, isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    api.startSimulation().catch(() => send('start'));
  }, [send]);

  const pause = useCallback(() => {
    setIsPaused(true);
    api.pauseSimulation().catch(() => send('pause'));
  }, [send]);

  const resume = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    api.resumeSimulation().catch(() => send('resume'));
  }, [send]);

  const reset = useCallback(() => {
    api.resetSimulation().catch(() => send('reset'));
    demoTimeRef.current = 0;
    panRef.current = 0;
    tiltRef.current = 0;
    maxErrorRef.current = 0;
    errorTotalRef.current = 0;
    demoFramesRef.current = 0;
    lockedFramesRef.current = 0;
    lastWsTimeRef.current = 0;
    setHistory([]);
    setTelemetry(null);
    setMetrics(null);
  }, [send]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    api.stopSimulation().catch(() => send('stop'));
  }, [send]);

  const selectScenario = useCallback((scenarioId) => {
    const selected = scenarios.find((scenario) => scenario.id === scenarioId);
    if (!selected) return;
    setSelectedScenarioId(scenarioId);
    setDisturbances({ ...DEFAULT_DISTURBANCES, ...selected.disturbances });
    if (isConnected) {
      api.updateConfig(selected).then(() => api.resetSimulation()).catch(() => {});
    }
    demoTimeRef.current = 0;
    setHistory([]);
  }, [isConnected, scenarios]);

  const updateDisturbances = useCallback((next) => {
    setDisturbances((current) => ({ ...current, ...next }));
  }, []);

  return {
    telemetry,
    metrics,
    history,
    scenarios,
    selectedScenarioId,
    disturbances,
    isRunning,
    isPaused,
    isConnected,
    actions: { start, pause, resume, reset, stop, selectScenario, updateDisturbances },
  };
}


export default useSimulation;
