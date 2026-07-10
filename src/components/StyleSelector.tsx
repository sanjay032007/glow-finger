import React from 'react';
import { type GestureType } from '../utils/gestureDetection';

interface StyleItem {
  gesture: GestureType;
  emoji: string;
  name: string;
  description: string;
  color: string;
}

export const STYLE_MAP: StyleItem[] = [
  { gesture: 'DRAW', emoji: '☝️', name: 'Anime', description: 'Vibrant graphic illustrations', color: '#00f3ff' },
  { gesture: 'PEACE', emoji: '✌️', name: 'Cyberpunk', description: 'Retro-futuristic neon hues', color: '#ff007f' },
  { gesture: 'THUMBS_UP', emoji: '👍', name: 'Comic', description: 'Halftone pulp art comic', color: '#b026ff' },
  { gesture: 'OK', emoji: '👌', name: 'Sketch', description: 'Fine pencil outline drawing', color: '#ffffff' },
  { gesture: 'LOVE', emoji: '🤟', name: 'Watercolor', description: 'Fluid, soft wash painting', color: '#ff8c00' },
  { gesture: 'CROSS_FINGERS', emoji: '🤞', name: 'Neon', description: 'Electrifying bright glows', color: '#39ff14' },
  { gesture: 'PALM', emoji: '✋', name: 'Original', description: 'Raw camera output feed', color: '#ffffff' }
];

interface Props {
  activeGesture: GestureType;
}

export const StyleSelector: React.FC<Props> = ({ activeGesture }) => {
  return (
    <div className="glass p-6 rounded-3xl border border-white/5 shadow-2xl">
      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-4">
        Gesture → Style Mapping
      </span>
      <div className="flex flex-col gap-3">
        {STYLE_MAP.map((item) => {
          const isActive = item.gesture === activeGesture;
          return (
            <div
              key={item.gesture}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 ${
                isActive 
                  ? 'bg-white/5 scale-[1.02]' 
                  : 'bg-transparent border-transparent opacity-50'
              }`}
              style={{ 
                borderColor: isActive ? item.color + '40' : 'transparent',
                boxShadow: isActive ? `0 0 20px ${item.color}0a` : 'none'
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border border-white/10"
                style={{ 
                  backgroundColor: isActive ? item.color + '15' : 'rgba(255,255,255,0.02)',
                  borderColor: isActive ? item.color + '30' : 'rgba(255,255,255,0.1)'
                }}
              >
                {item.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white tracking-wide">{item.name}</p>
                <p className="text-[10px] text-white/50">{item.description}</p>
              </div>
              {isActive && (
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
