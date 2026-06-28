import React from 'react';
import type { FaceStyle } from './CameraFilters';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  showPreview: boolean;
  faceStyle?: FaceStyle;
}

const getFilterStyle = (style?: FaceStyle) => {
  switch (style) {
    case 'NEON':
      return 'invert(1) hue-rotate(180deg) contrast(200%) drop-shadow(0 0 10px #00f3ff)';
    case 'POP_ART':
      return 'contrast(300%) saturate(200%) sepia(50%) hue-rotate(-50deg)';
    case 'ANIME':
      return 'contrast(150%) saturate(150%) brightness(120%) sepia(20%) hue-rotate(-10deg)';
    case 'VAN_GOGH':
      return 'url(#van-gogh)';
    case 'PAPER':
      return 'url(#paper-sketch)';
    default:
      return 'none';
  }
};

export const CameraView: React.FC<CameraViewProps> = ({ videoRef, showPreview, faceStyle = 'NORMAL' }) => (
  <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-300 ${showPreview ? 'opacity-100' : 'opacity-0'}`}>
    <video
      ref={videoRef}
      className="w-full h-full object-cover transition-all duration-500"
      style={{ 
        transform: 'scaleX(-1)',
        filter: getFilterStyle(faceStyle)
      }}
      playsInline
      muted
      autoPlay
    ></video>
  </div>
);
