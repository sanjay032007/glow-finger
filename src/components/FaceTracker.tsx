import React from 'react';
import { ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

interface Props {
  showFaceMesh: boolean;
  setShowFaceMesh: (val: boolean) => void;
  faceDetected: boolean;
}

export const FaceTracker: React.FC<Props> = ({
  showFaceMesh,
  setShowFaceMesh,
  faceDetected
}) => {
  return (
    <div className="glass p-6 rounded-3xl border border-white/5 shadow-2xl flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div 
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors duration-300 ${
            faceDetected ? 'bg-[#39ff14]/10 border-[#39ff14]/30 text-[#39ff14]' : 'bg-white/20 border-white/10 text-white/40'
          }`}
        >
          <Sparkles size={22} className={faceDetected ? 'animate-pulse' : ''} />
        </div>
        <div>
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-0.5">
            Face Mesh
          </span>
          <span className="text-sm font-bold text-white tracking-wide">
            {faceDetected ? 'Tracking Face Active' : 'Searching Face...'}
          </span>
        </div>
      </div>
      <button 
        onClick={() => setShowFaceMesh(!showFaceMesh)}
        className="text-white hover:opacity-80 transition-opacity"
      >
        {showFaceMesh ? (
          <ToggleRight size={44} className="text-[#39ff14]" />
        ) : (
          <ToggleLeft size={44} className="text-white/30" />
        )}
      </button>
    </div>
  );
};
