import { Pause, Play, RotateCcw, Square, Zap } from "lucide-react";

const SCENARIOS = [
  { id: "stationary",  label: "Stationary (Fixed Offset)" },
  { id: "circular",    label: "Circular Orbit" },
  { id: "linear",      label: "Linear (Bounce)" },
  { id: "sinusoidal",  label: "Sinusoidal (Lissajous)" },
  { id: "erratic",     label: "Erratic / Random Waypoint" },
];

export default function SimControls({
  running, paused, scenario, setScenario, speed, setSpeed,
  onStart, onPause, onStop, onReset,
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CONTROL</span>
          <h2 style={{fontSize:14,margin:0}}>Simulation</h2>
        </div>
        <Zap size={16} />
      </div>

      <div className="button-row">
        <button className="btn primary" onClick={onStart} disabled={running && !paused}>
          <Play size={14} /> {paused ? "Resume" : "Start"}
        </button>
        <button className="btn" onClick={onPause} disabled={!running}>
          <Pause size={14} /> {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn danger" onClick={onStop} disabled={!running}>
          <Square size={13} /> Stop
        </button>
        <button className="icon-btn" title="Reset" onClick={onReset}>
          <RotateCcw size={15} />
        </button>
      </div>

      <label className="field">
        <span>Trajectory Mode</span>
        <select value={scenario} onChange={e => setScenario(e.target.value)}>
          {SCENARIOS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Speed <b>{speed.toFixed(1)}×</b></span>
        <input type="range" min="0.2" max="3" step="0.1"
          value={speed} onChange={e => setSpeed(Number(e.target.value))} />
      </label>
    </section>
  );
}
