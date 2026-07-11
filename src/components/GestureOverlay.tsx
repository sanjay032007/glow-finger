import React, { useRef, useEffect } from 'react';

interface Props {
  handLandmarks: any[] | null;
  activeColor: string;
}

export const GestureOverlay: React.FC<Props> = ({
  handLandmarks,
  activeColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (handLandmarks) {
      // Draw hand points
      ctx.fillStyle = activeColor;
      handLandmarks.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw hand connections (simplified)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];
      ctx.strokeStyle = activeColor + '80'; // 50% opacity
      ctx.lineWidth = 2;
      connections.forEach(([i, j]) => {
        if (handLandmarks[i] && handLandmarks[j]) {
          ctx.beginPath();
          ctx.moveTo(handLandmarks[i].x, handLandmarks[i].y);
          ctx.lineTo(handLandmarks[j].x, handLandmarks[j].y);
          ctx.stroke();
        }
      });
    }
  }, [handLandmarks, activeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      width={1280}
      height={720}
    />
  );
};
