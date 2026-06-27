import { useRef, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
  time: number;
  color: string;
}

const PALETTE = ['#00f3ff', '#b026ff', '#ff007f', '#39ff14', '#ff8c00'];

export function MiniDrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const colorIndexRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // Skip drawing if user is clicking interactive landing elements
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('.interactive-gallery')
      ) {
        return;
      }
      
      isDrawingRef.current = true;
      // Cycle colors per stroke
      colorIndexRef.current = (colorIndexRef.current + 1) % PALETTE.length;
      pointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        color: PALETTE[colorIndexRef.current],
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      pointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        color: PALETTE[colorIndexRef.current],
      });
    };

    const handlePointerUp = () => {
      isDrawingRef.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      const fadeTime = 800; // 800ms line lifespan

      // Filter active drawing points
      pointsRef.current = pointsRef.current.filter((p) => now - p.time < fadeTime);
      const points = pointsRef.current;

      if (points.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw segments with fading opacity
        for (let i = 1; i < points.length; i++) {
          const pStart = points[i - 1];
          const pEnd = points[i];
          
          // Calculate segment age
          const age = now - pEnd.time;
          const opacity = 1 - age / fadeTime;
          if (opacity <= 0) continue;

          // Double pass drawing for high quality neon glow
          // Outer Glow
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.strokeStyle = pEnd.color;
          ctx.lineWidth = 18 * opacity;
          ctx.shadowBlur = 25 * opacity;
          ctx.shadowColor = pEnd.color;
          ctx.globalAlpha = opacity * 0.15;
          ctx.stroke();

          // Inner Core
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 * opacity;
          ctx.shadowBlur = 0;
          ctx.globalAlpha = opacity * 0.9;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
    />
  );
}
