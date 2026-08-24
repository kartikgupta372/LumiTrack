import { Download, FileText, X } from "lucide-react";

function dl(filename, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export default function ReportModal({ open, onClose, sim, history }) {
  if (!open) return null;

  const exportJson = () =>
    dl("lumitrack-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), sim, history }, null, 2));

  const exportCsv = () => {
    const hdr = "time,error_deg,fps,pan,tilt,locked\n";
    const rows = history.map(r => `${r.t},${r.error},${r.fps},${r.pan},${r.tilt},${r.locked}`).join("\n");
    dl("lumitrack-report.csv", hdr + rows, "text/csv");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PERFORMANCE REPORT</span>
            <h2>LumiTrack Session Summary</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="report-stats">
          <div><span>AVG TRACKING ERROR</span><b>{sim.avgError.toFixed(4)}°</b></div>
          <div><span>MAX ERROR</span><b>{sim.maxError.toFixed(4)}°</b></div>
          <div><span>LOCK RETENTION</span><b>{sim.lockRetention.toFixed(1)}%</b></div>
          <div><span>LOST COUNT</span><b>{sim.lostCount}</b></div>
          <div><span>TOTAL FRAMES</span><b>{sim.totalFrames}</b></div>
          <div><span>PAN / TILT</span><b>{sim.pan.toFixed(2)}° / {sim.tilt.toFixed(2)}°</b></div>
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={exportCsv}><Download size={14}/> CSV</button>
          <button className="btn" onClick={exportJson}><FileText size={14}/> JSON</button>
        </div>
      </div>
    </div>
  );
}
