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

export function useSimulation() {
  const [telemetry, setTelemetry] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('nominal');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const metricsIntervalRef = useRef(null);

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  const handleTelemetry = useCallback((data) => {
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
      .then(setScenarios)
      .catch(err => console.warn('[useSimulation] Could not fetch scenarios:', err));
  }, []);

  // ─── Metrics Polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      clearInterval(metricsIntervalRef.current);
      return;
    }

    metricsIntervalRef.current = setInterval(() => {
      api.getCurrentMetrics()
        .then(setMetrics)
        .catch(() => {});
    }, METRICS_POLL_MS);

    return () => clearInterval(metricsIntervalRef.current);
  }, [isRunning]);

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
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setSelectedScenarioId(scenarioId);
    api.updateConfig(scenario)
      .then(() => reset())
      .catch(err => console.warn('[useSimulation] Config update failed:', err));
  }, [scenarios, reset]);

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
