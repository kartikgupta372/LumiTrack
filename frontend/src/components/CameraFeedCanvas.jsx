import React from 'react';
import { Target, ShieldAlert, Crosshair } from 'lucide-react';

export default function CameraFeedCanvas({ telemetry, isConnected }) {
  if (!telemetry) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-950 rounded-xl border border-gray-800 flex flex-col items-center justify-center p-6 text-gray-500 relative overflow-hidden">
        <Crosshair className="w-16 h-16 stroke-[1] mb-3 text-cyan-500/40 animate-pulse" />
        <p className="text-sm font-medium">Awaiting Telemetry Stream...</p>
        <span className="text-xs text-gray-600 mt-1">Connect to WebSocket Backend at ws://localhost:8000/ws/simulation</span>
      </div>
    );
  }

  const isLocked = telemetry.lock_state === 'LOCKED';
  const isLost = telemetry.lock_state === 'LOST';

  // Compute 2D focal-plane offset for synthetic camera view reticle
  const beaconX = telemetry.beacon_world?.x ?? 0;
  const beaconY = telemetry.beacon_world?.y ?? 0;
  // Offset in percentage from center
  const offsetXPercent = Math.max(-42, Math.min(42, beaconX * 2.2));
  const offsetYPercent = Math.max(-42, Math.min(42, -beaconY * 2.2));

  return (
    <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-gray-800 shadow-2xl group">
      {/* ── 1. Live Frame image (if provided by backend) OR Synthetic Tactical Scope ── */}
      {telemetry.image_base64 ? (
        <img
          src={`data:image/jpeg;base64,${telemetry.image_base64}`}
          alt="FSOC Camera Stream"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="relative w-full h-full bg-[#030712] overflow-hidden flex items-center justify-center">
          {/* Tactical Scope Radial Grid Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute w-[80%] h-[80%] rounded-full border border-cyan-500/20 pointer-events-none" />
          <div className="absolute w-[50%] h-[50%] rounded-full border border-cyan-500/15 pointer-events-none" />
          <div className="absolute w-[25%] h-[25%] rounded-full border border-cyan-500/10 pointer-events-none" />

          {/* Crosshair Grid Lines */}
          <div className="absolute w-full h-[1px] bg-cyan-500/30" />
          <div className="absolute h-full w-[1px] bg-cyan-500/30" />

          {/* Center Boresight Indicator */}
          <div className="absolute w-6 h-6 border border-cyan-400/80 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full" />
          </div>

          {/* Dynamic Target Beacon Tracking Reticle */}
          <div
            className="absolute transition-all duration-75 ease-out flex flex-col items-center justify-center pointer-events-none"
            style={{
              left: `calc(50% + ${offsetXPercent}%)`,
              top: `calc(50% + ${offsetYPercent}%)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Pulsing Beacon Halo */}
            <div className={`w-12 h-12 rounded-full border-2 border-dashed animate-spin ${
              isLocked ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400'
            }`} style={{ animationDuration: '4s' }} />

            {/* Glowing Core */}
            <div className={`absolute w-3 h-3 rounded-full ${
              isLocked ? 'bg-emerald-400 shadow-[0_0_12px_#22c55e]' : 'bg-cyan-400 shadow-[0_0_12px_#06b6d4]'
            }`} />

            {/* Lock Bounding Box & Label */}
            <div className={`absolute -inset-4 border-2 rounded ${
              isLocked ? 'border-emerald-400/90 bg-emerald-500/10' : 'border-amber-400/80 bg-amber-500/10'
            }`}>
              <div className="absolute -top-4 left-0 text-[8px] font-mono font-bold px-1 rounded bg-slate-900 border border-current whitespace-nowrap">
                {isLocked ? 'TARGET LOCK ACTIVE' : 'ACQUIRING BEACON'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Top HUD Telemetry Overlay ── */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-gray-300">{telemetry.is_demo ? 'DEMO TRACKING FEED' : 'LIVE FEED'}</span>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-400 font-semibold">{telemetry.fps || 30} FPS</span>
        </div>

        <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-bold flex items-center gap-2 ${
          isLocked
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : isLost
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
            : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
        }`}>
          {isLocked ? <Target className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span>{telemetry.lock_state || 'SEARCHING'}</span>
        </div>
      </div>

      {/* ── 3. Bottom HUD Coordinates Overlay ── */}
      <div className="absolute bottom-3 left-3 right-3 bg-gray-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex justify-between items-center text-xs font-mono pointer-events-none z-10">
        <div className="flex gap-4">
          <div>
            <span className="text-gray-500 block text-[10px]">PAN ANGLE</span>
            <span className="text-cyan-300 font-semibold">{telemetry.camera?.pan?.toFixed(2) ?? '0.00'}°</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">TILT ANGLE</span>
            <span className="text-cyan-300 font-semibold">{telemetry.camera?.tilt?.toFixed(2) ?? '0.00'}°</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-gray-500 block text-[10px]">TRACKING ERROR</span>
          <span className={`font-semibold ${(telemetry.total_error_px ?? 0) < 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {telemetry.total_error_px?.toFixed(1) ?? '0.0'} px ({(telemetry.total_error_deg ?? 0).toFixed(2)}°)
          </span>
        </div>
      </div>
    </div>
  );
}
