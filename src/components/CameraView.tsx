import React from 'react';
import type { CameraFilter } from './CameraFilters';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  showPreview: boolean;
  cameraFilter: CameraFilter;
}

export const CameraView: React.FC<CameraViewProps> = ({ videoRef, showPreview, cameraFilter }) => {
  const getFilterStyle = () => {
    switch (cameraFilter) {
      case 'NEON':
        return 'contrast(1.5) saturate(2) hue-rotate(180deg) brightness(1.2)';
      case 'POP_ART':
        return 'contrast(2) saturate(3) sepia(0.5) hue-rotate(45deg)';
      case 'ANIME':
        return 'contrast(1.2) saturate(1.5) brightness(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.5))';
      case 'VAN_GOGH':
        return 'url(#van-gogh)';
      case 'PAPER':
        return 'url(#paper-sketch)';
      case 'NORMAL':
      default:
        return 'none';
    }
  };

  return (
    <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-300 ${showPreview ? 'opacity-100' : 'opacity-0'}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover transition-all duration-500"
        style={{ 
          transform: 'scaleX(-1)',
          filter: getFilterStyle()
        }}
        playsInline
        muted
        autoPlay
      ></video>
    </div>
  );
};
