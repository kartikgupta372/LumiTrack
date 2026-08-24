/**
 * hooks/useObservationPipeline.js
 *
 * React hook that binds the ObservationClient service to React component lifecycle.
 * Manages connection status (CONNECTED, CONNECTING, DEGRADED, DISCONNECTED),
 * telemetry updates, observation rate-limiting, and sequence validation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ObservationClient, ConnectionStatus } from '../services/observationClient';

export function useObservationPipeline(url = null) {
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [telemetry, setTelemetry] = useState(null);

  const clientRef = useRef(null);

  useEffect(() => {
    const client = new ObservationClient({
      url,
      onTelemetry: (frame) => {
        setTelemetry(frame);
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [url]);

  const submitObservation = useCallback((virtualWorldState) => {
    clientRef.current?.submitObservation(virtualWorldState);
  }, []);

  const sendAction = useCallback((action) => {
    clientRef.current?.sendAction(action);
  }, []);

  return {
    connectionStatus,
    telemetry,
    submitObservation,
    sendAction,
    sessionId: clientRef.current?.sessionId || '',
  };
}

export default useObservationPipeline;
