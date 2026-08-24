/**
 * TrackingStatus — Compact lock-state badge + telemetry readouts.
 * Shows LOCKED / SEARCHING / LOST with color, plus raw pan/tilt/error values.
 */
import React from 'react';
import { Target, ShieldAlert, Search } from 'lucide-react';

const STATE_CONFIG = {
  LOCKED: {
    icon: Target,
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    label: '🔒 TARGET LOCKED',
  },
  SEARCHING: {
    icon: Search,
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    label: '⟳ SEARCHING',
  },
  LOST: {
    icon: ShieldAlert,
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    label: '✕ TARGET LOST',
  },
};

const CONN_CONFIG = {
  CONNECTED: { label: 'CONNECTED', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-400' },
  CONNECTING: { label: 'CONNECTING', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse', dot: 'bg-sky-400 animate-ping' },
  DEGRADED: { label: 'DEGRADED', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse', dot: 'bg-amber-400 animate-ping' },
  DISCONNECTED: { label: 'DISCONNECTED', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', dot: 'bg-rose-500' },
};

export default function TrackingStatus({ telemetry, connectionStatus = 'CONNECTED' }) {
  const lockState = telemetry?.lock_state ?? 'SEARCHING';
  const cfg = STATE_CONFIG[lockState] ?? STATE_CONFIG.SEARCHING;
  const Icon = cfg.icon;

  const connCfg = CONN_CONFIG[connectionStatus] ?? CONN_CONFIG.CONNECTED;

  return (
    <div className={`hud-card rounded-xl border p-4 ${cfg.bg} ${cfg.border} space-y-3`}>
      {/* State Badge & Connection Status */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 font-mono font-bold text-sm ${cfg.text}`}>
          <Icon className="w-4 h-4" />
          <span>{cfg.label}</span>
        </div>

        {/* Observation Pipeline Connection Status */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono ${connCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connCfg.dot}`} />
          <span>PIPELINE: <strong>{connCfg.label}</strong></span>
        </div>
      </div>

      {/* Telemetry Grid */}
      {telemetry && (
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="bg-gray-900/60 rounded-lg px-2 py-1.5">
            <div className="text-gray-500 text-[10px]">PAN</div>
            <div className="text-cyan-300 font-semibold">{telemetry.camera?.pan?.toFixed(2) ?? '--'}°</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg px-2 py-1.5">
            <div className="text-gray-500 text-[10px]">TILT</div>
            <div className="text-cyan-300 font-semibold">{telemetry.camera?.tilt?.toFixed(2) ?? '--'}°</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg px-2 py-1.5">
            <div className="text-gray-500 text-[10px]">ERROR</div>
            <div className={`font-semibold ${(telemetry.total_error_px ?? 999) < 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {telemetry.total_error_px?.toFixed(1) ?? '--'} px
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

