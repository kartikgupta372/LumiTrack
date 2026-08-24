/**
 * useWebSocket — React hook that manages the SimulationWebSocket lifecycle.
 *
 * Returns:
 *   isConnected — live connection status
 *   send(action) — send a control action to the WS backend
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import SimulationWebSocket from '../services/websocket';

export function useWebSocket({ onTelemetry }) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new SimulationWebSocket({
      onTelemetry,
      onConnected: () => setIsConnected(true),
      onDisconnected: () => setIsConnected(false),
    });

    wsRef.current = ws;
    ws.connect();

    return () => ws.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((action) => {
    wsRef.current?.send(action);
  }, []);

  return { isConnected, send };
}

export default useWebSocket;
