import { HandLandmarker, FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { getHandGesture, type GestureType } from './gestureDetection';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

export interface MediaPipeResults {
  handLandmarks: any[] | null;
  gesture: GestureType;
  faceLandmarks: any[] | null;
  fps: number;
}

export class MediaPipeService {
  private handLandmarker: HandLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private animFrameId = 0;
  private stopped = false;
  private frameCount = 0;
  private fps = 0;
  private fpsInterval: any = null;

  public async startTracking(
    videoEl: HTMLVideoElement,
    onResults: (results: MediaPipeResults) => void,
    onError: (err: any) => void
  ) {
    try {
      const isMobile = window.innerWidth < 768;
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      [this.handLandmarker, this.faceLandmarker] = await Promise.all([
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: isMobile ? 'CPU' : 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6
        }),
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: isMobile ? 'CPU' : 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })
      ]);

      // Wait for video
      await new Promise<void>((resolve) => {
        if (videoEl.readyState >= 2) return resolve();
        videoEl.addEventListener('loadeddata', () => resolve(), { once: true });
      });

      this.fpsInterval = setInterval(() => {
        this.fps = this.frameCount;
        this.frameCount = 0;
      }, 1000);

      const loop = () => {
        if (this.stopped) return;

        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
          const now = performance.now();
          this.frameCount++;

          let handLandmarks: any[] | null = null;
          let gesture: GestureType = 'NONE';
          let faceLandmarks: any[] | null = null;

          if (this.handLandmarker) {
            const handResult = this.handLandmarker.detectForVideo(videoEl, now);
            if (handResult.landmarks && handResult.landmarks.length > 0) {
              handLandmarks = handResult.landmarks as any[];
              gesture = getHandGesture(handResult.landmarks[0] as NormalizedLandmark[]);
            }
          }

          if (this.faceLandmarker) {
            const faceResult = this.faceLandmarker.detectForVideo(videoEl, now);
            if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
              faceLandmarks = faceResult.faceLandmarks[0] as any[];
            }
          }

          onResults({ handLandmarks, gesture, faceLandmarks, fps: this.fps });
        }

        this.animFrameId = requestAnimationFrame(loop);
      };

      this.animFrameId = requestAnimationFrame(loop);

    } catch (e: any) {
      onError(e);
      this.stopTracking();
    }
  }

  public stopTracking() {
    this.stopped = true;
    clearInterval(this.fpsInterval);
    cancelAnimationFrame(this.animFrameId);
    this.handLandmarker?.close();
    this.faceLandmarker?.close();
    this.handLandmarker = null;
    this.faceLandmarker = null;
  }
}
