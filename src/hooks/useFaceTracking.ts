import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export type FaceLandmark = { x: number; y: number; z: number };

let preloadedFaceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

const preloadFaceModel = () => {
  if (!preloadedFaceLandmarkerPromise) {
    preloadedFaceLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      return await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return preloadedFaceLandmarkerPromise;
};

// Preloading is now deferred until enabled (see useEffect below)

export const useFaceTracking = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasWidth: number,
  canvasHeight: number,
  isLaunched: boolean,
  enabled: boolean
) => {
  const faceLandmarksRef = useRef<FaceLandmark[] | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<FaceLandmark[] | null>(null);

  useEffect(() => {
    if (!isLaunched || !enabled) {
      faceLandmarksRef.current = null;
      setFaceLandmarks(null);
      return;
    }

    let faceLandmarker: FaceLandmarker | null = null;
    let animFrameId: number;
    let stopped = false;
    let lastStateUpdate = 0;
    const STATE_UPDATE_INTERVAL = 100; // Throttle React state updates to 10 FPS

    const initAndRun = async () => {
      try {
        faceLandmarker = await preloadFaceModel();
        const video = videoRef.current;
        if (!video) return;
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) return resolve();
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        });
        const processFrame = () => {
          if (stopped) return;
          const vid = videoRef.current;
          if (!vid || vid.readyState < 2 || vid.videoWidth === 0) {
            animFrameId = requestAnimationFrame(processFrame);
            return;
          }
          const now = performance.now();
          if (faceLandmarker) {
            try {
              const result = faceLandmarker.detectForVideo(vid, now);
              if (result.faceLandmarks && result.faceLandmarks.length > 0) {
                const rawLandmarks = result.faceLandmarks[0];
                const videoWidth = vid.videoWidth;
                const videoHeight = vid.videoHeight;
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
                const mapped: FaceLandmark[] = rawLandmarks.map((lm) => ({
                  x: (1 - lm.x) * videoWidth * scale - offsetX,
                  y: lm.y * videoHeight * scale - offsetY,
                  z: lm.z,
                }));
                faceLandmarksRef.current = mapped;
                const now2 = performance.now();
                if (now2 - lastStateUpdate > STATE_UPDATE_INTERVAL) {
                  setFaceLandmarks(mapped);
                  lastStateUpdate = now2;
                }
              } else {
                faceLandmarksRef.current = null;
              }
            } catch (_) {}
          }
          animFrameId = requestAnimationFrame(processFrame);
        };
        animFrameId = requestAnimationFrame(processFrame);
      } catch (e) {
        console.error('Face tracking error:', e);
      }
    };
    initAndRun();
    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameId);
      faceLandmarker?.close();
      faceLandmarksRef.current = null;
      setFaceLandmarks(null);
    };
  }, [isLaunched, enabled, videoRef, canvasWidth, canvasHeight]);

  return { faceLandmarks, faceLandmarksRef };
};