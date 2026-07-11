import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { CameraView } from './components/CameraView';
import { CameraFilters, type CameraFilter } from './components/CameraFilters';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Hand3D } from './components/Hand3D';
import { MiniDrawCanvas } from './components/MiniDrawCanvas';
import { GallerySection } from './components/GallerySection';
import { Leaderboard } from './components/Leaderboard';
import { useARTracking } from './hooks/useARTracking';
import { FaceARCanvas } from './components/FaceARCanvas';
import { AIGestureStudio } from './components/AIGestureStudio';
import { useSmoothDrawing, type DrawMode, type SymmetryMode } from './hooks/useSmoothDrawing';
import { useGameEngine } from './hooks/useGameEngine';
import { Onboarding } from './components/Onboarding';
import { FPSIndicator } from './components/FPSIndicator';
import type { EnvMode } from './components/Environments';
import { audio } from './utils/audio';
import { 
  Palette, Eraser, Camera, Trash2, Undo, Video, Bug, 
  Sparkles as SparklesIcon, Gamepad2, Trophy, Flame, Play, X, 
  Volume2, VolumeX, Zap, Rainbow, FolderHeart, Repeat, SlidersHorizontal, Share2, Image as ImageIcon, User, Hand
} from 'lucide-react';

const COLORS = ['#00f3ff', '#b026ff', '#ff007f', '#39ff14', '#ff8c00', '#ffffff'];

function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [glow, setGlow] = useState(25);
  const [mode, setMode] = useState<DrawMode>('DRAW');
  const [symmetry, setSymmetry] = useState<SymmetryMode>('NONE');
  const [showPreview, setShowPreview] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [envMode, setEnvMode] = useState<EnvMode>('NEON');
  const [trackingMode, setTrackingMode] = useState<'HANDS'|'FACE'>('HANDS');
  const [activeMaskIndex, setActiveMaskIndex] = useState(0);
  
  const [showSliders, setShowSliders] = useState(false);
  const [activeTab, setActiveTab] = useState<'DRAW' | 'STUDIO'>('DRAW');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [cameraFilter, setCameraFilter] = useState<CameraFilter>('NORMAL');
  const [showFilterToast, setShowFilterToast] = useState(false);
  const lastGestureRef = useRef<string | null>(null);
  
        
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio start trigger on first user interaction
  useEffect(() => {
    const startAudioOnInteraction = () => {
      if (isAudioEnabled) {
        audio.startAmbientLoop();
      }
      window.removeEventListener('click', startAudioOnInteraction);
    };
    window.addEventListener('click', startAudioOnInteraction);
    return () => window.removeEventListener('click', startAudioOnInteraction);
  }, [isAudioEnabled]);

  const toggleAudio = () => {
    audio.playClick();
    setIsAudioEnabled((prev) => {
      const next = !prev;
      if (next) {
        audio.startAmbientLoop();
      } else {
        audio.stopAmbientLoop();
      }
      return next;
    });
  };

  const cycleSymmetry = () => {
    audio.playClick();
    setSymmetry((prev) => {
      if (prev === 'NONE') return 'HORIZONTAL';
      if (prev === 'HORIZONTAL') return 'RADIAL';
      return 'NONE';
    });
  };

  const cycleEnvironment = () => {
    audio.playClick();
    setEnvMode((prev) => {
      if (prev === 'NEON') return 'SYNTHWAVE';
      if (prev === 'SYNTHWAVE') return 'CYBERPUNK';
      return 'NEON';
    });
  };

  const { isReady, error, handStateRef, faceStateRef, debugInfo } = useARTracking(videoRef, dimensions.width, dimensions.height, isLaunched && activeTab === 'DRAW', trackingMode);
  const gameEngine = useGameEngine();
  const { clearCanvas, saveToGallery, undo } = useSmoothDrawing(canvasRef, handStateRef, { color, size, glow, mode, symmetry }, gameEngine, videoRef, showPreview);

  
  // Cycle camera filter on gestures
  useEffect(() => {
    if (!debugInfo.gesture) return;
    
    if (debugInfo.gesture === 'PEACE' && lastGestureRef.current !== 'PEACE') {
      if (trackingMode === 'FACE') {
        setActiveMaskIndex(prev => (prev + 1) % 3);
        setShowFilterToast(true);
        audio.playHover();
        setTimeout(() => setShowFilterToast(false), 2000);
      } else {

      const filters: CameraFilter[] = ['NORMAL', 'NEON', 'POP_ART', 'ANIME', 'VAN_GOGH', 'PAPER'];
      setCameraFilter(prev => {
        const nextIndex = (filters.indexOf(prev) + 1) % filters.length;
        return filters[nextIndex];
      });
      setShowFilterToast(true);
      audio.playHover();
      setTimeout(() => setShowFilterToast(false), 2000);
      }
    }
    
    lastGestureRef.current = debugInfo.gesture;
  }, [debugInfo.gesture]);

  const handleSaveToGallery = () => {
    setIsFlashing(true);
    audio.playCamera();
    saveToGallery();
    setTimeout(() => setIsFlashing(false), 150);
  };

  const toggleRecording = useCallback(() => {
    audio.playClick();
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(60);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'glow-finger-drawing.webm';
        a.click();
        URL.revokeObjectURL(url);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // Skip shortcuts when user is typing in input fields
      }
      const key = e.key.toLowerCase();
      if (key === 'c') clearCanvas();
      if (key === 'z' || (e.ctrlKey && key === 'z')) undo();
      if (key === 'e') setMode('ERASE');
      if (key === 'd') setMode('DRAW');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCanvas, undo]);

  const handleLaunch = () => {
    audio.playClick();
    setIsLaunched(true);
  };

  const handleHover = () => {
    audio.playHover();
  };

  if (!isLaunched) {
    return (
      <div className="relative w-full min-h-[100dvh] bg-[#030305] text-white flex flex-col justify-between overflow-x-hidden font-sans selection:bg-[#00f3ff]/30">
        
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00f3ff] rounded-full blur-[150px] mix-blend-screen opacity-30"
          />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#b026ff] rounded-full blur-[150px] mix-blend-screen opacity-30"
          />
        </div>

        {/* 3D Background & Hand Canvas with Post-Processing Bloom */}
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            
            {/* Interactive 3D Hand */}
            <Hand3D isMobile={false} handStateRef={handStateRef} />

            
          </Canvas>
        </div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRlcm4gaWQ9InNtYWxsR3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMTAgMEwwIDBMMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjc21hbGxHcmlkKSIvPjxwYXRoIGQ9Ik00MCAwTDAgMEwwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>

        {/* Mini Mouse-Drawing Canvas */}
        <MiniDrawCanvas />

        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-10 pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f3ff] to-[#b026ff] p-[2px]">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-[#00f3ff]" />
              </div>
            </div>
            <span className="font-extrabold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">GLOW<span className="font-light">AR</span></span>
          </div>

          <div className="flex items-center gap-6">
            {/* Audio Toggle */}
            <button 
              onClick={toggleAudio}
              onMouseEnter={handleHover}
              className="shrink-0 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[#00f3ff] shadow-xl cursor-pointer"
              title="Toggle Audio Beat"
            >
              {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="hidden md:flex gap-8">
              {['Features', 'How it Works', 'Gallery'].map((item) => (
                <a 
                  key={item} 
                  href="#" 
                  onMouseEnter={handleHover}
                  className="text-white/50 hover:text-white text-sm font-semibold tracking-wide transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </motion.header>

        {/* Hero Section */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center z-10 py-12 pointer-events-none">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full">
            <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-black/60 border border-[#00f3ff]/30 backdrop-blur-md rounded-full px-5 py-2 text-xs text-[#00f3ff] font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(0,243,255,0.15)] hover:shadow-[0_0_30px_rgba(0,243,255,0.3)] hover:border-[#00f3ff]/50 transition-all duration-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f3ff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f3ff]"></span>
                </span>
                Spatial Computing In Browser
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-tight drop-shadow-2xl"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">Paint Reality With</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] via-[#b026ff] to-[#ff007f] drop-shadow-[0_0_40px_rgba(176,38,255,0.4)]">Bare Hands</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }}
                className="text-white/60 text-base md:text-lg lg:text-xl max-w-xl mb-12 leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                No apps. No headsets. Just your camera. Experience frictionless augmented reality drawing and gaming directly in your browser.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.6 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="pointer-events-auto relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00f3ff] via-[#b026ff] to-[#ff007f] rounded-[26px] blur-xl opacity-35 group-hover:opacity-75 group-hover:blur-2xl transition-all duration-500 z-0"></div>
                <button 
                  onClick={handleLaunch}
                  onMouseEnter={handleHover}
                  className="relative z-10 group bg-white text-black font-extrabold text-xl px-12 py-6 rounded-3xl overflow-hidden transition-all duration-500 flex items-center gap-4 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00f3ff] via-[#b026ff] to-[#ff007f] opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  <Play className="w-6 h-6 fill-black group-hover:fill-transparent transition-all" />
                  <span>Launch Studio</span>
                </button>
              </motion.div>
            </div>
            
            {/* Right side is occupied visually by the 3D hand in the Canvas */}
            <div className="md:col-span-5 h-[250px] md:h-auto pointer-events-none" />
          </div>

          {/* Features Grid */}
          <motion.div 
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full pointer-events-auto"
          >
            {[
              { icon: Palette, title: "3D Neon Brush", desc: "Draw using your index finger. Move closer to create thicker strokes with true depth.", color: "#00f3ff" },
              { icon: Gamepad2, title: "Orb Smasher", desc: "Slash floating neon targets, maintain speed, and build combo scores in Arcade mode.", color: "#b026ff" },
              { icon: Video, title: "HD Capture", desc: "Record your drawing and gaming sessions in fluid 60 FPS webm format.", color: "#ff007f" }
            ].map((f, i) => (
              <div key={i} className="bg-black/30 border border-white/5 hover:border-white/20 rounded-[2rem] p-8 text-left transition-all duration-500 hover:-translate-y-2 group backdrop-blur-xl">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110" style={{ backgroundColor: `${f.color}15`, color: f.color, boxShadow: `0 0 30px ${f.color}20` }}>
                  <f.icon size={26} />
                </div>
                <h3 className="font-bold text-xl text-white mb-3">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </main>

        {/* High Score Leaderboard & Gallery stacked */}
        <Leaderboard />
        <GallerySection />

        <footer className="w-full py-8 text-center text-white/30 text-sm font-medium z-10 pointer-events-none">
          <p>Powered by MediaPipe & WebGL &middot; 2026</p>
        </footer>
      </div>
    );
  }

  return (
    <motion.div 
      animate={{ x: gameEngine.shake ? [-15, 15, -10, 10, -5, 5, 0] : 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full h-[100dvh] bg-[#050505] overflow-hidden"
      onClick={() => setShowColorPicker(false)}
    >

      {/* Page Switcher */}
      {isLaunched && !gameEngine.isGameMode && (
        <div className="absolute top-8 left-8 z-50 bg-[#131317]/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex gap-1 shadow-2xl transition-all duration-300 hover:border-white/20">
          <button
            onClick={() => { setActiveTab('DRAW'); audio.playClick(); }}
            className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === 'DRAW' 
                ? 'bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)] border border-[#00f3ff]/50' 
                : 'text-white/50 hover:bg-white/5 border border-transparent'
            }`}
          >
            🎨 Creative Draw
          </button>
          <button
            onClick={() => { setActiveTab('STUDIO'); audio.playClick(); }}
            className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === 'STUDIO' 
                ? 'bg-[#b026ff]/20 text-[#b026ff] shadow-[0_0_15px_rgba(176,38,255,0.3)] border border-[#b026ff]/50' 
                : 'text-white/50 hover:bg-white/5 border border-transparent'
            }`}
          >
            ✨ Gesture Studio
          </button>
        </div>
      )}
      
      <Onboarding handStateRef={handStateRef} />
      <AnimatePresence>
        {showFilterToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-24 left-1/2 z-50 bg-[#b026ff]/90 text-white font-bold px-6 py-2 rounded-full shadow-[0_0_20px_rgba(176,38,255,0.6)] backdrop-blur-md pointer-events-none"
          >
            {trackingMode === 'FACE' ? `Mask Changed: ${['Cyberpunk Visor', 'Holographic HUD', 'Anime Style'][activeMaskIndex]}` : `Filter Changed: ${cameraFilter}`}
          </motion.div>
        )}
      </AnimatePresence>
      {activeTab === 'DRAW' ? (
        <>
      <FPSIndicator />
      
      <CameraFilters />
      <CameraView videoRef={videoRef} showPreview={showPreview} cameraFilter={cameraFilter} />

      

            <DrawingCanvas canvasRef={canvasRef} width={dimensions.width} height={dimensions.height} />
      {trackingMode === 'FACE' && <FaceARCanvas faceStateRef={faceStateRef} activeMaskIndex={activeMaskIndex} />}
        </>
      ) : (
        <AIGestureStudio />
      )}
      
      {activeTab === 'DRAW' && (
        <>
      {/* Real-time Gesture Feedback Badge */}
      {!gameEngine.isGameMode && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <AnimatePresence mode="wait">
            {!isReady ? (
              <motion.div
                key="loading"
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-full px-5 py-2 flex items-center gap-2 shadow-2xl text-[10px] text-white/50 font-bold uppercase tracking-widest"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white/40"></span>
                </span>
                Calibrating...
              </motion.div>
            ) : (
              <motion.div
                key={debugInfo.gesture}
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                className={`backdrop-blur-xl border rounded-full px-6 py-2 flex items-center gap-2 shadow-2xl text-[10px] font-bold uppercase tracking-widest text-black transition-colors ${
                  debugInfo.gesture === 'DRAW' 
                    ? 'bg-[#00f3ff]/90 border-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.4)]'
                    : debugInfo.gesture === 'PAUSE'
                      ? 'bg-[#ff007f]/90 border-[#ff007f] shadow-[0_0_20px_rgba(255,0,127,0.4)]'
                      : debugInfo.gesture === 'PEACE'
                        ? 'bg-[#b026ff]/90 border-[#b026ff] shadow-[0_0_20px_rgba(176,38,255,0.4)] text-white'
                        : 'bg-white/10 border-white/10 text-white shadow-none'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    debugInfo.gesture === 'DRAW' || debugInfo.gesture === 'PAUSE' ? 'bg-black' : 'bg-white'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    debugInfo.gesture === 'DRAW' || debugInfo.gesture === 'PAUSE' ? 'bg-black' : 'bg-white'
                  }`}></span>
                </span>
                {debugInfo.gesture === 'DRAW' 
                  ? '✏️ Drawing' 
                  : debugInfo.gesture === 'PAUSE' 
                    ? '⏸️ Paused' 
                    : debugInfo.gesture === 'PEACE'
                      ? '✌️ Style Change'
                      : '👋 Hand Active'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      
      {/* Mode Toggle */}
      <AnimatePresence>
        {isLaunched && !gameEngine.isGameMode && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-[#131317]/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex gap-1 transition-all duration-300"
            style={{
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${trackingMode === 'HANDS' ? '#00f3ff' : '#ff007f'}1a`,
              borderColor: `${trackingMode === 'HANDS' ? '#00f3ff' : '#ff007f'}33`
            }}
          >
            <button
              onClick={() => { setTrackingMode('HANDS'); audio.playClick(); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${trackingMode === 'HANDS' ? 'bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)] border border-[#00f3ff]/50' : 'text-white/50 hover:bg-white/5 border border-transparent'}`}
            >
              <Hand size={16} /> Hands
            </button>
            <button
              onClick={() => { setTrackingMode('FACE'); audio.playClick(); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${trackingMode === 'FACE' ? 'bg-[#ff007f]/20 text-[#ff007f] shadow-[0_0_15px_rgba(255,0,127,0.3)] border border-[#ff007f]/50' : 'text-white/50 hover:bg-white/5 border border-transparent'}`}
            >
              <User size={16} /> Face AR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD Bar for Game Mode */}
      <AnimatePresence>
        {gameEngine.isGameMode && (
          <>
            {/* Top Left: Lives */}
            <motion.div
              initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
              className="absolute top-8 left-8 z-20 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-2 shadow-2xl pointer-events-none"
            >
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest mr-2">Lives</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((heart) => (
                  <motion.span
                    key={heart}
                    animate={{ scale: heart <= gameEngine.lives ? 1 : 0.8, opacity: heart <= gameEngine.lives ? 1 : 0.2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-red-500 text-xl filter drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                  >
                    ❤️
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Top Center: Timer */}
            <motion.div
              initial={{ y: -100, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: -100, opacity: 0, x: '-50%' }}
              className="absolute top-8 left-1/2 z-20 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-3 shadow-2xl pointer-events-none"
            >
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Time</span>
              <span className={`font-mono text-2xl font-black tracking-wider transition-colors duration-300 ${gameEngine.timeLeft <= 10 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-[#00f3ff]'}`}>
                {String(Math.floor(gameEngine.timeLeft / 60)).padStart(2, '0')}:{String(gameEngine.timeLeft % 60).padStart(2, '0')}
              </span>
            </motion.div>

            {/* Top Right: Score & Combo */}
            <motion.div 
              initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
              className="absolute top-8 right-8 z-20 flex flex-col items-end gap-3 pointer-events-none"
            >
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-4 flex items-center gap-5 shadow-2xl">
                <Trophy className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" size={32} />
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 font-mono tracking-widest">
                  {String(gameEngine.score).padStart(5, '0')}
                </span>
              </div>
              {gameEngine.combo > 1 && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-5 py-2 rounded-full border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                >
                  <Flame className="text-orange-400 animate-pulse" size={18} />
                  <span className="text-orange-400 font-bold tracking-widest">{gameEngine.combo}x COMBO!</span>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="absolute top-24 left-6 bg-black/80 text-[#39ff14] p-6 rounded-3xl font-mono text-sm z-50 pointer-events-none border border-[#39ff14]/30 backdrop-blur-2xl shadow-[0_0_40px_rgba(57,255,20,0.15)]"
          >
            <p className="mb-3 font-bold flex items-center gap-2"><Bug size={16}/> SYSTEM DIAGNOSTICS</p>
            <div className="space-y-2 opacity-90">
              <p>Status: {isReady ? 'Ready' : 'Initializing'}</p>
              <p>Frames: {debugInfo.frames}</p>
              <p>Gesture: <span className="text-black bg-[#39ff14] px-2 py-0.5 rounded-md font-bold">{debugInfo.gesture}</span></p>
              <p>X: {debugInfo.x.toFixed(3)}</p>
              <p>Y: {debugInfo.y.toFixed(3)}</p>
              <p>Z: {debugInfo.z ? debugInfo.z.toFixed(4) : 'N/A'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Flash Effect */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div 
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Collapsible Sliders Panel */}
      <AnimatePresence>
        {showSliders && (
          <motion.div 
            initial={{ y: 20, opacity: 0, x: '-50%' }} 
            animate={{ y: 0, opacity: 1, x: '-50%' }} 
            exit={{ y: 20, opacity: 0, x: '-50%' }}
            className="absolute bottom-28 left-1/2 bg-[#131317]/90 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 flex flex-col gap-4 w-[240px] z-30 transition-all duration-300"
            style={{
              boxShadow: `0 25px 50px rgba(0,0,0,0.7), 0 0 30px ${color}1e`,
              borderColor: `${color}33`
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest w-8">Size</span>
              <input type="range" min="2" max="30" value={size} onChange={(e) => setSize(Number(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
            </div>
            <div className="flex items-center gap-3 w-full">
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest w-8">Glow</span>
              <input type="range" min="0" max="50" value={glow} onChange={(e) => setGlow(Number(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Colors Panel */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div 
            initial={{ y: 20, opacity: 0, x: '-50%' }} 
            animate={{ y: 0, opacity: 1, x: '-50%' }} 
            exit={{ y: 20, opacity: 0, x: '-50%' }}
            className="absolute bottom-28 left-1/2 bg-[#131317]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex gap-3 z-30 transition-all duration-300"
            style={{
              boxShadow: `0 25px 50px rgba(0,0,0,0.7), 0 0 30px ${color}1e`,
              borderColor: `${color}33`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {COLORS.map(c => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  audio.playClick();
                  setColor(c);
                  if (mode === 'ERASE') setMode('DRAW');
                  setShowColorPicker(false);
                }}
                className={`shrink-0 w-8 h-8 rounded-full transition-all duration-200 hover:scale-115 ${color === c && mode !== 'ERASE' ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Dock */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.8, delay: 0.2 }}
        className="absolute bottom-8 left-0 right-0 w-full px-4 flex justify-center z-20 pointer-events-none"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto bg-[#131317]/80 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-3 flex items-center gap-3 overflow-x-auto hide-scrollbar max-w-full w-max transition-all duration-300"
          style={{
            boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 25px ${color}1a`,
            borderColor: `${color}33`
          }}
        >
          
          {/* Colors */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                audio.playClick();
                setShowColorPicker(!showColorPicker);
                setShowSliders(false);
              }}
              onMouseEnter={handleHover}
              className={`shrink-0 w-8 h-8 rounded-full transition-all duration-300 ring-2 ring-white/50 hover:ring-white ${showColorPicker ? 'scale-110' : 'hover:scale-110'}`}
              style={{ 
                backgroundColor: mode === 'ERASE' ? '#ffffff' : color, 
                boxShadow: mode !== 'ERASE' ? `0 0 15px ${color}` : 'none' 
              }}
              title="Change Color"
            />
          </div>

          <div className="shrink-0 w-px h-8 bg-white/10 mx-1 md:mx-2"></div>

          {/* Brushes */}
          <button onClick={() => { audio.playClick(); setMode('DRAW'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'DRAW' ? 'bg-white/10 text-[#00f3ff]' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Neon Pen">
            <Palette size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('COSMIC'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'COSMIC' ? 'bg-white/10 text-yellow-400' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Cosmic Sparkles">
            <SparklesIcon size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('RAINBOW'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'RAINBOW' ? 'bg-white/10 text-[#ff8c00]' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Rainbow Path">
            <Rainbow size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('FIRE'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'FIRE' ? 'bg-white/10 text-red-500' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Rising Flame">
            <Flame size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('LASER'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'LASER' ? 'bg-white/10 text-purple-400' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Double Lasers">
            <Zap size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('ERASE'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'ERASE' ? 'bg-white/10 text-[#ff007f]' : 'text-white/50 hover:text-white hover:bg-white/5'}`} title="Erase (E)">
            <Eraser size={20} />
          </button>
          
          <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>

          {/* Collapsible Sliders Panel Toggle */}
          <button 
            onClick={(e) => { e.stopPropagation(); audio.playClick(); setShowSliders(!showSliders); setShowColorPicker(false); }} 
            onMouseEnter={handleHover} 
            className={`p-3 rounded-full transition-all ${showSliders ? 'bg-white/10 text-[#00f3ff]' : 'text-white/50 hover:text-white hover:bg-white/5'}`} 
            title="Brush Size & Glow"
          >
            <SlidersHorizontal size={20} />
          </button>
          
          <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>

          {/* Symmetry Toggle */}
          <button 
            onClick={cycleSymmetry} 
            onMouseEnter={handleHover} 
            className={`p-3 rounded-full transition-all flex items-center justify-center gap-1 ${
              symmetry !== 'NONE' ? 'bg-white/10 text-[#39ff14]' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`} 
            title={`Symmetry: ${symmetry === 'NONE' ? 'Off' : symmetry === 'HORIZONTAL' ? 'Mirror' : 'Kaleidoscope'}`}
          >
            <Repeat size={20} />
            {symmetry !== 'NONE' && (
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {symmetry === 'HORIZONTAL' ? 'mir' : 'kal'}
              </span>
            )}
          </button>
          
          <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>
          
          {/* Actions */}
          <button onClick={() => { audio.playClick(); undo(); }} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all" title="Undo (Z)">
            <Undo size={20} />
          </button>
          <button onClick={() => { audio.playClick(); clearCanvas(); }} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Clear (C)">
            <Trash2 size={20} />
          </button>
          <button onClick={handleSaveToGallery} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-white/50 hover:text-[#39ff14] hover:bg-white/5 transition-all" title="Save to Local Gallery">
            <FolderHeart size={20} />
          </button>
          <button 
            onClick={cycleEnvironment} 
            onMouseEnter={handleHover} 
            className="shrink-0 p-3 rounded-full text-white/50 hover:text-[#b026ff] hover:bg-white/5 transition-all hidden sm:block" 
            title={`Environment: ${envMode}`}
          >
            <ImageIcon size={20} />
          </button>
          
          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>

          {/* Settings */}
          <button onClick={() => { audio.playClick(); setShowPreview(!showPreview); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all hidden sm:block ${showPreview ? 'text-white' : 'text-white/30 hover:bg-white/5'}`} title="Toggle Camera">
             {showPreview ? <Camera size={20} /> : <X size={20} />}
          </button>
          <button onClick={toggleRecording} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all hidden sm:block ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-white/50 hover:text-red-400 hover:bg-white/5'}`} title="Record Video">
            <Video size={20} />
          </button>
          <button 
            onClick={toggleAudio}
            onMouseEnter={handleHover}
            className={`p-3 rounded-full transition-all hidden sm:block ${isAudioEnabled ? 'text-[#00f3ff] bg-white/5' : 'text-white/30 hover:bg-white/5'}`}
            title="Toggle Synth Audio"
          >
            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>

          {/* Mode Toggles */}
          <button onClick={() => { audio.playClick(); gameEngine.toggleGameMode(); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${gameEngine.isGameMode ? 'bg-[#b026ff]/20 text-[#b026ff]' : 'text-white/50 hover:text-[#b026ff] hover:bg-white/5'}`} title="Arcade Mode">
            <Gamepad2 size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setShowDebug(!showDebug); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${showDebug ? 'text-[#39ff14] bg-[#39ff14]/10' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Toggle Debug">
            <Bug size={18} />
          </button>
        </div>
      </motion.div>

        </>
      )}
      {/* Loading Overlay */}
      <AnimatePresence>
        {activeTab === 'DRAW' && !isReady && !error && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050505]/90 flex items-center justify-center z-30 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#00f3ff] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-4 border-[#b026ff] border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse] shadow-[0_0_40px_rgba(176,38,255,0.4)]"></div>
              </div>
              <p className="text-white/70 tracking-[0.3em] text-sm uppercase font-bold animate-pulse">Connecting to Neural Engine...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error State */}
      <AnimatePresence>
        {activeTab === 'DRAW' && error && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#050505]/95 flex items-center justify-center z-40 p-8 pointer-events-auto backdrop-blur-xl"
          >
            <div className="bg-[#1a1a1e] p-10 max-w-md text-center border border-red-500/20 rounded-[2.5rem] shadow-[0_0_80px_rgba(239,68,68,0.2)]">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Bug size={36} />
              </div>
              <p className="text-white font-black text-2xl mb-4 tracking-tight">Initialization Failed</p>
              <p className="text-white/50 text-sm mb-10 leading-relaxed">{error}</p>
              <button onClick={() => window.location.reload()} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold tracking-wide px-6 py-4 rounded-2xl transition-colors shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                Reboot System
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameEngine.isGameMode && gameEngine.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-6 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#131317]/90 border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-[0_0_80px_rgba(0,243,255,0.25)] relative overflow-hidden"
            >
              {/* Decorative glows */}
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#00f3ff]/10 rounded-full blur-[50px] pointer-events-none"></div>
              <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-[#b026ff]/10 rounded-full blur-[50px] pointer-events-none"></div>

              <div className="w-20 h-20 bg-gradient-to-br from-[#00f3ff] to-[#b026ff] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(176,38,255,0.4)]">
                <Trophy size={40} className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] animate-pulse" />
              </div>

              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 mb-2 tracking-tight">
                {gameEngine.lives <= 0 ? 'GAME OVER' : 'ROUND COMPLETED'}
              </h2>
              <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-8">Arcade Smasher Challenge</p>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6 mb-8 text-left">
                <div>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Final Score</span>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#b026ff] font-mono tracking-wider">{gameEngine.score}</p>
                </div>
                <div>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Max Combo</span>
                  <p className="text-3xl font-black text-white font-mono tracking-wider">{gameEngine.maxCombo}x</p>
                </div>
              </div>

              {/* Score Submission Input */}
              {gameEngine.score > 0 ? (
                <div className="mb-8 text-left">
                  <label htmlFor="player-name" className="block text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 ml-1">
                    Enter Name for Leaderboard
                  </label>
                  <input
                    id="player-name"
                    type="text"
                    maxLength={10}
                    placeholder="ENTER NAME..."
                    className="w-full bg-white/[0.04] border border-[#00f3ff]/30 focus:border-[#00f3ff] rounded-2xl px-5 py-4 text-white font-bold tracking-widest font-mono text-center outline-none transition-all focus:shadow-[0_0_20px_rgba(0,243,255,0.15)] placeholder:text-white/20 uppercase"
                    autoComplete="off"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        const name = target.value.trim() || 'PLAYER';
                        gameEngine.saveHighScore(name, gameEngine.score);
                        gameEngine.restartGame();
                      }
                    }}
                  />
                  <p className="text-[9px] text-white/30 mt-2 text-center">Press Enter to submit and replay</p>
                </div>
              ) : (
                <p className="text-xs text-white/40 mb-8">Score higher than 0 to enter the leaderboard!</p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => {
                    const inputEl = document.getElementById('player-name') as HTMLInputElement;
                    const name = inputEl?.value.trim() || 'PLAYER';
                    if (gameEngine.score > 0) {
                      gameEngine.saveHighScore(name, gameEngine.score);
                    }
                    gameEngine.restartGame();
                  }}
                  className="flex-1 bg-white text-black font-extrabold text-sm px-6 py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(0,243,255,0.3)] cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  onClick={() => {
                    const inputEl = document.getElementById('player-name') as HTMLInputElement;
                    const name = inputEl?.value.trim() || 'PLAYER';
                    if (gameEngine.score > 0) {
                      gameEngine.saveHighScore(name, gameEngine.score);
                    }
                    gameEngine.toggleGameMode();
                  }}
                  className="flex-1 bg-white/5 border border-white/10 text-white font-bold text-sm px-6 py-4 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
                >
                  Exit Mode
                </button>
              </div>

              {gameEngine.score > 0 && (
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just scored ${gameEngine.score} points with a ${gameEngine.maxCombo}x combo in Glow AR Arcade! 🌟 Can you beat my score? #GlowAR #SpatialComputing`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer"
                >
                  <Share2 size={16} /> Share to X
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;

