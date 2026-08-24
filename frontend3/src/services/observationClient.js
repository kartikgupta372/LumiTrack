/**
 * services/observationClient.js — Observation Pipeline Service for LumiTrack 3D Simulator
 *
 * ARCHITECTURE & BOUNDARIES:
 * ─────────────────────────────────────────────────────────────────────────────
 * - The frontend 3D simulator generates virtual world observations.
 * - The backend receives these observations and performs tracking/control calculations.
 * - The frontend does NOT generate alignment corrections independently.
 * - Centralizes communication in a dedicated service layer (decoupled from Three.js components).
 * - Rate-limits observation transmissions independently from render FPS.
 * - Supports request sequence numbers to discard stale responses.
 * - Connection status states: CONNECTED | CONNECTING | DEGRADED | DISCONNECTED
 */

const DEFAULT_WS_URL = 'ws://localhost:8000/ws/simulation';
const OBSERVATION_RATE_HZ = 20; // 20 Hz observation transmission rate (decoupled from 60 FPS render)
const LATENCY_DEGRADED_THRESHOLD_MS = 250;
const RECONNECT_INTERVAL_MS = 2000;

export const ConnectionStatus = {
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  DEGRADED: 'DEGRADED',
  DISCONNECTED: 'DISCONNECTED',
};

export class ObservationClient {
  constructor({ url = null, onTelemetry = null, onStatusChange = null }) {
    // Configurable endpoint via env var with fallback
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_WS_URL : null;
    this.url = url || envUrl || DEFAULT_WS_URL;

    this._onTelemetry = onTelemetry;
    this._onStatusChange = onStatusChange;

    this.socket = null;
    this.status = ConnectionStatus.DISCONNECTED;
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sequenceNumber = 0;
    this.lastAppliedSequence = -1;

    this.shouldReconnect = true;
    this.reconnectTimer = null;
    this.sendTimer = null;

    this.pendingStateBuffer = null;
    this.sentTimestamps = new Map(); // sequenceNumber -> timestamp sent
    this.latencyHistory = [];
  }

  // ─── Lifecycle Methods ───────────────────────────────────────────────────

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldReconnect = true;
    this._setStatus(ConnectionStatus.CONNECTING);
    this._openSocket();
    this._startRateLimitedLoop();
  }

  disconnect() {
    this.shouldReconnect = false;
    this._stopRateLimitedLoop();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this._setStatus(ConnectionStatus.DISCONNECTED);
  }

  // ─── Observation Submission ─────────────────────────────────────────────

  /**
   * Queue a VirtualWorldState observation for transmission.
   * Rate-limited independently from render loop.
   * @param {object} virtualWorldState - VirtualWorldState ({ raw, derived })
   */
  submitObservation(virtualWorldState) {
    if (!virtualWorldState || !virtualWorldState.raw) return;
    this.pendingStateBuffer = virtualWorldState;
  }

  /**
   * Send control actions to the simulation backend.
   * @param {'start'|'pause'|'resume'|'reset'|'stop'} action
   */
  sendAction(action) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action }));
    }
  }

  // ─── Private Implementation ──────────────────────────────────────────────

  _setStatus(newStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this._onStatusChange?.(newStatus);
  }

  _openSocket() {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log(`[ObservationClient] Connected to ${this.url} (Session: ${this.sessionId})`);
        this._setStatus(ConnectionStatus.CONNECTED);
      };

      this.socket.onmessage = (event) => {
        this._handleServerResponse(event.data);
      };

      this.socket.onclose = () => {
        console.warn('[ObservationClient] Socket disconnected');
        this.socket = null;
        this._setStatus(ConnectionStatus.DISCONNECTED);

        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => {
            this._setStatus(ConnectionStatus.CONNECTING);
            this._openSocket();
          }, RECONNECT_INTERVAL_MS);
        }
      };

      this.socket.onerror = (err) => {
        console.error('[ObservationClient] Socket error:', err);
        if (this.status === ConnectionStatus.CONNECTED) {
          this._setStatus(ConnectionStatus.DEGRADED);
        }
      };
    } catch (err) {
      console.error('[ObservationClient] Failed to open WebSocket:', err);
      this._setStatus(ConnectionStatus.DISCONNECTED);
    }
  }

  _startRateLimitedLoop() {
    if (this.sendTimer) clearInterval(this.sendTimer);
    const intervalMs = 1000 / OBSERVATION_RATE_HZ;

    this.sendTimer = setInterval(() => {
      this._flushPendingObservation();
    }, intervalMs);
  }

  _stopRateLimitedLoop() {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
  }

  _flushPendingObservation() {
    if (!this.pendingStateBuffer || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const state = this.pendingStateBuffer;
    this.pendingStateBuffer = null; // consume buffer

    this.sequenceNumber += 1;
    const seq = this.sequenceNumber;
    const now = performance.now();

    // Format structured observation payload
    const observationPayload = {
      action: 'observation',
      sessionId: this.sessionId,
      sequenceNumber: seq,
      timestamp: state.raw.timestamp || Date.now() / 1000,

      // SOURCE / CAMERA
      source: {
        position: state.raw.source.worldPosition,
        pan: state.raw.source.pan,
        tilt: state.raw.source.tilt,
        panRate: state.raw.source.panRate,
        tiltRate: state.raw.source.tiltRate,
        fov: state.raw.source.fov,
      },

      // TARGET
      target: {
        position: state.raw.target.worldPosition,
        velocity: state.raw.target.velocity,
        trajectoryType: state.raw.target.trajectoryState.type,
        dimensions: state.raw.target.dimensions,
      },

      // DERIVED GEOMETRY
      derivedGeometry: {
        relativeVector: state.derived.relativeVector,
        distance: state.derived.distance,
        horizontalBearing: state.derived.horizontalBearing,
        verticalBearing: state.derived.verticalBearing,
        pointingDirection: state.derived.pointingDirection,
        targetLOSVector: state.derived.targetLOSVector,
        pointingErrorDeg: state.derived.pointingErrorDeg,
        isTargetInFOV: state.derived.isTargetInFOV,
      },

      // ENVIRONMENT DISTURBANCES
      environment: state.raw.environment,
    };

    try {
      this.sentTimestamps.set(seq, now);
      this.socket.send(JSON.stringify(observationPayload));
    } catch (err) {
      console.warn('[ObservationClient] Send error:', err);
      this._setStatus(ConnectionStatus.DEGRADED);
    }
  }

  _handleServerResponse(rawJson) {
    let responseData;
    try {
      responseData = JSON.parse(rawJson);
    } catch (err) {
      console.error('[ObservationClient] Invalid JSON response:', err);
      return;
    }

    // Validate response schema
    if (!this._validateBackendResponse(responseData)) {
      console.warn('[ObservationClient] Dropping invalid backend response schema');
      return;
    }

    // Stale / Out-of-order check
    const responseSeq = responseData.sequenceNumber ?? responseData.frame_index;
    if (typeof responseSeq === 'number' && responseSeq < this.lastAppliedSequence) {
      console.warn(`[ObservationClient] Dropping stale response seq ${responseSeq} < lastApplied ${this.lastAppliedSequence}`);
      return;
    }

    if (typeof responseSeq === 'number') {
      this.lastAppliedSequence = responseSeq;
      const sentTime = this.sentTimestamps.get(responseSeq);
      if (sentTime) {
        const roundtripMs = performance.now() - sentTime;
        this.sentTimestamps.delete(responseSeq);
        this._updateLatencyStats(roundtripMs);
      }
    }

    // Clean validated data passed to consumer
    this._onTelemetry?.(responseData);
  }

  _validateBackendResponse(data) {
    if (!data || typeof data !== 'object') return false;

    // Check numerical safety (avoid NaN / Infinity poisoning UI)
    if (data.total_error_deg !== undefined && (isNaN(data.total_error_deg) || !isFinite(data.total_error_deg))) {
      return false;
    }
    if (data.camera) {
      if (isNaN(data.camera.pan) || isNaN(data.camera.tilt)) return false;
    }
    if (data.beacon_world) {
      if (isNaN(data.beacon_world.x) || isNaN(data.beacon_world.y)) return false;
    }

    return true;
  }

  _updateLatencyStats(rttMs) {
    this.latencyHistory.push(rttMs);
    if (this.latencyHistory.length > 20) this.latencyHistory.shift();

    const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

    if (avgLatency > LATENCY_DEGRADED_THRESHOLD_MS) {
      this._setStatus(ConnectionStatus.DEGRADED);
    } else if (this.status === ConnectionStatus.DEGRADED && avgLatency <= LATENCY_DEGRADED_THRESHOLD_MS) {
      this._setStatus(ConnectionStatus.CONNECTED);
    }
  }
}

export default ObservationClient;
