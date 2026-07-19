import React, { useRef, useEffect } from 'react';
import type { FaceLandmark } from '../hooks/useFaceTracking';

export type MaskId = 'FOX' | 'CAT' | 'BEAR' | 'BUTTERFLY' | 'ROBOT' | 'CROWN';

export const MASKS: { id: MaskId; label: string; emoji: string }[] = [
  { id: 'FOX',       label: 'Fox',       emoji: '🦊' },
  { id: 'CAT',       label: 'Cat',       emoji: '😺' },
  { id: 'BEAR',      label: 'Bear',      emoji: '🐻' },
  { id: 'BUTTERFLY', label: 'Butterfly', emoji: '🦋' },
  { id: 'ROBOT',     label: 'Robot',     emoji: '🤖' },
  { id: 'CROWN',     label: 'Crown',     emoji: '👑' },
];

interface Props {
  landmarks: FaceLandmark[] | null;
  width: number;
  height: number;
  maskId: MaskId | null;
}

// ─── helper ───────────────────────────────────────────────
const lx = (l: FaceLandmark[]) => l[10];   // forehead centre
const lChin = (l: FaceLandmark[]) => l[152]; // chin
const lLT = (l: FaceLandmark[]) => l[356];   // left temple  (mirrored: appears left on screen)
const lRT = (l: FaceLandmark[]) => l[127];   // right temple
const lNose = (l: FaceLandmark[]) => l[4];   // nose tip

// Face width = dist between temples
function fw(l: FaceLandmark[]) {
  return Math.hypot(lLT(l).x - lRT(l).x, lLT(l).y - lRT(l).y);
}

// ── FOX ────────────────────────────────────────────────────
function drawFox(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const forehead = lx(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const nose = lNose(l);

  const drawEar = (tx: number, bx: number, by: number, tipOffset: number) => {
    const tipX = tx + tipOffset;
    const tipY = forehead.y - w * 0.45;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.12, by);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx + w * 0.12, by);
    ctx.closePath();
    ctx.fillStyle = '#e07030';
    ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 3; ctx.stroke();
    // inner
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.06, by + 8);
    ctx.lineTo(tipX, tipY + w * 0.1);
    ctx.lineTo(bx + w * 0.06, by + 8);
    ctx.closePath();
    ctx.fillStyle = '#f5c5a0';
    ctx.fill();
  };
  drawEar(lt.x, lt.x, lt.y, -w * 0.08);
  drawEar(rt.x, rt.x, rt.y,  w * 0.08);

  // Eye patches
  const le = { x: (lt.x + forehead.x) / 2, y: (lt.y + forehead.y) / 2 };
  const re = { x: (rt.x + forehead.x) / 2, y: (rt.y + forehead.y) / 2 };
  for (const [cx, cy] of [[le.x, le.y], [re.x, re.y]]) {
    ctx.beginPath();
    ctx.ellipse(cx as number, cy as number, w * 0.15, w * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80,40,10,0.35)';
    ctx.fill();
  }

  // Snout
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y + w * 0.05, w * 0.14, w * 0.10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#faf0e0';
  ctx.fill();
  ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 2; ctx.stroke();
  // Nose triangle
  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y - 4);
  ctx.lineTo(nose.x - 8, nose.y + 8);
  ctx.lineTo(nose.x + 8, nose.y + 8);
  ctx.closePath();
  ctx.fillStyle = '#2c2b29'; ctx.fill();
  // Whiskers
  ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 1.5;
  for (const [sx, ex, y] of [
    [nose.x - w*0.06, nose.x - w*0.3, nose.y + 4],
    [nose.x - w*0.06, nose.x - w*0.3, nose.y + 12],
    [nose.x + w*0.06, nose.x + w*0.3, nose.y + 4],
    [nose.x + w*0.06, nose.x + w*0.3, nose.y + 12],
  ]) {
    ctx.beginPath(); ctx.moveTo(sx as number, y as number); ctx.lineTo(ex as number, y as number); ctx.stroke();
  }
}

// ── CAT ────────────────────────────────────────────────────
function drawCat(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const forehead = lx(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const nose = lNose(l);

  const drawCatEar = (bx: number, by: number, dir: number) => {
    const tipX = bx + dir * w * 0.06;
    const tipY = forehead.y - w * 0.38;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.10, by + 10);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx + w * 0.10, by + 10);
    ctx.closePath();
    ctx.fillStyle = '#c45c55';
    ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - w*0.04, by + 14);
    ctx.lineTo(tipX, tipY + w * 0.08);
    ctx.lineTo(bx + w*0.04, by + 14);
    ctx.closePath();
    ctx.fillStyle = '#f5a0a0'; ctx.fill();
  };
  drawCatEar(lt.x, lt.y, -1);
  drawCatEar(rt.x, rt.y,  1);
  // nose heart
  ctx.fillStyle = '#c45c55';
  ctx.beginPath();
  const nx = nose.x, ny = nose.y;
  const r = w * 0.035;
  ctx.arc(nx - r, ny, r, Math.PI, 0);
  ctx.arc(nx + r, ny, r, Math.PI, 0);
  ctx.lineTo(nx, ny + r * 2.2);
  ctx.closePath(); ctx.fill();
  // whiskers
  ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 1.5;
  for (const [sx, ex, y] of [
    [nose.x - w*0.06, nose.x - w*0.32, nose.y + 2],
    [nose.x - w*0.05, nose.x - w*0.30, nose.y + 10],
    [nose.x - w*0.05, nose.x - w*0.30, nose.y + 18],
    [nose.x + w*0.06, nose.x + w*0.32, nose.y + 2],
    [nose.x + w*0.05, nose.x + w*0.30, nose.y + 10],
    [nose.x + w*0.05, nose.x + w*0.30, nose.y + 18],
  ]) {
    ctx.beginPath(); ctx.moveTo(sx as number, y as number); ctx.lineTo(ex as number, y as number); ctx.stroke();
  }
}

// ── BEAR ──────────────────────────────────────────────────
function drawBear(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const nose = lNose(l);
  const earR = w * 0.19;
  for (const [cx, cy] of [[lt.x - earR*0.3, lt.y - earR*0.3], [rt.x + earR*0.3, rt.y - earR*0.3]]) {
    ctx.beginPath();
    ctx.arc(cx as number, cy as number, earR, 0, Math.PI*2);
    ctx.fillStyle = '#b87a55'; ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx as number, cy as number, earR * 0.55, 0, Math.PI*2);
    ctx.fillStyle = '#c49070'; ctx.fill();
  }
  // Snout rounded rect
  const sw = w * 0.28, sh = w * 0.18;
  const sx = nose.x - sw/2, sy = nose.y - sh * 0.1;
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, sh/2);
  ctx.fillStyle = '#f5ece0';
  ctx.fill();
  ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 2.5; ctx.stroke();
  // Nose oval
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y + 4, w*0.06, w*0.04, 0, 0, Math.PI*2);
  ctx.fillStyle = '#2c2b29'; ctx.fill();
  // cheek dots
  for (const [cx, cy] of [[lt.x + w*0.04, nose.y], [rt.x - w*0.04, nose.y]]) {
    ctx.beginPath();
    ctx.arc(cx as number, cy as number, w*0.065, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(230,100,80,0.3)'; ctx.fill();
  }
}

// ── BUTTERFLY ─────────────────────────────────────────────
function drawButterfly(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const nose = lNose(l);
  const forehead = lx(l);

  const drawWing = (cx: number, cy: number, dir: number) => {
    const wx = cx + dir * w * 0.55;
    const wy = cy - w * 0.20;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cx + dir*w*0.15, cy - w*0.3, wx + dir*w*0.2, wy - w*0.1, wx, wy);
    ctx.bezierCurveTo(wx - dir*w*0.1, wy + w*0.1, cx + dir*w*0.3, cy - w*0.05, cx + dir*w*0.05, cy + w*0.1);
    ctx.closePath();
    ctx.fillStyle = dir < 0 ? 'rgba(92,160,220,0.70)' : 'rgba(220,140,70,0.70)';
    ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 2; ctx.stroke();
    // Lower wing
    ctx.beginPath();
    ctx.moveTo(cx + dir*w*0.05, cy + w*0.1);
    ctx.bezierCurveTo(cx + dir*w*0.35, cy + w*0.18, wx - dir*w*0.1, wy + w*0.35, cx + dir*w*0.1, cy + w*0.28);
    ctx.closePath();
    ctx.fillStyle = dir < 0 ? 'rgba(140,90,200,0.65)' : 'rgba(200,80,100,0.65)';
    ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  };
  drawWing(lt.x, (lt.y + nose.y)/2, -1);
  drawWing(rt.x, (rt.y + nose.y)/2,  1);
  // Body line
  ctx.beginPath();
  ctx.moveTo(nose.x, forehead.y);
  ctx.lineTo(nose.x, nose.y + w*0.15);
  ctx.strokeStyle = '#7a5030'; ctx.lineWidth = 3; ctx.stroke();
  // Antennae
  for (const dx of [-1,1]) {
    ctx.beginPath();
    ctx.moveTo(nose.x, forehead.y);
    ctx.quadraticCurveTo(nose.x + dx*w*0.12, forehead.y - w*0.2, nose.x + dx*w*0.18, forehead.y - w*0.32);
    ctx.strokeStyle = '#5a3020'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.arc(nose.x + dx*w*0.18, forehead.y - w*0.32, 5, 0, Math.PI*2);
    ctx.fillStyle = '#2c2b29'; ctx.fill();
  }
}

// ── ROBOT ─────────────────────────────────────────────────
function drawRobot(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const forehead = lx(l);
  const chin = lChin(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const nose = lNose(l);

  const faceH = Math.abs(chin.y - forehead.y);
  const fx = rt.x, fy = forehead.y;
  const faceW = Math.abs(lt.x - rt.x);

  // Helmet dome
  ctx.beginPath();
  ctx.roundRect(fx - w*0.05, fy - faceH*0.15, faceW + w*0.1, faceH * 0.5, 12);
  ctx.fillStyle = 'rgba(80,100,130,0.55)';
  ctx.fill();
  ctx.strokeStyle = '#2c5080'; ctx.lineWidth = 3; ctx.stroke();

  // Visor
  const vx = rt.x + w*0.04, vy = forehead.y + faceH*0.06;
  ctx.beginPath();
  ctx.roundRect(vx, vy, faceW - w*0.08, faceH*0.22, 8);
  ctx.fillStyle = 'rgba(100,220,255,0.50)';
  ctx.fill();
  ctx.strokeStyle = '#60d0ff'; ctx.lineWidth = 2; ctx.stroke();
  // Visor scanline
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  for (let yy = vy+6; yy < vy + faceH*0.22; yy += 6) {
    ctx.beginPath(); ctx.moveTo(vx, yy); ctx.lineTo(vx + faceW - w*0.08, yy); ctx.stroke();
  }

  // Lower face plate
  const pfx = rt.x + w*0.05, pfy = forehead.y + faceH*0.32;
  ctx.beginPath();
  ctx.roundRect(pfx, pfy, faceW - w*0.10, faceH*0.28, 8);
  ctx.fillStyle = 'rgba(60,80,110,0.55)';
  ctx.fill();
  ctx.strokeStyle = '#2c5080'; ctx.lineWidth = 2; ctx.stroke();
  // Speaker grille
  ctx.strokeStyle = '#60d0ff'; ctx.lineWidth = 1.5;
  const grX = nose.x - w*0.1, grY = pfy + 8;
  for (let i=0; i<5; i++) {
    ctx.beginPath(); ctx.moveTo(grX, grY + i*7); ctx.lineTo(grX + w*0.2, grY + i*7); ctx.stroke();
  }
  // Bolts
  for (const [bx,by] of [[vx+8, vy+8],[vx+faceW-w*0.08-8, vy+8],[vx+8, vy+faceH*0.22-8],[vx+faceW-w*0.08-8, vy+faceH*0.22-8]]) {
    ctx.beginPath(); ctx.arc(bx as number, by as number, 4, 0, Math.PI*2);
    ctx.fillStyle = '#c0c0c0'; ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 1; ctx.stroke();
  }
  // Antenna
  ctx.beginPath();
  ctx.moveTo(nose.x, fy - faceH*0.15);
  ctx.lineTo(nose.x, fy - faceH*0.45);
  ctx.strokeStyle = '#60d0ff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath();
  ctx.arc(nose.x, fy - faceH*0.47, 7, 0, Math.PI*2);
  ctx.fillStyle = '#ff4040'; ctx.fill();
  ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 1.5; ctx.stroke();
}

// ── CROWN ─────────────────────────────────────────────────
function drawCrown(ctx: CanvasRenderingContext2D, l: FaceLandmark[]) {
  const w = fw(l);
  const forehead = lx(l);
  const lt = lLT(l);
  const rt = lRT(l);
  const faceW = Math.abs(lt.x - rt.x);
  const cx = (lt.x + rt.x) / 2;
  const crownBase = forehead.y - w * 0.05;
  const crownH = w * 0.38;
  const leftX = rt.x - w*0.05;
  const rightX = lt.x + w*0.05;

  const points = [
    [leftX, crownBase],
    [leftX + faceW*0.1, crownBase - crownH*0.55],
    [leftX + faceW*0.22, crownBase - crownH*0.25],
    [leftX + faceW*0.37, crownBase - crownH*0.85],
    [cx, crownBase - crownH],
    [rightX - faceW*0.37, crownBase - crownH*0.85],
    [rightX - faceW*0.22, crownBase - crownH*0.25],
    [rightX - faceW*0.10, crownBase - crownH*0.55],
    [rightX, crownBase],
  ];

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([px,py]) => ctx.lineTo(px, py));
  ctx.lineTo(rightX, crownBase + 10);
  ctx.lineTo(leftX, crownBase + 10);
  ctx.closePath();
  const grad = ctx.createLinearGradient(leftX, crownBase - crownH, rightX, crownBase);
  grad.addColorStop(0, '#f5d060');
  grad.addColorStop(0.5, '#e8a820');
  grad.addColorStop(1, '#f5d060');
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#a06810'; ctx.lineWidth = 3; ctx.stroke();

  // Jewels
  const jewels: [number, number, string][] = [
    [cx, crownBase - crownH + 14, '#c45c55'],
    [leftX + faceW*0.37, crownBase - crownH*0.85 + 12, '#59708f'],
    [rightX - faceW*0.37, crownBase - crownH*0.85 + 12, '#7c8e65'],
  ];
  jewels.forEach(([jx,jy,jc]) => {
    ctx.beginPath(); ctx.arc(jx, jy, 9, 0, Math.PI*2);
    ctx.fillStyle = jc; ctx.fill();
    ctx.strokeStyle = '#2c2b29'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(jx-2, jy-2, 3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  });

  // Band
  ctx.beginPath();
  ctx.rect(leftX, crownBase - 2, rightX - leftX, 14);
  ctx.fillStyle = '#a06810'; ctx.fill();
}

// ── MAIN COMPONENT ────────────────────────────────────────
const DRAW_FN: Record<MaskId, (ctx: CanvasRenderingContext2D, l: FaceLandmark[]) => void> = {
  FOX: drawFox,
  CAT: drawCat,
  BEAR: drawBear,
  BUTTERFLY: drawButterfly,
  ROBOT: drawRobot,
  CROWN: drawCrown,
};

export const FaceMaskCanvas: React.FC<Props> = ({ landmarks, width, height, maskId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!maskId || !landmarks || landmarks.length < 468) return;
    DRAW_FN[maskId](ctx, landmarks);
  }, [landmarks, width, height, maskId]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    />
  );
};