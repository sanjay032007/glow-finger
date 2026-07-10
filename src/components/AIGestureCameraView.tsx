import React from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraActive: boolean;
}

export const AIGestureCameraView: React.FC<Props> = ({ videoRef, isCameraActive }) => {
  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0d] shadow-2xl">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
        autoPlay
      />
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#ff007f] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-white/60 tracking-wider text-xs uppercase font-bold animate-pulse">
            Booting Camera Stream...
          </p>
        </div>
      )}
    </div>
  );
};
