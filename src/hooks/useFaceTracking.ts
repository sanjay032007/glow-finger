import { useEffect, useRef, useState } from 'react';

const getFaceMeshClass = () => (window as any).FaceMesh;
const getCameraClass = () => (window as any).Camera;

export interface FaceState {
  landmarks: any[] | null;
  boundingBox: { xMin: number, yMin: number, xMax: number, yMax: number, width: number, height: number } | null;
}

export const useFaceTracking = (videoRef: React.RefObject<HTMLVideoElement>, canvasWidth: number, canvasHeight: number, enabled: boolean) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const faceStateRef = useRef<FaceState>({ landmarks: null, boundingBox: null });

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    
    let camera: any = null;
    let faceMesh: any = null;
    let pollTimeout: number;

    const initTracking = () => {
        const FaceMeshClass = getFaceMeshClass();
        const CameraClass = getCameraClass();

        if (!FaceMeshClass || !CameraClass) {
            console.log("Waiting for MediaPipe FaceMesh...");
            pollTimeout = setTimeout(initTracking, 500) as any;
            return;
        }

        try {
            faceMesh = new FaceMeshClass({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

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

                    // Map landmarks to canvas coordinates (-half to +half for 3D mapping)
                    const landmarks = rawLandmarks.map((lm: any) => ({
                        x: ((1 - lm.x) * videoWidth * scale - offsetX) / canvasW * 2 - 1, // Normalized -1 to 1 (flipped X)
                        y: -(((lm.y * videoHeight * scale - offsetY) / canvasH) * 2 - 1), // Normalized -1 to 1 (flipped Y)
                        z: -lm.z * 5 // approximate depth
                    }));

                    // Calculate basic bounding box
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

            camera = new CameraClass(videoRef.current, {
                onFrame: async () => {
                    if (videoRef.current && enabled) {
                        await faceMesh.send({image: videoRef.current});
                    }
                },
                width: 1280,
                height: 720
            });
            
            camera.start().then(() => {
                setIsReady(true);
            }).catch((err: any) => {
                setError(err.message || "Failed to start camera for Face Tracking");
            });

        } catch (e: any) {
            setError(e.message || "Failed to init FaceMesh");
        }
    };

    initTracking();

    return () => {
        clearTimeout(pollTimeout);
        if (camera) { camera.stop(); camera = null; }
        if (faceMesh) { faceMesh.close(); faceMesh = null; }
        setIsReady(false);
    };
  }, [enabled, videoRef]);

  return { isReady, error, faceStateRef };
};
