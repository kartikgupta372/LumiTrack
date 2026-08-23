import React from 'react';
import { Activity, Clock, Crosshair, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

function MetricTile({ label, value, unit, icon: Icon, color }) {
  return (
    <div className="hud-card p-4 rounded-xl flex flex-col justify-between">
      <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
        <span>{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${color.replace('text-', 'text-').replace('-400', '-300')}`}>
        {value !== undefined && value !== null ? `${value}${unit}` : '--'}
      </div>
    </div>
  );
}

/**
 * MetricsPanel — Grid of live performance metric tiles.
 * Used as an alias for StatusCard and as a standalone component in pages.
 */
export default function MetricsPanel({ metrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <MetricTile
        label="Lock Retention"
        value={metrics?.lock_retention_rate}
        unit="%"
        icon={ShieldCheck}
        color="text-cyan-400"
      />
      <MetricTile
        label="Acquisition Time"
        value={metrics?.acquisition_time_s}
        unit="s"
        icon={Clock}
        color="text-emerald-400"
      />
      <MetricTile
        label="Mean Error"
        value={metrics?.average_error_px}
        unit=" px"
        icon={Crosshair}
        color="text-amber-400"
      />
      <MetricTile
        label="Max Error"
        value={metrics?.max_error_px}
        unit=" px"
        icon={TrendingUp}
        color="text-rose-400"
      />
      <MetricTile
        label="Frame Rate"
        value={metrics?.effective_fps}
        unit=" FPS"
        icon={Zap}
        color="text-blue-400"
      />
      <MetricTile
        label="Avg Latency"
        value={metrics?.avg_processing_latency_ms}
        unit=" ms"
        icon={Activity}
        color="text-purple-400"
      />
    </div>
  );
}
