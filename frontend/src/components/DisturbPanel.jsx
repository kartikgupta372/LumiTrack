import { CloudFog, EyeOff, Radio, Waves, Wind } from "lucide-react";

const SLIDERS = [
  { key: "noise",     label: "Sensor Noise",     icon: Radio },
  { key: "vibration", label: "Platform Vibration",icon: Waves },
  { key: "turbulence",label: "Atm. Turbulence",  icon: Wind  },
  { key: "blur",      label: "Motion Blur",       icon: CloudFog },
];

export default function DisturbPanel({ disturbances, setDisturbances }) {
  const set = (key, val) => setDisturbances(d => ({ ...d, [key]: Number(val) }));

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">STRESS ENGINE</span>
          <h2 style={{fontSize:14,margin:0}}>Environment</h2>
        </div>
        <span className="mvp-badge" style={{fontSize:8,padding:"3px 8px"}}>LIVE</span>
      </div>

      <div className="slider-list">
        {SLIDERS.map(({ key, label, icon: Icon }) => (
          <div className="slider-item" key={key}>
            <div className="slider-label">
              <span><Icon size={13} /> {label}</span>
              <b>{disturbances[key]}%</b>
            </div>
            <input type="range" min="0" max="100" value={disturbances[key]}
              onChange={e => set(key, e.target.value)} />
          </div>
        ))}
      </div>

      <label className="toggle-row">
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          <EyeOff size={13} /> Target Occlusion (cyclic 4s)
        </span>
        <input type="checkbox" checked={disturbances.occlusion}
          onChange={e => setDisturbances(d => ({ ...d, occlusion: e.target.checked }))} />
      </label>
    </section>
  );
}
