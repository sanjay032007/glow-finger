// MediaPipe service wrapper to initialize and run Hands + FaceMesh on a unified camera loop.
import { getHandGesture, type GestureType } from './gestureDetection';

const getHandsClass = () => (window as any).Hands;
const getFaceMeshClass = () => (window as any).FaceMesh;
const getCameraClass = () => (window as any).Camera;

export interface MediaPipeResults {
  handLandmarks: any[] | null;
  gesture: GestureType;
  faceLandmarks: any[] | null;
  fps: number;
}

export class MediaPipeService {
  private hands: any = null;
  private faceMesh: any = null;
  private camera: any = null;
  private isProcessing = false;
  private frameCount = 0;
  private fps = 0;
  private fpsInterval: any = null;

  public async startTracking(
    videoEl: HTMLVideoElement,
    onResults: (results: MediaPipeResults) => void,
    onError: (err: any) => void
  ) {
    const HandsClass = getHandsClass();
    const FaceMeshClass = getFaceMeshClass();
    const CameraClass = getCameraClass();

    if (!HandsClass || !FaceMeshClass || !CameraClass) {
      throw new Error("MediaPipe libraries not loaded from CDN.");
    }

    try {
      const isMobile = window.innerWidth < 768;

      // 1. Hands setup
      this.hands = new HandsClass({
        locateFile: (file: string) => "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file
      });
      this.hands.setOptions({
        maxNumHands: 2, // Track both hands
        modelComplexity: isMobile ? 0 : 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      // 2. FaceMesh setup
      this.faceMesh = new FaceMeshClass({
        locateFile: (file: string) => "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" + file
      });
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      let latestHandResults: any = null;
      let latestFaceResults: any = null;

      this.hands.onResults((results: any) => {
        latestHandResults = results;
        this.triggerCallbacks(latestHandResults, latestFaceResults, onResults);
      });

      this.faceMesh.onResults((results: any) => {
        latestFaceResults = results;
        this.triggerCallbacks(latestHandResults, latestFaceResults, onResults);
      });

      // FPS tracking
      this.fpsInterval = setInterval(() => {
        this.fps = this.frameCount;
        this.frameCount = 0;
      }, 1000);

      // 3. Start Camera Loop
      this.camera = new CameraClass(videoEl, {
        onFrame: async () => {
          this.frameCount++;
          if (this.isProcessing) return;

          if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
            this.isProcessing = true;
            try {
              // Send frame to both pipelines in parallel
              await Promise.all([
                this.hands.send({ image: videoEl }),
                this.faceMesh.send({ image: videoEl })
              ]);
            } catch (err: any) {
              console.error("Inference Error:", err);
            } finally {
              this.isProcessing = false;
            }
          }
        },
        width: isMobile ? 640 : 1280,
        height: isMobile ? 480 : 720
      });

      await this.camera.start();
    } catch (e: any) {
      onError(e);
      this.stopTracking();
    }
  }

  private triggerCallbacks(
    handResults: any,
    faceResults: any,
    onResults: (results: MediaPipeResults) => void
  ) {
    let handLandmarks: any[] | null = null;
    let gesture: GestureType = 'NONE';

    if (handResults && handResults.multiHandLandmarks && handResults.multiHandLandmarks.length > 0) {
      handLandmarks = handResults.multiHandLandmarks;
      // Use primary hand for gesture style selector
      gesture = getHandGesture(handResults.multiHandLandmarks[0]);
    }

    let faceLandmarks: any[] | null = null;
    if (faceResults && faceResults.multiFaceLandmarks && faceResults.multiFaceLandmarks.length > 0) {
      faceLandmarks = faceResults.multiFaceLandmarks[0];
    }

    onResults({
      handLandmarks,
      gesture,
      faceLandmarks,
      fps: this.fps
    });
  }

  public stopTracking() {
    clearInterval(this.fpsInterval);
    if (this.camera) { this.camera.stop(); this.camera = null; }
    if (this.hands) { this.hands.close(); this.hands = null; }
    if (this.faceMesh) { this.faceMesh.close(); this.faceMesh = null; }
    this.isProcessing = false;
  }
}
