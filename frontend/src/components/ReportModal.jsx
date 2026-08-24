<<<<<<< HEAD
import { Download, FileText, X } from "lucide-react";
=======
<<<<<<< HEAD
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
=======
import React, { useState } from 'react';
import { FileDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
>>>>>>> fd72f99e81b27682b7b4e06683189149817245ec

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
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
