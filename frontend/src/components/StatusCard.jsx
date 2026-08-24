<<<<<<< HEAD
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
      
      {/* TRACKING STATUS */}
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

      {/* TELEMETRY CARDS */}
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
=======
import React from 'react';
import { Activity, Clock, Crosshair, Zap, ShieldCheck } from 'lucide-react';

export default function StatusCard({ metrics, telemetry }) {
  const isLocked = telemetry?.lock_state === 'LOCKED';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Lock Retention Metric */}
      <div className="hud-card p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
          <span>Lock Retention</span>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-cyan-300">
          {metrics?.lock_retention_rate !== undefined ? `${metrics.lock_retention_rate}%` : '--'}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">Frames inside lock threshold</div>
      </div>

      {/* Acquisition Time */}
      <div className="hud-card p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
          <span>Acquisition Time</span>
          <Clock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-300">
          {metrics?.acquisition_time_s !== null && metrics?.acquisition_time_s !== undefined
            ? `${metrics.acquisition_time_s}s`
            : 'Searching...'}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">First valid lock timestamp</div>
      </div>

      {/* Mean Tracking Error */}
      <div className="hud-card p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
          <span>Mean Error</span>
          <Crosshair className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-amber-300">
          {metrics?.average_error_px !== undefined ? `${metrics.average_error_px} px` : '--'}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">Avg displacement from center</div>
      </div>

      {/* Frame Rate & Latency */}
      <div className="hud-card p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
          <span>Processing Latency</span>
          <Activity className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-purple-300">
          {metrics?.avg_processing_latency_ms !== undefined ? `${metrics.avg_processing_latency_ms} ms` : '--'}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">CV & Control update time</div>
      </div>
    </div>
  );
}
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
