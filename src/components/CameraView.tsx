import React from 'react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  showPreview: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({ videoRef, showPreview }) => (
  <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-300 ${showPreview ? 'opacity-100' : 'opacity-0'}`}>
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      style={{ transform: 'scaleX(-1)' }}
      playsInline
      muted
      autoPlay
    ></video>
  </div>
);
