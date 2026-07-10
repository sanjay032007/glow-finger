// CaptureEngine.ts: Tracks stable hand gestures and handles 1-second auto-capture timing.
import { type GestureType } from './gestureDetection';

export class CaptureEngine {
  private lastGesture: GestureType = 'NONE';
  private startTimestamp: number | null = null;
  private isCompleted = false;

  public update(
    currentGesture: GestureType,
    onCapture: () => void,
    onProgress: (percent: number) => void
  ) {
    if (currentGesture === 'NONE' || currentGesture === 'DRAW' || currentGesture === 'PAUSE') {
      // Clear/Reset on non-styling gestures
      this.reset(onProgress);
      return;
    }

    if (currentGesture !== this.lastGesture) {
      // Gesture changed, start timing again
      this.lastGesture = currentGesture;
      this.startTimestamp = Date.now();
      this.isCompleted = false;
      onProgress(0);
      return;
    }

    if (this.isCompleted) return;

    if (this.startTimestamp !== null) {
      const elapsed = Date.now() - this.startTimestamp;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      onProgress(progress);

      if (progress >= 100) {
        this.isCompleted = true;
        onCapture();
      }
    }
  }

  public reset(onProgress?: (percent: number) => void) {
    this.lastGesture = 'NONE';
    this.startTimestamp = null;
    this.isCompleted = false;
    if (onProgress) onProgress(0);
  }
}
