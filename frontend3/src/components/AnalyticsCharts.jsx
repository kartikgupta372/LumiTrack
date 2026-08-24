import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, LineChart as ChartIcon } from 'lucide-react';

export default function AnalyticsCharts({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="hud-card p-5 rounded-xl border border-gray-800 flex flex-col items-center justify-center min-h-[220px] text-gray-500 text-xs">
        <ChartIcon className="w-8 h-8 text-gray-600 mb-2 stroke-[1.5]" />
        <span>No Real-time Telemetry Collected Yet</span>
      </div>
    );
  }

  return (
    <div className="hud-card p-5 rounded-xl border border-gray-800 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Tracking Error & Angular Dynamics</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">Last 50 frames</span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="timestamp" stroke="#6b7280" tick={{ fontSize: 10 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '11px' }}
              itemStyle={{ color: '#06b6d4' }}
            />
            <Line
              type="monotone"
              dataKey="total_error_px"
              name="Error (px)"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="camera_pan"
              name="Pan Angle (°)"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
