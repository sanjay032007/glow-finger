import React, { useRef, useEffect } from 'react';
import type { FaceStyle } from './CameraFilters';

interface Props {
  faceLandmarks: any[] | null;
  faceStyle: FaceStyle;
  width: number;
  height: number;
}

export const FaceARCanvas: React.FC<Props> = ({ faceLandmarks, faceStyle, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    if (!faceLandmarks || faceStyle === 'NORMAL' || faceStyle === 'PAPER' || faceStyle === 'VAN_GOGH') {
        // We only handle NEON, POP_ART, ANIME in AR Masks. The rest are handled by CameraFilters CSS
        return;
    }

    // Helper to draw points
    const drawPath = (indices: number[], color: string, lineWidth: number, close = false, fill = false) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = faceLandmarks[idx];
        const x = pt.x * width;
        const y = pt.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (close) ctx.closePath();
      
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.stroke();
      
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      }
    };

    // Helper to draw circle
    const drawCircle = (idx: number, radius: number, color: string, fill = false) => {
        const pt = faceLandmarks[idx];
        const x = pt.x * width;
        const y = pt.y * height;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    };

    // Key landmarks for AR Masks
    const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    const rightEye = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 396];
    const lipsOuter = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40];

    if (faceStyle === 'NEON') {
        // Cyberpunk wireframe
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.lineJoin = 'round';
        drawPath(faceOval, '#00f3ff', 2, true);
        
        ctx.shadowColor = '#ff00ff';
        drawPath(leftEye, '#ff00ff', 2, true);
        drawPath(rightEye, '#ff00ff', 2, true);
        
        ctx.shadowColor = '#00ff00';
        drawPath(lipsOuter, '#00ff00', 2, true);
        ctx.shadowBlur = 0; // reset
    }

    if (faceStyle === 'POP_ART') {
        // Comic book heavy black outlines
        ctx.lineJoin = 'round';
        drawPath(faceOval, 'black', 6, true);
        drawPath(leftEye, 'black', 5, true);
        drawPath(rightEye, 'black', 5, true);
        drawPath(lipsOuter, 'black', 5, true);
        
        // White highlights
        drawPath(faceOval, 'white', 2, true);
    }

    if (faceStyle === 'ANIME') {
        // Anime style: huge eyes and blush
        const leftEyeCenter = faceLandmarks[159]; // top of left eye
        const rightEyeCenter = faceLandmarks[386]; // top of right eye
        
        // Blush
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff6b81';
        drawCircle(205, 30, '#ff6b81', true);
        drawCircle(425, 30, '#ff6b81', true);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // Massive Anime Eyes overlay (White sclera, big pupil)
        const drawAnimeEye = (center: any) => {
            const x = center.x * width;
            const y = center.y * height;
            
            ctx.beginPath();
            ctx.ellipse(x, y + 10, 30, 45, 0, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#111';
            ctx.stroke();

            // Pupil
            ctx.beginPath();
            ctx.ellipse(x, y + 15, 18, 25, 0, 0, 2 * Math.PI);
            ctx.fillStyle = '#00a8ff';
            ctx.fill();

            // Pupil core
            ctx.beginPath();
            ctx.ellipse(x, y + 15, 8, 12, 0, 0, 2 * Math.PI);
            ctx.fillStyle = '#111';
            ctx.fill();

            // Highlight (catchlight)
            ctx.beginPath();
            ctx.arc(x - 8, y + 5, 6, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 5, y + 22, 3, 0, 2 * Math.PI);
            ctx.fill();
        };

        drawAnimeEye(leftEyeCenter);
        drawAnimeEye(rightEyeCenter);
    }

  }, [faceLandmarks, faceStyle, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-[15] object-cover"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
};
