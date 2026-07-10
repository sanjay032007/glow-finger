import React, { useRef, useEffect } from 'react';

interface Props {
  handLandmarks: any[] | null;
  faceLandmarks: any[] | null;
  showFaceMesh: boolean;
  activeColor: string;
}

export const GestureOverlay: React.FC<Props> = ({
  handLandmarks,
  faceLandmarks,
  showFaceMesh,
  activeColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Hand Landmarks
    if (handLandmarks) {
      handLandmarks.forEach((hand) => {
        // Draw connection lines
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 10;

        // Thumb
        drawPath(ctx, hand, [0, 1, 2, 3, 4]);
        // Index
        drawPath(ctx, hand, [0, 5, 6, 7, 8]);
        // Middle
        drawPath(ctx, hand, [9, 10, 11, 12]);
        // Ring
        drawPath(ctx, hand, [13, 14, 15, 16]);
        // Pinky
        drawPath(ctx, hand, [0, 17, 18, 19, 20]);
        // Palm Base
        drawPath(ctx, hand, [5, 9, 13, 17]);

        // Draw points with glowing circular particles
        hand.forEach((joint: any, idx: number) => {
          const x = (1 - joint.x) * canvas.width;
          const y = joint.y * canvas.height;

          ctx.beginPath();
          ctx.arc(x, y, idx === 8 || idx === 12 || idx === 16 || idx === 20 || idx === 4 ? 6 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = idx === 8 ? '#ffffff' : activeColor;
          ctx.fill();
        });
      });
    }

    // 2. Draw Face Mesh
    if (showFaceMesh && faceLandmarks) {
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)'; // neon green
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 0; // disable glow for performance on face

      // We only draw outline, lips, eyes for face mesh
      const outlineIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
        400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
        54, 103, 67, 109
      ];

      ctx.beginPath();
      outlineIndices.forEach((idx, i) => {
        const pt = faceLandmarks[idx];
        if (pt) {
          const x = (1 - pt.x) * canvas.width;
          const y = pt.y * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    }
  }, [handLandmarks, faceLandmarks, showFaceMesh, activeColor]);

  const drawPath = (ctx: CanvasRenderingContext2D, hand: any, indices: number[]) => {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const joint = hand[idx];
      if (joint) {
        const x = (1 - joint.x) * ctx.canvas.width;
        const y = joint.y * ctx.canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
