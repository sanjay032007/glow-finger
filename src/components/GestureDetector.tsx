import React, { useRef, useEffect } from 'react';
import { type GestureType } from '../utils/gestureDetection';

interface Props {
  rawGesture: GestureType;
  onSmoothGesture: (gesture: GestureType) => void;
}

export const GestureDetector: React.FC<Props> = ({
  rawGesture,
  onSmoothGesture
}) => {
  const historyRef = useRef<GestureType[]>([]);

  useEffect(() => {
    // Add raw gesture to history
    const history = historyRef.current;
    history.push(rawGesture);
    if (history.length > 8) {
      history.shift();
    }

    // Perform majority voting for smoothing
    const counts: Record<string, number> = {};
    let maxGesture: GestureType = 'NONE';
    let maxCount = 0;

    history.forEach((g) => {
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] > maxCount) {
        maxCount = counts[g];
        maxGesture = g;
      }
    });

    onSmoothGesture(maxGesture);
  }, [rawGesture, onSmoothGesture]);

  return null; // Logic-only component
};
