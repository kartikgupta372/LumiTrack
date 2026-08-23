import { useEffect, useRef } from "react";

export default function CameraFeedCanvas({ target, detected, locked, noise, blur }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // dark sensor background
    ctx.fillStyle = "#020504";
    ctx.fillRect(0, 0, w, h);

    // subtle scan/grid
    ctx.strokeStyle = "rgba(71, 255, 154, .07)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // center crosshair
    ctx.strokeStyle = locked ? "#7dff9d" : "#ffbd5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 26, cy);
    ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 26);
    ctx.stroke();

    // target
    if (detected) {
      const x = Math.max(8, Math.min(w - 8, target.x));
      const y = Math.max(8, Math.min(h - 8, target.y));

      const glow = ctx.createRadialGradient(x, y, 1, x, y, 22);
      glow.addColorStop(0, "rgba(255,255,255,.95)");
      glow.addColorStop(0.18, "rgba(255, 152, 120, 0.9)");
      glow.addColorStop(1, "rgba(255,80,30,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 24, y - 24, 48, 48);

      ctx.fillStyle = "#ff3b3b";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();

      ctx.shadowColor = "#ff3b3b";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#00ff66";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 20, y - 20, 40, 40);

      // corner markers
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 10);
      ctx.lineTo(x - 20, y - 20);
      ctx.lineTo(x - 10, y - 20);

      ctx.moveTo(x + 10, y - 20);
      ctx.lineTo(x + 20, y - 20);
      ctx.lineTo(x + 20, y - 10);

      ctx.moveTo(x - 20, y + 10);
      ctx.lineTo(x - 20, y + 20);
      ctx.lineTo(x - 10, y + 20);

      ctx.moveTo(x + 10, y + 20);
      ctx.lineTo(x + 20, y + 20);
      ctx.lineTo(x + 20, y + 10);

      ctx.stroke();
    }

    // noise
    const count = Math.floor((noise / 100) * 1800);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const alpha = Math.random() * 0.35;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    if (blur > 0) {
      ctx.fillStyle = `rgba(255,255,255,${blur / 1000})`;
      ctx.fillRect(0, 0, w, h);
    }
  }, [target, detected, locked, noise, blur]);

  return (
    <div className="camera-shell">
      <canvas ref={canvasRef} width={760} height={430} className="camera-canvas" />
      <div className="camera-hud top-left">
        <span>CAM_ID: OPT-X9</span>
        <span className="hud-green">● LIVE</span>
      </div>
      <div className="camera-hud top-right">
        <span>FOV 30°</span>
        <span>640×480</span>
      </div>
      <div className="camera-hud bottom-left">
        <span>MODE: COARSE PAT</span>
      </div>
      <div className="camera-hud bottom-right">
        <span>TGT_X: {target.x.toFixed(2)}</span>
        <span>TGT_Y: {target.y.toFixed(2)}</span>
        <span>DIST: 4.2 km</span>
      </div>
    </div>
  );
}
