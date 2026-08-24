import { Activity, Crosshair, Gauge, RotateCcw, Target, Timer } from "lucide-react";

export default function StatusBar({ sim }) {
  const lockClass = sim.occluded ? "searching" : sim.locked ? "locked" : sim.detected ? "tracking" : "searching";
  const stateText = sim.occluded ? "OCCLUDED" : sim.locked ? "LOCKED" : sim.detected ? "TRACKING" : "SEARCHING";

  return (
    <section className="status-grid">
      {/* Lock status */}
      <div className={`lock-card ${lockClass}`}>
        <div className="lock-icon"><Activity size={18} /></div>
        <div>
          <span className="eyebrow">TRACKING STATE</span>
          <strong>{stateText}</strong>
        </div>
        <span className="status-dot" />
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>FPS</span><Gauge size={13} /></div>
        <strong className={sim.fps < 45 ? "warn" : "good"}>{sim.fps}</strong>
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>TRACK ERROR</span><Crosshair size={13} /></div>
        <strong className={sim.errorDeg > 1 ? "alert" : sim.errorDeg > 0.5 ? "warn" : "good"}>
          {sim.errorDeg.toFixed(3)}°
        </strong>
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>PAN</span><RotateCcw size={13} /></div>
        <strong>{sim.pan.toFixed(2)}°</strong>
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>TILT</span><RotateCcw size={13} /></div>
        <strong>{sim.tilt.toFixed(2)}°</strong>
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>LOCK RETENTION</span><Target size={13} /></div>
        <strong className={sim.lockRetention > 90 ? "good" : sim.lockRetention > 70 ? "warn" : "alert"}>
          {sim.lockRetention.toFixed(1)}%
        </strong>
      </div>

      <div className="metric-card">
        <div className="metric-top"><span>AVG ERROR</span><Timer size={13} /></div>
        <strong>{sim.avgError.toFixed(3)}°</strong>
      </div>
    </section>
  );
}
