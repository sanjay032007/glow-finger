export type GestureType = 'DRAW' | 'PAUSE' | 'PEACE' | 'NONE' | 'ERASE' | 'PINCH' | 'ROCK' | 'THUMBS_UP';

export function getHandGesture(landmarks: any[]): 'NONE' | 'DRAW' | 'ERASE' | 'PAUSE' | 'PINCH' | 'PEACE' | 'ROCK' | 'THUMBS_UP' {
    if (!landmarks || landmarks.length < 21) return 'NONE';

    // Get finger states
    const thumbIsUp = landmarks[4].y < landmarks[3].y && landmarks[4].y < landmarks[2].y;
    // Check if thumb is extended far to the side (x axis) or just pointing up
    // A thumbs up generally has thumb up, and other fingers curled (y is below their base joints)
    
    const indexIsUp = landmarks[8].y < landmarks[6].y;
    const middleIsUp = landmarks[12].y < landmarks[10].y;
    const ringIsUp = landmarks[16].y < landmarks[14].y;
    const pinkyIsUp = landmarks[20].y < landmarks[18].y;

    // PINCH: index and thumb close together
    const distance = Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y);
    if (distance < 0.05 && !middleIsUp && !ringIsUp && !pinkyIsUp) return 'PINCH';

    // ERASE: open palm (all fingers up)
    if (indexIsUp && middleIsUp && ringIsUp && pinkyIsUp) {
        return 'ERASE';
    }

    // PEACE: index and middle up, others down
    if (indexIsUp && middleIsUp && !ringIsUp && !pinkyIsUp) {
        return 'PEACE';
    }

    // ROCK: index and pinky up, middle and ring down
    if (indexIsUp && pinkyIsUp && !middleIsUp && !ringIsUp) {
        return 'ROCK';
    }

    // THUMBS_UP: thumb is noticeably higher than other fingers, others down
    if (thumbIsUp && !indexIsUp && !middleIsUp && !ringIsUp && !pinkyIsUp) {
        return 'THUMBS_UP';
    }

    // DRAW: only index up
    if (indexIsUp && !middleIsUp && !ringIsUp && !pinkyIsUp) {
        return 'DRAW';
    }

    return 'NONE';
};
