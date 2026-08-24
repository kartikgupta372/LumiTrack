import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "#0b1410",
  border: "1px solid rgba(101,243,141,.15)",
  borderRadius: 8,
  color: "#e2ede8",
  fontSize: 11,
};

function MiniChart({ title, data, dataKey, unit = "", color = "#65f38d" }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,.04)" vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis width={36} tick={{ fill: "#6b7c73", fontSize: 9 }} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={v => [`${Number(v).toFixed(3)}${unit}`]}
            labelFormatter={l => `t=${l}s`}
          />
          <Line
            type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8}
            dot={false} activeDot={{ r: 3, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Charts({ history }) {
  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">TELEMETRY ANALYTICS</span>
          <h2>Real-time Tracking Performance</h2>
        </div>
        <span className="mini-label">LAST 120 SAMPLES</span>
      </div>
      <div className="charts-grid">
        <MiniChart title="Tracking Error (°)"  data={history} dataKey="error" unit="°" color="#65f38d" />
        <MiniChart title="Frame Rate (FPS)"    data={history} dataKey="fps"   unit=" fps" color="#00e5ff" />
        <MiniChart title="Pan Angle (°)"       data={history} dataKey="pan"   unit="°"   color="#ffbd5c" />
        <MiniChart title="Tilt Angle (°)"      data={history} dataKey="tilt"  unit="°"   color="#b48bff" />
      </div>
    </section>
  );
}
