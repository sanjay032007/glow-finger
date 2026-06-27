import { useEffect, useState } from 'react';

export const FPSIndicator = () => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="absolute top-6 right-6 glass-panel px-3 py-1 rounded-full flex items-center gap-2 z-20">
      <div className={`w-2 h-2 rounded-full ${fps > 30 ? 'bg-neonGreen shadow-[0_0_8px_#39ff14]' : 'bg-neonOrange'}`}></div>
      <span className="text-xs font-mono text-white/80">{fps} FPS</span>
    </div>
  );
};
