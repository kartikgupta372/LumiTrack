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

const API_BASE = 'http://localhost:8000/api';

export default function ReportModal({ metrics, scenarioName }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleExportPDF = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/reports/generate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Report generation failed');
      }

      // Trigger browser file download from blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LumiTrack_Report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const statusIcons = {
    idle: <FileDown className="w-3.5 h-3.5" />,
    loading: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5" />,
    error: <AlertCircle className="w-3.5 h-3.5" />
  };

  const statusLabels = {
    idle: 'Export PDF Report',
    loading: 'Generating...',
    success: 'Report Downloaded!',
    error: 'Export Failed'
  };

  const statusClasses = {
    idle: 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200',
    loading: 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed',
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    error: 'bg-rose-500/20 border-rose-500/50 text-rose-400'
  };

  return (
    <div className="hud-card p-5 rounded-xl border border-gray-800 space-y-3">
      <div className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 flex items-center gap-2">
        <FileDown className="w-4 h-4 text-cyan-400" />
        <span>Experiment Report</span>
      </div>

      {/* Quick Metrics Preview */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="text-gray-500">Acq. Time</div>
          <div className="text-cyan-300 font-semibold">
            {metrics?.acquisition_time_s != null ? `${metrics.acquisition_time_s}s` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="text-gray-500">Lock Ret.</div>
          <div className="text-emerald-300 font-semibold">
            {metrics?.lock_retention_rate != null ? `${metrics.lock_retention_rate}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="text-gray-500">Avg Error</div>
          <div className="text-amber-300 font-semibold">
            {metrics?.average_error_px != null ? `${metrics.average_error_px}px` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="text-gray-500">FPS</div>
          <div className="text-blue-300 font-semibold">
            {metrics?.effective_fps != null ? `${metrics.effective_fps}` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {status === 'error' && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
          {errorMsg}
        </p>
      )}

      {/* Export Button */}
      <button
        onClick={handleExportPDF}
        disabled={status === 'loading'}
        className={`w-full px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${statusClasses[status]}`}
      >
        {statusIcons[status]}
        <span>{statusLabels[status]}</span>
      </button>

      <p className="text-[10px] text-gray-500 text-center leading-relaxed">
        Generates a formal FSOC PAT assessment PDF with<br />performance charts and pass/fail criteria.
      </p>
    </div>
  );
}
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
