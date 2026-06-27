import React from 'react';

interface DrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width: number;
  height: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ canvasRef, width, height }) => (
  <canvas
    ref={canvasRef}
    width={width}
    height={height}
    className="absolute inset-0 w-full h-full pointer-events-none"
  />
);
