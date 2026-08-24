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
