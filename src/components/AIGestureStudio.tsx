import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ShieldAlert, Cpu } from 'lucide-react';
import { ModelLoader } from '../utils/ModelLoader';
import { MediaPipeService, type MediaPipeResults } from '../utils/MediaPipeService';
import { CaptureEngine } from '../utils/CaptureEngine';
import { AIGestureCameraView } from './AIGestureCameraView';
import { GestureOverlay } from './GestureOverlay';
import { GestureHUD } from './GestureHUD';
import { StyleSelector, STYLE_MAP } from './StyleSelector';
import { FaceTracker } from './FaceTracker';
import { GestureDetector } from './GestureDetector';
import { StyleTransfer } from './StyleTransfer';
import { type GestureType } from '../utils/gestureDetection';

export const AIGestureStudio: React.FC = () => {
  const [modelProgress, setModelProgress] = useState(0);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const [trackingResults, setTrackingResults] = useState<MediaPipeResults>({
    handLandmarks: null,
    gesture: 'NONE',
    faceLandmarks: null,
    fps: 0
  });

  const [smoothGesture, setSmoothGesture] = useState<GestureType>('NONE');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const [showFaceMesh, setShowFaceMesh] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null!);
  const mediaPipeServiceRef = useRef<MediaPipeService | null>(null);
  const captureEngineRef = useRef<CaptureEngine | null>(null);

  // 1. Lazy load TF.js and Style Models on Mount
  useEffect(() => {
    let active = true;
    const initAI = async () => {
      try {
        await ModelLoader.loadModels((p) => {
          if (active) setModelProgress(p);
        });
        if (active) setIsLoadingModels(false);
      } catch (err: any) {
        console.error("TF.js load error, utilizing local GPU fallback:", err);
        // Fallback: Proceed even if TF.js fails, we use high-fidelity canvas filters
        if (active) {
          setIsLoadingModels(false);
        }
      }
    };
    initAI();
    return () => {
      active = false;
    };
  }, []);

  // 2. Initialize tracking services
  useEffect(() => {
    if (isLoadingModels || !videoRef.current || capturedFrame) return;

    const mpService = new MediaPipeService();
    mediaPipeServiceRef.current = mpService;

    const captureEngine = new CaptureEngine();
    captureEngineRef.current = captureEngine;

    mpService.startTracking(
      videoRef.current,
      (results) => {
        setTrackingResults(results);
        setIsCameraActive(true);

        // Run Capture Engine tick
        if (captureEngineRef.current) {
          captureEngineRef.current.update(
            results.gesture,
            () => triggerCapture(),
            (p) => setCaptureProgress(p)
          );
        }
      },
      (err) => {
        console.error(err);
        setTrackingError("Camera permissions denied or failed to access.");
      }
    );

    return () => {
      mpService.stopTracking();
      setIsCameraActive(false);
    };
  }, [isLoadingModels, capturedFrame]);

  // 3. Captures a single frame
  const triggerCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    // Flash screen animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      setCapturedFrame(canvas.toDataURL('image/jpeg'));
    }
  };

  const handleSmoothGesture = useCallback((g: GestureType) => {
    setSmoothGesture(g);
  }, []);

  const handleReset = () => {
    setCapturedFrame(null);
    setCaptureProgress(0);
    if (captureEngineRef.current) {
      captureEngineRef.current.reset();
    }
  };

  const activeStyleItem = STYLE_MAP.find(s => s.gesture === smoothGesture);
  const activeStyleName = activeStyleItem ? activeStyleItem.name : 'Original';
  const activeColor = activeStyleItem ? activeStyleItem.color : '#00f3ff';

  // Render Loader if models are loading
  if (isLoadingModels) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 text-white font-sans selection:bg-[#00f3ff]/30">
        <div className="max-w-md w-full glass p-8 rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,243,255,0.05)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#00f3ff]/5 rounded-full blur-[40px]" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-[#ff007f]/5 rounded-full blur-[40px]" />

          <div className="w-16 h-16 bg-gradient-to-br from-[#00f3ff] to-[#b026ff] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Cpu className="w-8 h-8 text-white animate-pulse" />
          </div>

          <h2 className="text-2xl font-black mb-2 tracking-tight uppercase">Initializing Neural Studio</h2>
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-8">Preparing WebGL & TF.js Models</p>

          <div className="mb-6">
            <div className="flex justify-between items-center text-[10px] text-white/50 font-bold uppercase tracking-wider mb-2">
              <span>Loading weights...</span>
              <span>{modelProgress}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#00f3ff] to-[#b026ff] rounded-full"
                animate={{ width: modelProgress + "%" }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
          <p className="text-white/30 text-[10px] leading-relaxed">
            Running 100% locally inside your web browser. No cloud servers, no latency, and completely free.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white py-12 px-6 font-sans select-none relative overflow-x-hidden selection:bg-[#00f3ff]/30">
      {/* Background radial spotlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00f3ff]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#b026ff]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Screen Camera Flash Effect */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto flex flex-col gap-12 z-10">
        
        {/* Header */}
        <div className="text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <span className="text-[10px] bg-gradient-to-r from-[#00f3ff] to-[#b026ff] text-transparent bg-clip-text font-black tracking-widest uppercase mb-1 block">
              Spatial Computing Suite
            </span>
            <h1 className="text-4xl font-black tracking-tight leading-none uppercase">
              ✨ AI Gesture Studio
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-5 py-3">
            <Info size={16} className="text-[#00f3ff]" />
            <p className="text-xs text-white/50 leading-relaxed max-w-sm text-left">
              Hold any gesture for **1 second** to auto-capture a photo. The local AI will stylize the frame instantly!
            </p>
          </div>
        </div>

        {/* Dynamic GestureDetector Helper */}
        <GestureDetector 
          rawGesture={trackingResults.gesture} 
          onSmoothGesture={handleSmoothGesture} 
        />

        {trackingError ? (
          <div className="glass p-8 rounded-3xl border border-red-500/20 max-w-lg mx-auto text-center shadow-2xl">
            <ShieldAlert size={44} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Camera Access Required</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-6">{trackingError}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-xl transition-colors">
              Retry Camera Initialization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Camera or Transfer View */}
            <div className="lg:col-span-8 flex flex-col gap-6 w-full items-center">
              {!capturedFrame ? (
                <div className="relative w-full">
                  <AIGestureCameraView 
                    videoRef={videoRef} 
                    isCameraActive={isCameraActive} 
                  />
                  {isCameraActive && (
                    <GestureOverlay 
                      handLandmarks={trackingResults.handLandmarks}
                      faceLandmarks={trackingResults.faceLandmarks}
                      showFaceMesh={showFaceMesh}
                      activeColor={activeColor}
                    />
                  )}
                </div>
              ) : (
                <StyleTransfer 
                  capturedFrame={capturedFrame} 
                  activeStyle={activeStyleName} 
                  onReset={handleReset} 
                />
              )}
            </div>

            {/* Right Side: Control Panels */}
            <div className="lg:col-span-4 flex flex-col gap-6 w-full">
              {!capturedFrame && (
                <>
                  <GestureHUD 
                    gesture={smoothGesture}
                    styleName={activeStyleName}
                    captureProgress={captureProgress}
                    fps={trackingResults.fps}
                    activeColor={activeColor}
                  />
                  <FaceTracker 
                    showFaceMesh={showFaceMesh}
                    setShowFaceMesh={setShowFaceMesh}
                    faceDetected={trackingResults.faceLandmarks !== null}
                  />
                </>
              )}
              <StyleSelector activeGesture={smoothGesture} />
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
