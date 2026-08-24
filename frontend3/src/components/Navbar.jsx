import React from 'react';
import { Radio, Box, Video } from 'lucide-react';

export default function Navbar({ isConnected, viewMode, onViewModeChange }) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            LumiTrack
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-normal">
              SIH 2026 · PS 26169
            </span>
          </h1>
          <p className="text-[11px] text-gray-400 leading-none mt-0.5">
            AI-Based Virtual Camera Tracking System for Coarse FSOC PAT Alignment
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* 2D / 3D View Toggle */}
        <div className="flex items-center bg-gray-900 rounded-lg border border-gray-800 p-0.5">
          <button
            id="view-toggle-2d"
            onClick={() => onViewModeChange('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'camera'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>2D Feed</span>
          </button>
          <button
            id="view-toggle-3d"
            onClick={() => onViewModeChange('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === '3d'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Scene</span>
          </button>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center gap-2 text-xs font-mono bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
          <span className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-gray-400">{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
