"""
PDF Performance Report Generator for LumiTrack FSOC SIL Simulator.

Generates a formal experiment report including:
 - Cover page with scenario metadata
 - Performance summary table
 - Matplotlib tracking error & pan/tilt dynamics charts
 - FSOC PAT pass/fail assessment
"""

import io
import os
import math
import datetime
from typing import List, Dict, Any, Optional

import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# --- FSOC PAT Coarse Alignment Pass/Fail Criteria ---
LOCK_RETENTION_THRESHOLD = 80.0   # %  (≥80% to pass)
MAX_ERROR_THRESHOLD_DEG = 2.0     # degrees (max error < 2° to pass)
ACQ_TIME_THRESHOLD_S = 3.0        # seconds (initial acquisition < 3s to pass)
MIN_FPS_THRESHOLD = 25.0          # Hz (≥25 FPS to pass)


def _plot_tracking_charts(
    error_history: List[float],
    pan_history: List[float],
    tilt_history: List[float],
    timestamps: List[float]
) -> io.BytesIO:
    """
    Generate matplotlib figure with Tracking Error and Pan/Tilt dynamics.
    Returns PNG image bytes.
    """
    fig = plt.figure(figsize=(10, 6), facecolor="#0f172a")
    gs = gridspec.GridSpec(2, 1, hspace=0.45)

    # --- Tracking Error Plot ---
    ax1 = fig.add_subplot(gs[0])
    ax1.set_facecolor("#1e293b")
    ax1.plot(timestamps, error_history, color="#06b6d4", linewidth=1.5, label="Tracking Error (px)")
    ax1.axhline(y=20, color="#f59e0b", linewidth=1, linestyle="--", label="Lock Tolerance (20 px)")
    ax1.set_xlabel("Time (s)", color="#94a3b8", fontsize=9)
    ax1.set_ylabel("Error (pixels)", color="#94a3b8", fontsize=9)
    ax1.set_title("Beacon Tracking Error vs Time", color="#e2e8f0", fontsize=10, fontweight="bold")
    ax1.tick_params(colors="#94a3b8", labelsize=8)
    ax1.spines["bottom"].set_color("#334155")
    ax1.spines["left"].set_color("#334155")
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.legend(fontsize=8, facecolor="#1e293b", labelcolor="#94a3b8", framealpha=0.8)

    # --- Pan/Tilt Dynamics Plot ---
    ax2 = fig.add_subplot(gs[1])
    ax2.set_facecolor("#1e293b")
    ax2.plot(timestamps, pan_history, color="#3b82f6", linewidth=1.5, label="Pan Angle (°)")
    ax2.plot(timestamps, tilt_history, color="#a855f7", linewidth=1.5, linestyle="--", label="Tilt Angle (°)")
    ax2.set_xlabel("Time (s)", color="#94a3b8", fontsize=9)
    ax2.set_ylabel("Angle (degrees)", color="#94a3b8", fontsize=9)
    ax2.set_title("Camera Gimbal Pan / Tilt Dynamics", color="#e2e8f0", fontsize=10, fontweight="bold")
    ax2.tick_params(colors="#94a3b8", labelsize=8)
    ax2.spines["bottom"].set_color("#334155")
    ax2.spines["left"].set_color("#334155")
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.legend(fontsize=8, facecolor="#1e293b", labelcolor="#94a3b8", framealpha=0.8)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=140, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf


class ReportGenerator:
    """
    Generates a formal LumiTrack FSOC SIL PDF experiment report.
    """

    def __init__(self, output_dir: str = "reports"):
        os.makedirs(output_dir, exist_ok=True)
        self.output_dir = output_dir

    def generate(
        self,
        scenario_name: str,
        metrics: Dict[str, Any],
        error_history: Optional[List[float]] = None,
        pan_history: Optional[List[float]] = None,
        tilt_history: Optional[List[float]] = None,
        timestamps: Optional[List[float]] = None,
    ) -> str:
        """
        Generate PDF report and return its file path.
        """
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{ts}_{scenario_name.replace(' ', '_')}_report.pdf"
        filepath = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            leftMargin=20 * mm, rightMargin=20 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm
        )

        styles = getSampleStyleSheet()
        elements = []

        # -------- COVER PAGE --------
        title_style = ParagraphStyle(
            "CoverTitle",
            fontSize=22,
            textColor=colors.HexColor("#06b6d4"),
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName="Helvetica-Bold"
        )
        sub_style = ParagraphStyle(
            "CoverSub",
            fontSize=11,
            textColor=colors.HexColor("#64748b"),
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "Body",
            fontSize=10,
            textColor=colors.HexColor("#334155"),
            spaceAfter=6,
        )
        section_style = ParagraphStyle(
            "Section",
            fontSize=13,
            textColor=colors.HexColor("#0ea5e9"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6,
        )

        elements.append(Spacer(1, 30 * mm))
        elements.append(Paragraph("LumiTrack FSOC SIL Testbed", title_style))
        elements.append(Paragraph("Coarse PAT Simulation Experiment Report", sub_style))
        elements.append(Spacer(1, 6 * mm))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0ea5e9")))
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(f"<b>Scenario:</b> {scenario_name}", body_style))
        elements.append(Paragraph(f"<b>Generated:</b> {datetime.datetime.now().strftime('%B %d, %Y %H:%M:%S')}", body_style))
        elements.append(Paragraph(f"<b>SIH Problem Statement:</b> 26169 — AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile FSOC Terminals", body_style))

        # -------- PERFORMANCE TABLE --------
        elements.append(Spacer(1, 10 * mm))
        elements.append(Paragraph("Performance Summary", section_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#334155")))
        elements.append(Spacer(1, 3 * mm))

        def pass_fail(value, threshold, higher_is_better=True):
            if value is None:
                return "N/A", colors.HexColor("#64748b")
            passed = (value >= threshold) if higher_is_better else (value <= threshold)
            return ("✓ PASS" if passed else "✗ FAIL"), (colors.HexColor("#059669") if passed else colors.HexColor("#dc2626"))

        acq_time = metrics.get("acquisition_time_s")
        acq_label, acq_color = pass_fail(acq_time, ACQ_TIME_THRESHOLD_S, higher_is_better=False) if acq_time else ("N/A", colors.HexColor("#64748b"))
        lock_label, lock_color = pass_fail(metrics.get("lock_retention_rate", 0), LOCK_RETENTION_THRESHOLD)
        fps_label, fps_color = pass_fail(metrics.get("effective_fps", 0), MIN_FPS_THRESHOLD)
        err_deg = metrics.get("average_error_deg", 0)
        err_label, err_color = pass_fail(err_deg, MAX_ERROR_THRESHOLD_DEG, higher_is_better=False)

        table_data = [
            ["Metric", "Value", "Threshold", "Assessment"],
            ["Initial Acquisition Time", f"{acq_time:.2f} s" if acq_time else "N/A", f"< {ACQ_TIME_THRESHOLD_S} s", acq_label],
            ["Lock Retention Rate", f"{metrics.get('lock_retention_rate', 0):.1f}%", f"≥ {LOCK_RETENTION_THRESHOLD}%", lock_label],
            ["Average Tracking Error", f"{metrics.get('average_error_px', 0):.2f} px / {err_deg:.3f}°", f"< {MAX_ERROR_THRESHOLD_DEG}°", err_label],
            ["Max Tracking Error", f"{metrics.get('max_error_px', 0):.2f} px", "—", "—"],
            ["Effective Frame Rate", f"{metrics.get('effective_fps', 0):.1f} FPS", f"≥ {MIN_FPS_THRESHOLD} FPS", fps_label],
            ["Avg Processing Latency", f"{metrics.get('avg_processing_latency_ms', 0):.2f} ms", "< 33 ms", "—"],
            ["Target Loss Events", str(metrics.get("lost_target_events", 0)), "—", "—"],
            ["Successful Re-acquisitions", str(metrics.get("successful_recoveries", 0)), "—", "—"],
            ["Frames Processed", str(metrics.get("processed_frames", 0)), "—", "—"],
        ]

        col_widths = [55 * mm, 45 * mm, 40 * mm, 25 * mm]
        tbl = Table(table_data, colWidths=col_widths)

        assessment_col_colors = [
            colors.HexColor("#1e293b"),  # header
            acq_color, lock_color, err_color,
            colors.HexColor("#334155"), fps_color,
            colors.HexColor("#334155"), colors.HexColor("#334155"),
            colors.HexColor("#334155"), colors.HexColor("#334155"),
        ]

        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#06b6d4")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#f1f5f9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ] + [
            ("TEXTCOLOR", (3, i + 1), (3, i + 1), assessment_col_colors[i + 1])
            for i in range(len(table_data) - 1)
        ] + [
            ("FONTNAME", (3, i + 1), (3, i + 1), "Helvetica-Bold")
            for i in range(len(table_data) - 1)
        ]))

        elements.append(tbl)

        # -------- CHARTS --------
        if error_history and pan_history and tilt_history and timestamps:
            elements.append(Spacer(1, 8 * mm))
            elements.append(Paragraph("Telemetry Charts", section_style))
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#334155")))
            elements.append(Spacer(1, 3 * mm))

            chart_buf = _plot_tracking_charts(error_history, pan_history, tilt_history, timestamps)
            chart_img = RLImage(chart_buf, width=160 * mm, height=96 * mm)
            elements.append(chart_img)

        # -------- OVERALL ASSESSMENT --------
        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph("FSOC PAT Coarse Alignment Assessment", section_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#334155")))
        elements.append(Spacer(1, 3 * mm))

        all_pass = (
            (acq_time is not None and acq_time <= ACQ_TIME_THRESHOLD_S) and
            metrics.get("lock_retention_rate", 0) >= LOCK_RETENTION_THRESHOLD and
            err_deg <= MAX_ERROR_THRESHOLD_DEG and
            metrics.get("effective_fps", 0) >= MIN_FPS_THRESHOLD
        )

        verdict_style = ParagraphStyle(
            "Verdict",
            fontSize=14,
            textColor=colors.HexColor("#059669") if all_pass else colors.HexColor("#dc2626"),
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=8,
        )
        elements.append(Paragraph(
            "✓ COARSE ALIGNMENT CRITERIA MET" if all_pass else "✗ COARSE ALIGNMENT CRITERIA NOT MET",
            verdict_style
        ))
        elements.append(Paragraph(
            "The LumiTrack SIL simulation successfully demonstrated closed-loop coarse PAT tracking "
            "of a moving optical beacon using Kalman-filtered OpenCV detection and autonomous PID-driven "
            "gimbal control. All performance thresholds for FSOC coarse alignment were evaluated against "
            "standard Pointing, Acquisition, and Tracking (PAT) system requirements."
            if all_pass else
            "One or more FSOC PAT coarse alignment performance thresholds were not met in this scenario. "
            "Recommended actions: tune PID gains (Kp/Ki/Kd), increase camera FOV, or reduce disturbance levels.",
            body_style
        ))

        doc.build(elements)
        print(f"[ReportGenerator] Report saved to: {filepath}")
        return filepath
