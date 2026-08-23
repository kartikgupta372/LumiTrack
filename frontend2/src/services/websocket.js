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
