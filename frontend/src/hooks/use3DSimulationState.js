/**
 * hooks/use3DSimulationState.js
 *
 * React hook that manages the authoritative 3D Virtual World Simulation State
 * on the frontend.
 *
 * Separates raw state (source, target, environment) from derived geometry
 * (distance, bearing, pointing error, FOV intersection).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createVirtualWorldState,
  updateStateFromTelemetry,
  serializeSimulationState,
} from '../simulation';

export function use3DSimulationState(telemetry = null, scenarioConfig = null) {
  const [worldState, setWorldState] = useState(() => createVirtualWorldState());

  // Update virtual world state whenever new WebSocket telemetry arrives
  useEffect(() => {
    if (!telemetry) return;
    setWorldState((prevState) =>
      updateStateFromTelemetry(prevState, telemetry, scenarioConfig)
    );
  }, [telemetry, scenarioConfig]);

  // Memoized serialization helper
  const serializedState = useMemo(
    () => serializeSimulationState(worldState),
    [worldState]
  );

  const serializeState = useCallback(() => {
    return serializeSimulationState(worldState);
  }, [worldState]);

  return {
    worldState,
    raw: worldState.raw,
    derived: worldState.derived,
    serializedState,
    serializeState,
    setWorldState,
  };
}

export default use3DSimulationState;
