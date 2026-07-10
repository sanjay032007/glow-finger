import React from 'react';
import { motion } from 'framer-motion';
import { type GestureType } from '../utils/gestureDetection';

interface Props {
  gesture: GestureType;
  styleName: string;
  captureProgress: number;
  fps: number;
  activeColor: string;
}

const GESTURE_EMOJIS: Record<GestureType, string> = {
  NONE: '👋',
  DRAW: '☝️',
  PEACE: '✌️',
  THUMBS_UP: '👍',
  OK: '👌',
  LOVE: '🤟',
  PALM: '✋',
  CROSS_FINGERS: '🤞',
  PAUSE: '✊'
};

export const GestureHUD: React.FC<Props> = ({
  gesture,
  styleName,
  captureProgress,
  fps,
  activeColor
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Dynamic Status Card */}
      <div 
        className="glass p-6 rounded-3xl border transition-all duration-500"
        style={{ borderColor: activeColor + '30', boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${activeColor}10` }}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1">
              Active Gesture
            </span>
            <span className="text-3xl font-black text-white flex items-center gap-2">
              <span className="text-4xl">{GESTURE_EMOJIS[gesture] || '👋'}</span>
              {gesture === 'NONE' ? 'Detecting...' : gesture.replace('_', ' ')}
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-right">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest block">Inference</span>
            <span className="text-xs font-mono font-bold text-[#39ff14]">{fps} FPS</span>
          </div>
        </div>

        {/* Mapped Style Indicator */}
        <div className="mb-4">
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1">
            Mapped Style
          </span>
          <span 
            className="text-4xl font-extrabold tracking-tight uppercase"
            style={{ 
              color: activeColor,
              textShadow: `0 0 20px ${activeColor}60`
            }}
          >
            {styleName}
          </span>
        </div>

        {/* Auto Capture Bar */}
        {captureProgress > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-1 text-[10px] font-bold tracking-wider uppercase text-white/60">
              <span>Capturing Snapshot...</span>
              <span>{Math.round(captureProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full rounded-full"
                style={{ backgroundColor: activeColor }}
                animate={{ width: `${captureProgress}%` }}
                transition={{ ease: "easeOut", duration: 0.1 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
