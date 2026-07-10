import { useEffect, useRef, useState } from 'react';
import { getHandGesture, type GestureType } from '../utils/gestureDetection';

// MediaPipe loaded via npm packages

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

  // Keep trackingMode in ref for immediate access inside async loop
  const trackingModeRef = useRef(trackingMode);
  useEffect(() => {
    trackingModeRef.current = trackingMode;
  }, [trackingMode]);

  useEffect(() => {
    if (!isLaunched || !videoRef.current) return;

    let camera: any = null;
    let hands: any = null;
    let faceMesh: any = null;

    const initTracking = async () => {
      try {
        const isMobile = window.innerWidth < 768;

        const [{ Hands }, { FaceMesh }, { Camera }] = await Promise.all([
          import('@mediapipe/hands'),
          import('@mediapipe/face_mesh'),
          import('@mediapipe/camera_utils')
        ]);

        // 1. Initialize Hands Model
        hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: isMobile ? 0 : 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        // 2. Initialize Face Mesh Model
        faceMesh = new FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        // 3. Setup Hands callback
        hands.onResults((results: any) => {
          debugRef.current.results++;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0];
            const gesture = getHandGesture(rawLandmarks);

            const videoEl = videoRef.current;
            const videoWidth = videoEl ? videoEl.videoWidth : 1280;
            const videoHeight = videoEl ? videoEl.videoHeight : 720;

            const videoAspect = videoWidth / videoHeight;
            const canvasW = videoEl ? videoEl.clientWidth || canvasWidth : canvasWidth;
            const canvasH = videoEl ? videoEl.clientHeight || canvasHeight : canvasHeight;
            const canvasAspect = canvasW / canvasH;

            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;

            if (canvasAspect > videoAspect) {
              scale = canvasW / videoWidth;
              offsetY = (videoHeight * scale - canvasH) / 2;
            } else {
              scale = canvasH / videoHeight;
              offsetX = (videoWidth * scale - canvasW) / 2;
            }

            const landmarks = rawLandmarks.map((lm: any) => ({
              x: (1 - lm.x) * videoWidth * scale - offsetX,
              y: lm.y * videoHeight * scale - offsetY,
              z: lm.z
            }));

            const indexTip = landmarks[8];
            handStateRef.current = {
              position: { x: indexTip.x, y: indexTip.y, z: indexTip.z },
              gesture,
              landmarks
            };

            debugRef.current.gesture = gesture;
            debugRef.current.x = indexTip.x;
            debugRef.current.y = indexTip.y;
            debugRef.current.z = indexTip.z;
          } else {
            handStateRef.current = { position: null, gesture: 'NONE', landmarks: undefined };
            debugRef.current.gesture = 'NONE';
            debugRef.current.z = 0;
          }
        });

        // 4. Setup Face Mesh callback
        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const rawLandmarks = results.multiFaceLandmarks[0];

            const videoEl = videoRef.current;
            const videoWidth = videoEl ? videoEl.videoWidth : 1280;
            const videoHeight = videoEl ? videoEl.videoHeight : 720;

            const videoAspect = videoWidth / videoHeight;
            const canvasW = videoEl ? videoEl.clientWidth || canvasWidth : canvasWidth;
            const canvasH = videoEl ? videoEl.clientHeight || canvasHeight : canvasHeight;
            const canvasAspect = canvasW / canvasH;

            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;

            if (canvasAspect > videoAspect) {
              scale = canvasW / videoWidth;
              offsetY = (videoHeight * scale - canvasH) / 2;
            } else {
              scale = canvasH / videoHeight;
              offsetX = (videoWidth * scale - canvasW) / 2;
            }

            const landmarks = rawLandmarks.map((lm: any) => ({
              x: ((1 - lm.x) * videoWidth * scale - offsetX) / canvasW * 2 - 1,
              y: -(((lm.y * videoHeight * scale - offsetY) / canvasH) * 2 - 1),
              z: -lm.z * 5
            }));

            let xMin = 999, yMin = 999, xMax = -999, yMax = -999;
            landmarks.forEach((lm: any) => {
              if (lm.x < xMin) xMin = lm.x;
              if (lm.x > xMax) xMax = lm.x;
              if (lm.y < yMin) yMin = lm.y;
              if (lm.y > yMax) yMax = lm.y;
            });

            faceStateRef.current = {
              landmarks,
              boundingBox: { xMin, yMin, xMax, yMax, width: xMax - xMin, height: yMax - yMin }
            };
          } else {
            faceStateRef.current = { landmarks: null, boundingBox: null };
          }
        });

        // 5. Unified Camera Frame Loop
        let isProcessing = false;
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            debugRef.current.frames++;
            if (isProcessing) return;

            const videoEl = videoRef.current;
            if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
              isProcessing = true;
              try {
                if (trackingModeRef.current === 'HANDS') {
                  if (hands) await hands.send({ image: videoEl });
                } else if (trackingModeRef.current === 'FACE') {
                  if (faceMesh) await faceMesh.send({ image: videoEl });
                }
              } catch (err: any) {
                setError("Tracking error: " + (err && err.message ? err.message : String(err)));
              } finally {
                isProcessing = false;
              }
            }
          },
          width: isMobile ? 640 : 1280,
          height: isMobile ? 480 : 720
        });

        camera.start().then(() => {
          setIsReady(true);
        }).catch(() => {
          setError('Camera start failed. Please allow camera permissions.');
        });

      } catch (e: any) {
        setError(e.message || 'Failed to initialize AI core.');
      }
    };

    initTracking();

    return () => {
      if (camera) { camera.stop(); camera = null; }
      if (hands) { hands.close(); hands = null; }
      if (faceMesh) { faceMesh.close(); faceMesh = null; }
      setIsReady(false);
    };
  }, [isLaunched, videoRef]);

  return { isReady, error, handStateRef, faceStateRef, debugInfo };
};
