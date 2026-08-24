<<<<<<< HEAD
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/simulation";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : response.text();
}

export function createSimulationSocket({ onMessage, onOpen, onClose, onError }) {
  const socket = new WebSocket(WS_URL);

  socket.onopen = onOpen;
  socket.onclose = onClose;
  socket.onerror = onError;
  socket.onmessage = (event) => {
    try {
      onMessage?.(JSON.parse(event.data));
    } catch {
      console.warn("Invalid WebSocket JSON:", event.data);
    }
  };

  return {
    socket,
    send(payload) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    },
    close() {
      socket.close();
    },
  };
}

export { API_URL, WS_URL };
=======
/**
 * LumiTrack WebSocket Service
 * Manages a persistent, auto-reconnecting WebSocket connection
 * to the simulation telemetry stream at ws://localhost:8000/ws/simulation.
 */

const WS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL)
  ? import.meta.env.VITE_WS_URL
  : 'ws://localhost:8000/ws/simulation';
const RECONNECT_DELAY_MS = 2000;


export class SimulationWebSocket {
  constructor({ onTelemetry, onConnected, onDisconnected }) {
    this._onTelemetry = onTelemetry;
    this._onConnected = onConnected;
    this._onDisconnected = onDisconnected;

    this._socket = null;
    this._shouldReconnect = true;
    this._reconnectTimer = null;
  }

  /** Open the WebSocket connection */
  connect() {
    this._shouldReconnect = true;
    this._open();
  }

  /** Permanently close the connection (no reconnect) */
  disconnect() {
    this._shouldReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
  }

  /**
   * Send a control action message to the backend.
   * @param {'start'|'pause'|'resume'|'reset'|'stop'} action
   */
  send(action) {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify({ action }));
    }
  }

  get isConnected() {
    return this._socket?.readyState === WebSocket.OPEN;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _open() {
    if (this._socket) return;

    const ws = new WebSocket(WS_URL);
    this._socket = ws;

    ws.onopen = () => {
      console.log('[LumiTrack WS] Connected to telemetry stream.');
      this._onConnected?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._onTelemetry?.(data);
      } catch (e) {
        console.error('[LumiTrack WS] Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      console.warn('[LumiTrack WS] Connection closed.');
      this._socket = null;
      this._onDisconnected?.();

      if (this._shouldReconnect) {
        console.log(`[LumiTrack WS] Reconnecting in ${RECONNECT_DELAY_MS}ms...`);
        this._reconnectTimer = setTimeout(() => this._open(), RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (err) => {
      console.error('[LumiTrack WS] Error:', err);
    };
  }
}

export default SimulationWebSocket;
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
