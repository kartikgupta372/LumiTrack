/**
 * useSimulation — Master simulation state hook.
 *
 * Combines WebSocket telemetry with REST API calls.
 * All UI components should consume this hook rather than calling
 * the API or WebSocket services directly.
 *
 * Returns:
 *   telemetry       — latest frame from WS stream
 *   metrics         — latest performance metrics (polled every 500ms when running)
 *   history         — last 120 telemetry frames for chart rendering
 *   scenarios       — list of scenario presets from backend
 *   selectedScenarioId — currently active scenario ID
 *   isRunning       — whether the sim loop is active
 *   isPaused        — whether the sim loop is paused
 *   isConnected     — WebSocket connection state
 *   actions         — { start, pause, resume, reset, stop, selectScenario }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useWebSocket } from './useWebSocket';

const HISTORY_MAX = 120;
const METRICS_POLL_MS = 500;

const DEFAULT_SCENARIOS = [
  { id: 'nominal', name: 'Nominal Satellite Pass (Low Jitter)' },
  { id: 'high_vibration', name: 'High Platform Vibration' },
  { id: 'cloud_turbulence', name: 'Atmospheric Turbulence & Scintillation' },
  { id: 'rapid_maneuver', name: 'Rapid Target Angular Maneuver' },
];

export function useSimulation() {
  const [telemetry, setTelemetry] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState('nominal');
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const metricsIntervalRef = useRef(null);
  const lastWsTimeRef = useRef(0);
  const tRef = useRef(0);
  const panRef = useRef(0);
  const tiltRef = useRef(0);

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  const handleTelemetry = useCallback((data) => {
    lastWsTimeRef.current = Date.now();
    setTelemetry(data);
    setIsRunning(true);

    // Append to chart history ring buffer
    setHistory(prev => [
      ...prev.slice(-(HISTORY_MAX - 1)),
      {
        timestamp: data.timestamp,
        total_error_px: data.total_error_px ?? 0,
        camera_pan: data.camera?.pan ?? 0,
        camera_tilt: data.camera?.tilt ?? 0,
        fps: data.fps ?? 0,
      }
    ]);
  }, []);

  const { isConnected, send } = useWebSocket({ onTelemetry: handleTelemetry });

  // ─── Initial Data Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    api.getScenarios()
      .then(fetched => {
        if (fetched && fetched.length > 0) setScenarios(fetched);
      })
      .catch(err => console.warn('[useSimulation] Could not fetch scenarios:', err));
  }, []);

  // ─── Demo Target Locking & Camera Motion Loop ─────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      // If WebSocket telemetry arrived recently (< 1200ms ago), let WS drive
      if (Date.now() - lastWsTimeRef.current < 1200) {
        return;
      }

      // Otherwise, run autonomous demo simulation tick
      tRef.current += 0.033;
      const t = tRef.current;

      // 1. Moving Optical Beacon Trajectory (3D orbit on focal plane)
      const freq = selectedScenarioId === 'rapid_maneuver' ? 1.1 : 0.6;
      const ampX = selectedScenarioId === 'high_vibration' ? 15.0 : 11.0;
      const ampY = selectedScenarioId === 'high_vibration' ? 9.0 : 6.0;

      const beaconX = ampX * Math.sin(t * freq) + 2.5 * Math.cos(t * freq * 2.1);
      const beaconY = ampY * Math.cos(t * freq * 0.8) + 1.5 * Math.sin(t * freq * 1.7);

      // Map to 3D world target position: camera at [0, 1.65, 0], focal plane at Z = 18.0
      const targetWorldX = beaconX * 0.35;
      const targetWorldY = 6.0 + beaconY * 0.35;
      const targetWorldZ = 18.0;

      const dx = targetWorldX - 0.0;
      const dy = targetWorldY - 1.65;
      const dz = targetWorldZ - 0.0;

      // 2. Compute exact Line-Of-Sight (LOS) pan & tilt angles
      const targetPan = Math.atan2(dx, dz) * (180 / Math.PI);
      const targetTilt = Math.atan2(dy, Math.hypot(dx, dz)) * (180 / Math.PI);

      // 3. Smooth Camera Gimbal Tracking Motion (locks onto target)
      const trackingSpeed = 0.14; // smooth exponential convergence
      const currentPan = panRef.current + (targetPan - panRef.current) * trackingSpeed;
      const currentTilt = tiltRef.current + (targetTilt - tiltRef.current) * trackingSpeed;

      panRef.current = currentPan;
      tiltRef.current = currentTilt;

      // 4. Compute pointing error and lock state
      const errPan = Math.abs(targetPan - currentPan);
      const errTilt = Math.abs(targetTilt - currentTilt);
      const errDeg = Math.hypot(errPan, errTilt);
      const errPx = errDeg * 26.0;

      const lockState = errPx < 18 ? 'LOCKED' : errPx < 45 ? 'SEARCHING' : 'LOST';

      const demoFrame = {
        timestamp: t,
        frame_index: Math.floor(t * 30),
        beacon_world: {
          x: beaconX,
          y: beaconY,
          vx: ampX * freq * Math.cos(t * freq),
          vy: -ampY * freq * 0.8 * Math.sin(t * freq * 0.8),
        },
        camera: {
          pan: currentPan,
          tilt: currentTilt,
          pan_rate: (targetPan - currentPan) * 6,
          tilt_rate: (targetTilt - currentTilt) * 6,
        },
        lock_state: lockState,
        total_error_px: errPx,
        total_error_deg: errDeg,
        fps: 30,
        is_demo: true,
      };

      setTelemetry(demoFrame);

      // Append chart history ring buffer
      setHistory(prev => [
        ...prev.slice(-(HISTORY_MAX - 1)),
        {
          timestamp: t,
          total_error_px: errPx,
          camera_pan: currentPan,
          camera_tilt: currentTilt,
          fps: 30,
        }
      ]);

      // Demo Metrics
      setMetrics({
        jitter_rms: (0.08 + 0.03 * Math.sin(t * 4)).toFixed(2),
        control_loop_hz: 30,
        tracking_accuracy_pct: Math.max(90, (99.8 - errPx * 0.2)).toFixed(1),
        latency_ms: (11.5 + 0.8 * Math.sin(t * 2)).toFixed(1),
        snr_db: (44.2 + Math.sin(t * 2)).toFixed(1),
        lock_duty_cycle_pct: (98.5).toFixed(1),
      });
    }, 33);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, selectedScenarioId]);

  // ─── Metrics Polling (for live backend) ──────────────────────────────────
  useEffect(() => {
    if (!isRunning || !isConnected) {
      clearInterval(metricsIntervalRef.current);
      return;
    }

    metricsIntervalRef.current = setInterval(() => {
      api.getCurrentMetrics()
        .then(setMetrics)
        .catch(() => {});
    }, METRICS_POLL_MS);

    return () => clearInterval(metricsIntervalRef.current);
  }, [isRunning, isConnected]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    send('start');
    setIsRunning(true);
    setIsPaused(false);
  }, [send]);

  const pause = useCallback(() => {
    send('pause');
    setIsPaused(true);
  }, [send]);

  const resume = useCallback(() => {
    send('resume');
    setIsPaused(false);
  }, [send]);

  const reset = useCallback(() => {
    send('reset');
    api.resetSimulation().catch(() => {});
    tRef.current = 0;
    panRef.current = 0;
    tiltRef.current = 0;
    setHistory([]);
    setTelemetry(null);
    setMetrics(null);
  }, [send]);

  const stop = useCallback(() => {
    send('stop');
    setIsRunning(false);
    setIsPaused(false);
  }, [send]);

  const selectScenario = useCallback((scenarioId) => {
    setSelectedScenarioId(scenarioId);
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario && isConnected) {
      api.updateConfig(scenario)
        .then(() => reset())
        .catch(err => console.warn('[useSimulation] Config update failed:', err));
    }
  }, [scenarios, isConnected, reset]);

  return {
    telemetry,
    metrics,
    history,
    scenarios,
    selectedScenarioId,
    isRunning,
    isPaused,
    isConnected,
    actions: { start, pause, resume, reset, stop, selectScenario },
  };
}

export default useSimulation;
