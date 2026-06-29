import { useEffect, useRef, useState } from 'react';
import { getHandGesture, type GestureType } from '../utils/gestureDetection';

const getHandsClass = () => (window as any).Hands;
const getFaceMeshClass = () => (window as any).FaceMesh;
const getCameraClass = () => (window as any).Camera;

interface Point { x: number; y: number; z: number; }

export interface HandState {
  position: Point | null;
  gesture: GestureType;
  landmarks?: any[];
}

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement>, canvasWidth: number, canvasHeight: number, enabled: boolean, faceStyle: string) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const faceStyleRef = useRef(faceStyle);
  useEffect(() => {
    faceStyleRef.current = faceStyle;
  }, [faceStyle]);
  
  const [debugInfo, setDebugInfo] = useState({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });
  const debugRef = useRef({ frames: 0, results: 0, gesture: 'NONE', x: 0, y: 0, z: 0 });
  
  const handStateRef = useRef<HandState>({ position: null, gesture: 'NONE' });
  const [faceLandmarks, setFaceLandmarks] = useState<any[] | null>(null);

  const dimensionsRef = useRef({ width: canvasWidth, height: canvasHeight });
  useEffect(() => {
    dimensionsRef.current = { width: canvasWidth, height: canvasHeight };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!enabled) return;
    const updateDebug = setInterval(() => setDebugInfo({ ...debugRef.current }), 500);
    return () => clearInterval(updateDebug);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    
    let camera: any = null;
    let hands: any = null;
    let faceMesh: any = null;
    let pollTimeout: number;

    const initTracking = () => {
        const HandsClass = getHandsClass();
        const FaceMeshClass = getFaceMeshClass();
        const CameraClass = getCameraClass();

        // FaceMesh is optional - only HandsClass and CameraClass are required for drawing
        if (!HandsClass || !CameraClass) {
            console.log("Waiting for MediaPipe Hands and Camera CDN scripts to load...");
            pollTimeout = setTimeout(initTracking, 500) as any;
            return;
        }

        try {
            hands = new HandsClass({
                locateFile: (file: string) => `/mediapipe/${file}`
            });
            
            // Save initialized Hands Module and clear global Module
            (window as any).HandsModule = (window as any).Module;
            (window as any).Module = undefined;

            const isMobile = window.innerWidth < 768;
            hands.setOptions({
                maxNumHands: 1, 
                modelComplexity: isMobile ? 0 : 1,
                minDetectionConfidence: 0.7, 
                minTrackingConfidence: 0.7
            });

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

            if (FaceMeshClass) {
                faceMesh = new FaceMeshClass({
                    locateFile: (file: string) => `/mediapipe/${file}`
                });
                
                // Save initialized FaceMesh Module and clear global Module
                (window as any).FaceMeshModule = (window as any).Module;
                (window as any).Module = undefined;
                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                faceMesh.onResults((results: any) => {
                    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                        setFaceLandmarks(results.multiFaceLandmarks[0]);
                    } else {
                        setFaceLandmarks(null);
                    }
                });
            } else {
                console.warn("FaceMesh CDN script not loaded. Face AR features will be disabled.");
            }

            let isProcessing = false;
            camera = new CameraClass(videoRef.current, {
                onFrame: async () => { 
                    debugRef.current.frames++;
                    if (isProcessing) return;
                    const videoEl = videoRef.current;
                    // Ensure the video is playing and has valid dimensions before feeding to AI
                    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
                        isProcessing = true;
                        try { 
                            const promises = [];
                            if (hands) {
                                promises.push(hands.send({ image: videoEl }).catch((err: any) => console.error("Hands send error:", err)));
                            }
                            // Only run faceMesh if we actually have an active AR face filter!
                            if (faceMesh && faceStyleRef.current !== 'NORMAL') {
                                promises.push(faceMesh.send({ image: videoEl }).catch((err: any) => console.error("FaceMesh send error:", err)));
                            }
                            if (promises.length > 0) {
                                await Promise.all(promises);
                            }
                        } 
                        catch(err: any) { console.error("MediaPipe send error:", err); }
                        finally { isProcessing = false; }
                    }
                },
                width: isMobile ? 640 : 1280, 
                height: isMobile ? 480 : 720
            });
            camera.start().then(() => setIsReady(true)).catch(() => setError('Camera start failed. Please allow camera permissions.'));
        } catch (e: any) { 
            setError(e.message || 'Failed to initialize AI core.'); 
        }
    };

    initTracking();

    return () => { 
        clearTimeout(pollTimeout);
        if (camera) camera.stop(); 
        if (hands) hands.close(); 
        if (faceMesh) faceMesh.close();
    };
  }, [videoRef, enabled]);

  return { isReady, error, handStateRef, debugInfo, faceLandmarks };
};

