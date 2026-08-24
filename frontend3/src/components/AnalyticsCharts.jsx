<<<<<<< HEAD
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function Chart({ title, data, dataKey, unit = "" }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis width={35} tick={{ fill: "#718078", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "#0b1410",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 8,
              color: "#e8f4ec"
            }}
            formatter={(value) => [`${Number(value).toFixed(2)}${unit}`, title]}
            labelFormatter={(label) => `${label}s`}
          />
          <Line type="monotone" dataKey={dataKey} stroke="#65f38d" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsCharts({ history }) {
  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">TELEMETRY ANALYTICS</span>
          <h2>Real-time Tracking Performance</h2>
        </div>
        <span className="mini-label">LAST 60 SAMPLES</span>
      </div>

      <div className="charts-grid">
        <Chart title="Tracking Error Over Time" data={history} dataKey="error" unit="°" />
        <Chart title="Frame Rate" data={history} dataKey="fps" unit=" FPS" />
        <Chart title="Pan Angle" data={history} dataKey="pan" unit="°" />
        <Chart title="Tilt Angle" data={history} dataKey="tilt" unit="°" />
      </div>
    </section>
  );
}
=======
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
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
