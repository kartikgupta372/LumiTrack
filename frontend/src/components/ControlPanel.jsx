import React from 'react';
import { Play, Pause, RotateCcw, Square, Settings2 } from 'lucide-react';

/**
 * ControlPanel — Compact mission control panel with scenario picker
 * and play/pause/reset/stop action buttons.
 *
 * This is the re-usable variant; SimulationControls.jsx is an alias.
 */
export default function ControlPanel({
  isRunning,
  isPaused,
  scenarios = [],
  selectedScenarioId,
  onSelectScenario,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
}) {
  return (
    <div className="hud-card p-5 rounded-xl border border-gray-800 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3">
        <Settings2 className="w-4 h-4 text-cyan-400" />
        <span>Mission Control</span>
        {isRunning && (
          <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isPaused
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
          }`}>
            {isPaused ? '⏸ PAUSED' : '▶ RUNNING'}
          </span>
        )}
      </div>

      {/* Scenario Selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400 font-mono">Benchmark Scenario</label>
        <select
          id="scenario-select"
          value={selectedScenarioId}
          onChange={(e) => onSelectScenario?.(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {scenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>{sc.name}</option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {!isRunning ? (
          <button
            id="btn-start"
            onClick={onStart}
            className="col-span-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START SIMULATION</span>
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                id="btn-resume"
                onClick={onResume}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RESUME</span>
              </button>
            ) : (
              <button
                id="btn-pause"
                onClick={onPause}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </button>
            )}
            <button
              id="btn-reset"
              onClick={onReset}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
            <button
              id="btn-stop"
              onClick={onStop}
              className="bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
