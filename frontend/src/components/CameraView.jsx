import { useEffect, useRef } from "react";

const W = 760, H = 430, CX = W / 2, CY = H / 2;

// Fixed star field background
const STARS = Array.from({ length: 65 }, (_, i) => ({
  x: ((i * 137.5) % (W - 20)) + 10,
  y: ((i * 223.7) % (H - 20)) + 10,
  r: (i % 3 === 0 ? 1.4 : i % 2 === 0 ? 1.0 : 0.7),
  alpha: 0.25 + (i % 5) * 0.14,
}));

// Draw solid + crosshair with central ring at camera aim point
function drawBoresight(ctx, x, y, locked, occluded) {
  const ringR = 14;
  const arm = 28;
  const color = occluded ? "#ff5555" : locked ? "#00ff41" : "#ffd166";
  const glow = occluded ? "rgba(255,85,85,0.4)" : locked ? "rgba(0,255,65,0.4)" : "rgba(255,209,102,0.4)";

  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;

  // 1. Central ring
  ctx.beginPath();
  ctx.arc(x, y, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Plus arms extending through ring
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.stroke();

  // 3. End tick marks
  const tk = 4;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - arm, y - tk); ctx.lineTo(x - arm, y + tk);
  ctx.moveTo(x + arm, y - tk); ctx.lineTo(x + arm, y + tk);
  ctx.moveTo(x - tk, y - arm); ctx.lineTo(x + tk, y - arm);
  ctx.moveTo(x - tk, y + arm); ctx.lineTo(x + tk, y + arm);
  ctx.stroke();

  // 4. Center dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 4 Corner brackets around beacon target
function drawBrackets(ctx, x, y, locked, occluded) {
  const sz = 20, arm = 8;
  const col = occluded ? "#ff5555" : locked ? "#00ff41" : "#ffd166";
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = col;
  ctx.shadowBlur = locked ? 10 : 4;
  for (const [ox, oy, dx1, dy1, dx2, dy2] of [
    [-sz, -sz, arm, 0, 0, arm],
    [sz, -sz, -arm, 0, 0, arm],
    [-sz, sz, arm, 0, 0, -arm],
    [sz, sz, -arm, 0, 0, -arm],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + ox + dx1, y + oy + dy1);
    ctx.lineTo(x + ox, y + oy);
    ctx.lineTo(x + ox + dx2, y + oy + dy2);
    ctx.stroke();
  }
  ctx.restore();
}

// Optical beacon glow
function drawBeacon(ctx, x, y, turbulence = 0) {
  const turb = 1 + (Math.sin(Date.now() * 0.008) * 0.15) * (turbulence / 100);
  const r = 30 * turb;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(255, 255, 220, 0.95)");
  g.addColorStop(0.2, "rgba(255, 170, 70, 0.8)");
  g.addColorStop(0.55, "rgba(240, 100, 20, 0.35)");
  g.addColorStop(1, "rgba(200, 50, 10, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ff9933";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dashed error vector
function drawVector(ctx, cx, cy, tx, ty, locked, occ) {
  if (occ) return;
  const dx = tx - cx, dy = ty - cy, dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  ctx.save();
  ctx.strokeStyle = locked ? "rgba(0, 255, 65, 0.25)" : "rgba(255, 209, 102, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.restore();
}

// Subtle grid & concentric range rings
function drawGrid(ctx) {
  ctx.strokeStyle = "rgba(101, 243, 141, 0.04)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Concentric range circles
  ctx.strokeStyle = "rgba(101, 243, 141, 0.055)";
  ctx.lineWidth = 0.7;
  for (const r of [50, 105, 160, 220, 290]) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Star background
function drawStars(ctx) {
  for (const s of STARS) {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Noise / scanline / blur
function drawDisturbances(ctx, noise, blur) {
  if (noise > 0) {
    const count = Math.floor((noise / 100) * 1200);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(Math.random() * 0.3 + 0.05) * (noise / 100)})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
    }
  }
  if (blur > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${blur / 2200})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export default function CameraView({ sim, disturbances }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const { targetX: tx, targetY: ty, camX, camY, locked, detected, occluded } = sim;
    const bx = Math.max(10, Math.min(W - 10, tx));
    const by = Math.max(10, Math.min(H - 10, ty));
    const cx = Math.max(10, Math.min(W - 10, camX));
    const cy = Math.max(10, Math.min(H - 10, camY));

    // Clear background
    ctx.fillStyle = "#030805";
    ctx.fillRect(0, 0, W, H);

    // Stars & Grid
    drawStars(ctx);
    drawGrid(ctx);

    // Error line connecting Camera Boresight to Beacon
    drawVector(ctx, cx, cy, bx, by, locked, occluded);

    // Target Beacon & Brackets
    if (!occluded) {
      drawBeacon(ctx, bx, by, disturbances?.turbulence || 0);
      drawBrackets(ctx, bx, by, locked, occluded);
    }

    // Disturbances (noise & blur)
    drawDisturbances(ctx, disturbances?.noise || 0, disturbances?.blur || 0);

    // Target Occlusion Banner
    if (occluded) {
      ctx.fillStyle = "rgba(35, 5, 5, 0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#ff5555";
      ctx.textAlign = "center";
      ctx.fillText("█ TARGET OCCLUDED — KALMAN PREDICTING █", W / 2, H / 2 - 8);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255, 85, 85, 0.7)";
      ctx.fillText("AWAITING BEACON RE-ACQUISITION", W / 2, H / 2 + 14);
    }

    // Camera Crosshair + Central Reticle at (cx, cy)
    drawBoresight(ctx, cx, cy, locked, occluded);

    // Vignette border
    const g = ctx.createRadialGradient(CX, CY, H * 0.35, CX, CY, H * 0.85);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

  }, [sim, disturbances]);

  return (
    <div className="camera-shell">
      <canvas ref={canvasRef} width={W} height={H} className="camera-canvas" />

      <div className="camera-hud hud-tl">
        <span>CAM: OPT-X9 · </span>
        <span className="hud-green">LIVE</span>
      </div>
      <div className="camera-hud hud-tr">
        <span>FOV 30° {sim.fps} FPS</span>
      </div>
    </div>
  );
}