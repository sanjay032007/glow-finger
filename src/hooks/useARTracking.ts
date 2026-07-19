import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { getHandGesture, type GestureType } from '../utils/gestureDetection';

interface Point { x: number; y: number; z: number; }

export interface HandState {
  position: Point | null;
  gesture: GestureType;
  landmarks?: any[];
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

let preloadedHandLandmarkerPromise: Promise<HandLandmarker> | null = null;

const preloadModel = () => {
  if (!preloadedHandLandmarkerPromise) {
    preloadedHandLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
    })();
  }
  return preloadedHandLandmarkerPromise;
};

// Start preloading immediately when the module is imported
preloadModel();


export const useARTracking = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasWidth: number,
  canvasHeight: number,
  isLaunched: boolean
) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });
  const debugRef = useRef({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });

  const handStateRef = useRef<HandState>({ position: null, gesture: 'NONE' });
  const secondHandLandmarksRef = useRef<{ x: number; y: number; z: number }[] | null>(null);

  useEffect(() => {
    if (!isLaunched) return;
    const updateDebug = setInterval(() => setDebugInfo({ ...debugRef.current }), 500);
    return () => clearInterval(updateDebug);
  }, [isLaunched]);

  useEffect(() => {
    if (!isLaunched || !videoRef.current) return;

    let handLandmarker: HandLandmarker | null = null;
    let animFrameId: number;
    let stopped = false;

    const initAndRun = async () => {
      try {
        const isMobile = window.innerWidth < 768;
        
        // Wait for preloaded model
        handLandmarker = await preloadModel();

        // Start the camera stream using standard browser APIs
        const video = videoRef.current!;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: isMobile ? 640 : 1280,
            height: isMobile ? 480 : 720,
            facingMode: 'user'
          },
          audio: false
        });
        video.srcObject = stream;
        await video.play();

        // Wait for the video element to be ready
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) return resolve();
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        });

        setIsReady(true);

        // Inference loop
        const processFrame = () => {
          if (stopped) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) {
            animFrameId = requestAnimationFrame(processFrame);
            return;
          }

          const now = performance.now();
          debugRef.current.frames++;

          if (handLandmarker) {
            const result = handLandmarker.detectForVideo(video, now);
            if (result.landmarks && result.landmarks.length > 0) {
              const rawLandmarks = result.landmarks[0] as NormalizedLandmark[];
              const gesture = getHandGesture(rawLandmarks);

              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;
              const canvasAspect = canvasWidth / canvasHeight;
              const videoAspect = videoWidth / videoHeight;

              let scale = 1, offsetX = 0, offsetY = 0;
              if (canvasAspect > videoAspect) {
                scale = canvasWidth / videoWidth;
                offsetY = (videoHeight * scale - canvasHeight) / 2;
              } else {
                scale = canvasHeight / videoHeight;
                offsetX = (videoWidth * scale - canvasWidth) / 2;
              }

              const landmarks = rawLandmarks.map((lm) => ({
                x: (1 - lm.x) * videoWidth * scale - offsetX,
                y: lm.y * videoHeight * scale - offsetY,
                z: lm.z
              }));

              const indexTip = landmarks[8];
              handStateRef.current = { position: { x: indexTip.x, y: indexTip.y, z: indexTip.z }, gesture, landmarks };
              debugRef.current.gesture = gesture;
              debugRef.current.x = indexTip.x;
              debugRef.current.y = indexTip.y;
              debugRef.current.z = indexTip.z;
              debugRef.current.results++;

              // Second hand tracking for two-hand gesture detection
              if (result.landmarks.length > 1) {
                const raw2 = result.landmarks[1] as NormalizedLandmark[];
                const lm2 = raw2.map((lm) => ({
                  x: (1 - lm.x) * videoWidth * scale - offsetX,
                  y: lm.y * videoHeight * scale - offsetY,
                  z: lm.z,
                }));
                secondHandLandmarksRef.current = lm2;
              } else {
                secondHandLandmarksRef.current = null;
              }
            } else {
              handStateRef.current = { position: null, gesture: 'NONE', landmarks: undefined };
              secondHandLandmarksRef.current = null;
              debugRef.current.gesture = 'NONE';
            }
          }

          animFrameId = requestAnimationFrame(processFrame);
        };

        animFrameId = requestAnimationFrame(processFrame);

      } catch (e: any) {
        if (!stopped) setError('Tracking error: ' + (e?.message || String(e)));
      }
    };

    initAndRun();

    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameId);
      handLandmarker?.close();
      
      // Stop all tracks in the camera stream to turn off the camera light
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsReady(false);
    };
  }, [isLaunched, videoRef, canvasWidth, canvasHeight]);

  return { isReady, error, handStateRef, secondHandLandmarksRef, debugInfo };
};
