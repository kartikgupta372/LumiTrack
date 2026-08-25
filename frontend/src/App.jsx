/**
 * App.jsx — LumiTrack Root Component
 *
 * Architecture:
 *   useSimulation() hook  — all state, WS, and API logic
 *   <Navbar />            — header with view toggle + connection badge
 *   <SimulationView />    — full dashboard layout
 */

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SimulationView from './components/SimulationView';
import { useSimulation } from './hooks/useSimulation';

export default function App() {
  const [viewMode, setViewMode] = useState('camera'); // 'camera' | '3d'

  const {
    telemetry,
    metrics,
    history,
    scenarios,
    selectedScenarioId,
    disturbances,
    isRunning,
    isPaused,
    isConnected,
    actions,
  } = useSimulation();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <Navbar
        isConnected={isConnected}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <SimulationView
        telemetry={telemetry}
        metrics={metrics}
        history={history}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        disturbances={disturbances}
        isRunning={isRunning}
        isPaused={isPaused}
        isConnected={isConnected}
        viewMode={viewMode}
        actions={actions}
      />
    </div>
  );
}
