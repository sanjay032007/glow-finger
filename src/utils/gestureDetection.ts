export type GestureType = 
  | 'NONE'
  | 'DRAW'           // Index Finger
  | 'PEACE'          // Peace Sign
  | 'THUMBS_UP'      // Thumbs Up
  | 'OK'             // OK Sign
  | 'LOVE'           // Love Sign (🤟)
  | 'PALM'           // Open Palm
  | 'CROSS_FINGERS'  // Cross Fingers
  | 'PAUSE';         // Fist/Hold (For backward compatibility)

export function getHandGesture(landmarks: any[]): GestureType {
  if (!landmarks || landmarks.length < 21) return 'NONE';

  // Helper: check if finger is extended (tip is above pip joint)
  const thumbIsUp = landmarks[4].y < landmarks[3].y && landmarks[4].y < landmarks[2].y;
  const indexIsUp = landmarks[8].y < landmarks[6].y;
  const middleIsUp = landmarks[12].y < landmarks[10].y;
  const ringIsUp = landmarks[16].y < landmarks[14].y;
  const pinkyIsUp = landmarks[20].y < landmarks[18].y;

  // Calculate tip distances
  const thumbIndexDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
  const indexMiddleDist = Math.hypot(landmarks[8].x - landmarks[12].x, landmarks[8].y - landmarks[12].y);

  // 1. OK SIGN (👌): Thumb and Index tip touching, other three fingers extended
  if (thumbIndexDist < 0.06 && middleIsUp && ringIsUp && pinkyIsUp) {
    return 'OK';
  }

  // 2. LOVE SIGN (🤟): Thumb, Index, Pinky extended, Middle and Ring folded
  if (thumbIsUp && indexIsUp && pinkyIsUp && !middleIsUp && !ringIsUp) {
    return 'LOVE';
  }

  // 3. CROSS FINGERS (🤞): Index and Middle are up and very close/intersecting, Ring and Pinky folded
  if (indexIsUp && middleIsUp && indexMiddleDist < 0.045 && !ringIsUp && !pinkyIsUp) {
    return 'CROSS_FINGERS';
  }

  // 4. PEACE (✌️): Index and Middle up, others folded
  if (indexIsUp && middleIsUp && !ringIsUp && !pinkyIsUp) {
    return 'PEACE';
  }

  // 5. THUMBS UP (👍): Thumb up, all other fingers folded down
  if (thumbIsUp && !indexIsUp && !middleIsUp && !ringIsUp && !pinkyIsUp) {
    return 'THUMBS_UP';
  }

  // 6. INDEX FINGER (☝️): Only index is up, others folded
  if (indexIsUp && !middleIsUp && !ringIsUp && !pinkyIsUp) {
    return 'DRAW';
  }

  // 7. OPEN PALM (✋): All fingers extended
  if (indexIsUp && middleIsUp && ringIsUp && pinkyIsUp) {
    return 'PALM';
  }

  // 8. FIST / PAUSE (✊): All fingers folded
  if (!thumbIsUp && !indexIsUp && !middleIsUp && !ringIsUp && !pinkyIsUp) {
    return 'PAUSE';
  }

  return 'NONE';
}
