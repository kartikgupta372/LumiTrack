/**
 * LumiTrack REST API Service
 * Wraps all HTTP calls to the FastAPI backend at http://localhost:8000/api
 */

const API_BASE = 'http://localhost:8000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res;
}

// ─── Simulation Control ─────────────────────────────────────────────────────

export const api = {
  /** Fetch all predefined scenario presets */
  getScenarios: () => request('/scenarios').then(r => r.json()),

  /** Start the simulation loop */
  startSimulation: () => request('/simulation/start', { method: 'POST' }).then(r => r.json()),

  /** Pause the running simulation */
  pauseSimulation: () => request('/simulation/pause', { method: 'POST' }).then(r => r.json()),

  /** Resume a paused simulation */
  resumeSimulation: () => request('/simulation/resume', { method: 'POST' }).then(r => r.json()),

  /** Reset simulation state, counters, and history */
  resetSimulation: () => request('/simulation/reset', { method: 'POST' }).then(r => r.json()),

  /** Stop the simulation entirely */
  stopSimulation: () => request('/simulation/stop', { method: 'POST' }).then(r => r.json()),

  /** Push a new scenario config to the backend */
  updateConfig: (config) =>
    request('/simulation/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then(r => r.json()),

  // ─── Metrics ──────────────────────────────────────────────────────────────

  /** Get current performance metrics snapshot */
  getCurrentMetrics: () => request('/metrics/current').then(r => r.json()),

  // ─── Serial / HITL ────────────────────────────────────────────────────────

  /** List available COM/serial ports on the server machine */
  listSerialPorts: () => request('/serial/ports').then(r => r.json()),

  /** Connect to a COM port (auto-selects if port=null) */
  connectSerial: (port = null) => {
    const query = port ? `?port=${encodeURIComponent(port)}` : '';
    return request(`/serial/connect${query}`, { method: 'POST' }).then(r => r.json());
  },

  /** Disconnect from the serial gimbal driver */
  disconnectSerial: () => request('/serial/disconnect', { method: 'POST' }).then(r => r.json()),

  /** Get serial connection status */
  getSerialStatus: () => request('/serial/status').then(r => r.json()),

  // ─── Reports ──────────────────────────────────────────────────────────────

  /** Record a single telemetry frame into the PDF history buffer */
  recordTelemetryFrame: (error_px, pan_deg, tilt_deg, timestamp) =>
    fetch(`${API_BASE}/reports/record_frame?error_px=${error_px}&pan_deg=${pan_deg}&tilt_deg=${tilt_deg}&timestamp=${timestamp}`, {
      method: 'POST',
    }).catch(() => {}),

  /**
   * Generate and download a PDF performance report.
   * Returns a Blob so the caller can trigger a browser download.
   */
  generateReport: async () => {
    const res = await request('/reports/generate', { method: 'POST' });
    if (!res.ok) throw new Error('Report generation failed');
    return res.blob();
  },

  /** Helper: trigger browser download of a PDF blob */
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── Health ───────────────────────────────────────────────────────────────

  /** Backend health check */
  health: () => request('/health').then(r => r.json()),
};

export default api;
