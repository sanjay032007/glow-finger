export type GestureType = 'DRAW' | 'PAUSE' | 'NONE';

export const detectGesture = (landmarks: any[]): GestureType => {
  if (!landmarks || landmarks.length < 21) return 'NONE';
  
  // Y goes from 0 (top) to 1 (bottom)
  const isIndexUp = landmarks[8].y < landmarks[6].y;
  const isMiddleUp = landmarks[12].y < landmarks[10].y;
  const isRingUp = landmarks[16].y < landmarks[14].y;
  const isPinkyUp = landmarks[20].y < landmarks[18].y;

  // If all fingers are up, pause
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) return 'PAUSE';

  // Much more forgiving draw: as long as index is up and it's not a full pause
  if (isIndexUp) return 'DRAW';

  return 'NONE';
};
