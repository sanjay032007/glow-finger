import React from 'react';

export type CameraFilter = 'NORMAL' | 'NEON' | 'POP_ART' | 'ANIME' | 'VAN_GOGH' | 'PAPER';

export const CameraFilters: React.FC = () => {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        {/* Van Gogh / Oil Painting Simulation */}
        <filter id="van-gogh" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -7" in="noise" result="coloredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="coloredNoise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          
          {/* Edge detection / Sharpen to simulate brush strokes */}
          <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" in="displaced" result="sharpened" />
          
          {/* Slight color boost */}
          <feColorMatrix type="saturate" values="1.5" in="sharpened" />
        </filter>

        {/* Soft Vintage Paper Filter */}
        <filter id="paper-sketch" x="-10%" y="-10%" width="120%" height="120%">
          {/* Subtle noise for paper grain */}
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          
          {/* Colorize noise to look like parchment/old paper */}
          <feColorMatrix type="matrix" values="
            1 0 0 0 0.8
            0 1 0 0 0.7
            0 0 1 0 0.6
            0 0 0 0.5 0" in="noise" result="coloredNoise" />
            
          {/* Warm up the original camera feed slightly before blending */}
          <feColorMatrix type="matrix" values="
            1.2 0   0   0 0
            0   1.0 0   0 0
            0   0   0.8 0 0
            0   0   0   1 0" in="SourceGraphic" result="warmVideo" />
            
          {/* Blend the camera feed with the paper texture using Multiply for a drawn-on-paper look */}
          <feBlend mode="multiply" in="warmVideo" in2="coloredNoise" result="blend1" />
          
          {/* Add a slight sepia tint and reduce saturation to complete the vintage look */}
          <feColorMatrix type="matrix" values="
            0.6 0.3 0.1 0 0.1
            0.4 0.5 0.1 0 0.1
            0.2 0.2 0.6 0 0.1
            0   0   0   1 0" in="blend1" />
        </filter>
      </defs>
    </svg>
  );
};
