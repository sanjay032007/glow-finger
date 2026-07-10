import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { getHandGesture, type GestureType } from '../utils/gestureDetection';

interface Point { x: number; y: number; z: number; }

export interface HandState {
  position: Point | null;
  gesture: GestureType;
  landmarks?: any[];
}

export interface FaceState {
  landmarks: any[] | null;
  boundingBox: { xMin: number, yMin: number, xMax: number, yMax: number, width: number, height: number } | null;
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

export const useARTracking = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasWidth: number,
  canvasHeight: number,
  isLaunched: boolean,
  trackingMode: 'HANDS' | 'FACE'
) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });
  const debugRef = useRef({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });

  const handStateRef = useRef<HandState>({ position: null, gesture: 'NONE' });
  const faceStateRef = useRef<FaceState>({ landmarks: null, boundingBox: null });

  useEffect(() => {
    if (!isLaunched) return;
    const updateDebug = setInterval(() => setDebugInfo({ ...debugRef.current }), 500);
    return () => clearInterval(updateDebug);
  }, [isLaunched]);

  const trackingModeRef = useRef(trackingMode);
  useEffect(() => {
    trackingModeRef.current = trackingMode;
  }, [trackingMode]);

  useEffect(() => {
    if (!isLaunched || !videoRef.current) return;

    let handLandmarker: HandLandmarker | null = null;
    let faceLandmarker: FaceLandmarker | null = null;
    let animFrameId: number;
    let stopped = false;

    const initAndRun = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        // Initialize both models in parallel using the same vision WASM env
        [handLandmarker, faceLandmarker] = await Promise.all([
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.6
          }),
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
        ]);

        // Wait for the video element to be ready
        const video = videoRef.current!;
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) return resolve();
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        });

        setIsReady(true);

        // Inference loop (requestAnimationFrame — zero busy-wait)
        const processFrame = () => {
          if (stopped) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) {
            animFrameId = requestAnimationFrame(processFrame);
            return;
          }

          const now = performance.now();
          debugRef.current.frames++;

          if (trackingModeRef.current === 'HANDS' && handLandmarker) {
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
            } else {
              handStateRef.current = { position: null, gesture: 'NONE', landmarks: undefined };
              debugRef.current.gesture = 'NONE';
            }
          } else if (trackingModeRef.current === 'FACE' && faceLandmarker) {
            const result = faceLandmarker.detectForVideo(video, now);
            if (result.faceLandmarks && result.faceLandmarks.length > 0) {
              const lms = result.faceLandmarks[0] as NormalizedLandmark[];
              const xs = lms.map(l => l.x);
              const ys = lms.map(l => l.y);
              const xMin = Math.min(...xs);
              const xMax = Math.max(...xs);
              const yMin = Math.min(...ys);
              const yMax = Math.max(...ys);
              faceStateRef.current = {
                landmarks: lms as any[],
                boundingBox: { xMin, yMin, xMax, yMax, width: xMax - xMin, height: yMax - yMin }
              };
              debugRef.current.results++;
            } else {
              faceStateRef.current = { landmarks: null, boundingBox: null };
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
      faceLandmarker?.close();
      setIsReady(false);
    };
  }, [isLaunched, videoRef]);

  return { isReady, error, handStateRef, faceStateRef, debugInfo };
};
