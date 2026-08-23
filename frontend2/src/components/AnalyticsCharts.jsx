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
