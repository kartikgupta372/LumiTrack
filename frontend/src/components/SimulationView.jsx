/**
 * SimulationView — The main simulation dashboard page.
 * Consumes the useSimulation hook and arranges all panels into the layout.
 */
import React, { useState, Suspense, lazy } from 'react';
import { Cpu } from 'lucide-react';

import CameraFeedCanvas from '../components/CameraFeedCanvas';
import ControlPanel from '../components/ControlPanel';
import DisturbancePanel from '../components/DisturbancePanel';
import StatusCard from '../components/StatusCard';
import TrackingStatus from '../components/TrackingStatus';
import MetricsPanel from '../components/MetricsPanel';
import AnalyticsCharts from '../components/AnalyticsCharts';
import ReportModal from '../components/ReportModal';

const Scene3D = lazy(() => import('../components/Scene3D'));

export default function SimulationView({
  telemetry,
  metrics,
  history,
  scenarios,
  selectedScenarioId,
  isRunning,
  isPaused,
  viewMode,
  isConnected,
  actions,
}) {
  const [disturbances, setDisturbances] = useState({
    noise: 0,
    vibration: 0,
    turbulence: 0,
    occlusion: false,
    occlusion_duration_s: 2.0,
  });

  const connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';

  return (
    <main className="flex-1 p-5 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">

      {/* ── LEFT: PRIMARY VISUALIZATION ──────────────────────────── */}
      <div className="lg:col-span-8 space-y-5">

        {/* Camera Feed or 3D Scene */}
        {viewMode === 'camera' ? (
          <CameraFeedCanvas telemetry={telemetry} isConnected={true} />
        ) : (
          <Suspense fallback={
            <div className="w-full aspect-[4/3] bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center text-gray-500 text-sm animate-pulse">
              Loading 3D Scene Engine...
            </div>
          }>
            <Scene3D telemetry={telemetry} />
          </Suspense>
        )}

        {/* Lock State & Telemetry Badge with Pipeline Connection Status */}
        <TrackingStatus telemetry={telemetry} connectionStatus={connectionStatus} />


        {/* Quick 4-tile Metric Bar */}
        <StatusCard metrics={metrics} telemetry={telemetry} />

        {/* Analytics Charts */}
        <AnalyticsCharts history={history} />

        {/* Detailed 6-tile Metrics Panel */}
        <MetricsPanel metrics={metrics} />
      </div>

      {/* ── RIGHT: MISSION CONTROL SIDEBAR ───────────────────────── */}
      <div className="lg:col-span-4 space-y-5">

        {/* Scenario + Simulation Actions */}
        <ControlPanel
          isRunning={isRunning}
          isPaused={isPaused}
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={actions.selectScenario}
          onStart={actions.start}
          onPause={actions.pause}
          onResume={actions.resume}
          onReset={actions.reset}
          onStop={actions.stop}
        />

        {/* Disturbance Stress Engine */}
        <DisturbancePanel disturbances={disturbances} onUpdate={setDisturbances} />

        {/* PDF Report Export */}
        <ReportModal metrics={metrics} scenarioName={selectedScenarioId} />

        {/* Architecture Info */}
        <div className="hud-card p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
          <div className="font-semibold text-gray-300 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Closed-Loop Architecture</span>
          </div>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            Synthetic Frame → <span className="text-cyan-400">OpenCV / YOLOv8-ONNX</span> Detection →{' '}
            <span className="text-blue-400">Kalman Prediction</span> →{' '}
            <span className="text-purple-400">PID Controller</span> →{' '}
            <span className="text-emerald-400">Gimbal Saturation</span> →{' '}
            <span className="text-amber-400">HITL Serial</span> → Telemetry
          </p>
        </div>
      </div>
    </main>
  );
}
