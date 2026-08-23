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
