import { Pause, Play, RotateCcw, Square, Zap } from "lucide-react";

export default function SimulationControls({
  running,
  paused,
  scenario,
  setScenario,
  speed,
  setSpeed,
  onStart,
  onPause,
  onStop,
  onReset,
}) {
  return (
    <section className="panel controls-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CONTROL</span>
          <h2>Simulation</h2>
        </div>
        <Zap size={18} />
      </div>

      <div className="button-row">
        <button className="btn primary" onClick={onStart} disabled={running && !paused}>
          <Play size={16} /> Start
        </button>
        <button className="btn" onClick={onPause} disabled={!running}>
          <Pause size={16} /> {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn danger" onClick={onStop} disabled={!running}>
          <Square size={15} /> Stop
        </button>
        <button className="icon-btn" title="Reset" onClick={onReset}>
          <RotateCcw size={16} />
        </button>
      </div>

      <label className="field">
        <span>Trajectory</span>
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="sinusoidal">Sinusoidal</option>
          <option value="straight">Straight Line</option>
          <option value="circular">Circular</option>
          <option value="random">Random / Erratic</option>
        </select>
      </label>

      <label className="field">
        <span>Target speed <b>{speed.toFixed(1)}×</b></span>
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
    </section>
  );
}