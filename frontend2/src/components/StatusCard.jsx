import {
  Activity,
  Crosshair,
  Gauge,
  Target,
  Timer,
  RotateCcw,
} from "lucide-react";

const cards = [
  ["FPS", "fps", Gauge],
  ["ALIGNMENT ERROR", "error", Crosshair],
  ["PAN ANGLE", "pan", RotateCcw],
  ["TILT ANGLE", "tilt", RotateCcw],
  ["ACQUISITION", "acquisitionTime", Timer],
  ["CONFIDENCE", "confidence", Target],
];

function formatValue(key, value) {
  if (key === "fps") return `${Number(value || 0).toFixed(0)}`;
  if (key === "error") return `${Number(value || 0).toFixed(2)} mrad`;
  if (key === "pan" || key === "tilt") {
    return `${Number(value || 0).toFixed(2)}°`;
  }
  if (key === "acquisitionTime") {
    return value == null ? "--" : `${Number(value).toFixed(2)}s`;
  }
  if (key === "confidence") {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  return value ?? "--";
}

export default function StatusCard({ metrics }) {
  return (
    <section className="status-grid">
      <div
        className={`lock-card ${
          metrics.locked ? "locked" : "searching"
        }`}
      >
        <div className="lock-icon">
          <Activity size={19} />
        </div>

        <div>
          <span className="eyebrow">TRACKING STATUS</span>

          <strong>
            {metrics.locked
              ? "LOCKED"
              : metrics.detected
              ? "TRACKING"
              : "SEARCHING"}
          </strong>
        </div>

        <span className="status-dot" />
      </div>

      {cards.map(([label, key, Icon]) => (
        <div className="metric-card" key={key}>
          <div className="metric-top">
            <span>{label}</span>

            <Icon size={14} />
          </div>

          <strong>{formatValue(key, metrics[key])}</strong>
        </div>
      ))}
    </section>
  );
}
