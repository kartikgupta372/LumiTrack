import { Download, FileText, X } from "lucide-react";

function download(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportModal({ open, onClose, metrics, history }) {
  if (!open) return null;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: metrics,
    samples: history,
  };

  const exportJson = () =>
    download("lumitrack-performance.json", JSON.stringify(report, null, 2));

  const exportCsv = () => {
    const header = "time,error,fps,pan,tilt,locked\n";
    const rows = history
      .map((r) => `${r.t},${r.error},${r.fps},${r.pan},${r.tilt},${r.locked}`)
      .join("\n");
    download("lumitrack-performance.csv", header + rows, "text/csv");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PERFORMANCE REPORT</span>
            <h2>LumiTrack Summary</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="report-stats">
          <div><span>Avg Error</span><b>{Number(metrics.averageError || 0).toFixed(2)}°</b></div>
          <div><span>Max Error</span><b>{Number(metrics.maxError || 0).toFixed(2)}°</b></div>
          <div><span>Lock Retention</span><b>{Number(metrics.lockRetention || 0).toFixed(1)}%</b></div>
          <div><span>Lost Targets</span><b>{metrics.lostTargets ?? 0}</b></div>
          <div><span>Recovery Rate</span><b>{Number(metrics.recoveryRate || 0).toFixed(1)}%</b></div>
          <div><span>Processing</span><b>{Number(metrics.processingTime || 0).toFixed(2)} ms</b></div>
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={exportCsv}><Download size={16} /> Export CSV</button>
          <button className="btn" onClick={exportJson}><FileText size={16} /> Export JSON</button>
        </div>
      </div>
    </div>
  );
}