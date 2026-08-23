import React from 'react';
import { Target, ShieldAlert, Crosshair, Eye } from 'lucide-react';

export default function CameraFeedCanvas({ telemetry, isConnected }) {
  if (!telemetry || !telemetry.image_base64) {
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

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl group">
      {/* Live Base64 Frame */}
      <img
        src={`data:image/jpeg;base64,${telemetry.image_base64}`}
        alt="FSOC Camera Stream"
        className="w-full h-full object-cover"
      />

      {/* Top HUD Telemetry Overlay */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-gray-300">LIVE FEED</span>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-400 font-semibold">{telemetry.fps} FPS</span>
        </div>

        <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-bold flex items-center gap-2 ${
          isLocked
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : isLost
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
            : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
        }`}>
          {isLocked ? <Target className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span>{telemetry.lock_state}</span>
        </div>
      </div>

      {/* Bottom HUD Coordinates Overlay */}
      <div className="absolute bottom-3 left-3 right-3 bg-gray-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex justify-between items-center text-xs font-mono pointer-events-none">
        <div className="flex gap-4">
          <div>
            <span className="text-gray-500 block text-[10px]">PAN ANGLE</span>
            <span className="text-cyan-300 font-semibold">{telemetry.camera?.pan?.toFixed(2)}°</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">TILT ANGLE</span>
            <span className="text-cyan-300 font-semibold">{telemetry.camera?.tilt?.toFixed(2)}°</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-gray-500 block text-[10px]">TRACKING ERROR</span>
          <span className={`font-semibold ${telemetry.total_error_px < 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {telemetry.total_error_px?.toFixed(1)} px ({telemetry.total_error_deg?.toFixed(3)}°)
          </span>
        </div>
      </div>
    </div>
  );
}
