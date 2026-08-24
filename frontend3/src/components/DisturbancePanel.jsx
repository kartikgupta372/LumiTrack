<<<<<<< HEAD
import { CloudFog, Radio, Waves } from "lucide-react";

const items = [
  ["noise", "Sensor Noise", Radio],
  ["vibration", "Vibration", Waves],
  ["turbulence", "Turbulence", CloudFog],
  ["blur", "Motion Blur", CloudFog],
];

export default function DisturbancePanel({ disturbances, setDisturbances }) {
  const update = (key, value) =>
    setDisturbances((old) => ({ ...old, [key]: Number(value) }));

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DISTURBANCE INJECTORS</span>
          <h2>Environment Stress</h2>
        </div>
        <span className="live-pill">LIVE</span>
      </div>

      <div className="slider-list">
        {items.map(([key, label, Icon]) => (
          <div className="slider-item" key={key}>
            <div className="slider-label">
              <span><Icon size={15} /> {label}</span>
              <b>{disturbances[key]}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={disturbances[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <label className="toggle-row">
        <span>Temporary occlusion</span>
        <input
          type="checkbox"
          checked={disturbances.occlusion}
          onChange={(e) =>
            setDisturbances((old) => ({ ...old, occlusion: e.target.checked }))
          }
        />
      </label>
    </section>
  );
}
=======
import React from 'react';
import { Sliders, EyeOff, Wind, Activity, Zap } from 'lucide-react';

export default function DisturbancePanel({ disturbances, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({
      ...disturbances,
      [key]: value
    });
  };

  return (
    <div className="hud-card p-5 rounded-xl border border-gray-800 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3">
        <Sliders className="w-4 h-4 text-cyan-400" />
        <span>Disturbance & Stress Engine</span>
      </div>

      {/* Sensor Noise Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-gray-400 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-400" /> Sensor Noise</span>
          <span className="text-cyan-400 font-semibold">{disturbances?.noise || 0}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={disturbances?.noise || 0}
          onChange={(e) => handleChange('noise', parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Platform Vibration Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-gray-400 flex items-center gap-1.5"><Activity className="w-3 h-3 text-purple-400" /> Platform Vibration</span>
          <span className="text-cyan-400 font-semibold">{disturbances?.vibration || 0}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={disturbances?.vibration || 0}
          onChange={(e) => handleChange('vibration', parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
        />
      </div>

      {/* Atmospheric Turbulence Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-gray-400 flex items-center gap-1.5"><Wind className="w-3 h-3 text-cyan-400" /> Atmospheric Turbulence</span>
          <span className="text-cyan-400 font-semibold">{disturbances?.turbulence || 0}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={disturbances?.turbulence || 0}
          onChange={(e) => handleChange('turbulence', parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Occlusion Toggle */}
      <div className="pt-2 border-t border-gray-800/60 flex justify-between items-center">
        <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-rose-400" /> Target Occlusion
        </span>
        <button
          onClick={() => handleChange('occlusion', !disturbances?.occlusion)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition-colors border ${
            disturbances?.occlusion
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          {disturbances?.occlusion ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>
    </div>
  );
}
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
