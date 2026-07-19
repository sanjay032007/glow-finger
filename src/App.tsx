import { OrbitControls } from '@react-three/drei';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraView } from './components/CameraView';
import { CameraFilters, type CameraFilter } from './components/CameraFilters';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Hand3D } from './components/Hand3D';
import { MiniDrawCanvas } from './components/MiniDrawCanvas';
import { GallerySection } from './components/GallerySection';
import { Leaderboard } from './components/Leaderboard';
import { useARTracking } from './hooks/useARTracking';
import GestureFaceFilter from './components/GestureFaceFilter';
import { useFaceTracking } from './hooks/useFaceTracking';
import { FaceMaskCanvas, MASKS, type MaskId } from './components/FaceMaskCanvas';
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
  Volume2, VolumeX, Zap, Rainbow, FolderHeart, Repeat, SlidersHorizontal, Share2, Image as ImageIcon, Box, Smile
} from 'lucide-react';


import { useFrame } from '@react-three/fiber';

const AnimatedBlock = ({ 
  position, 
  color, 
  disintegratedAt, 
  drift,
  theme
}: { 
  position: [number, number, number]; 
  color: string; 
  disintegratedAt?: number; 
  drift?: [number, number, number];
  theme: 'NEON' | 'PAPERCRAFT';
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [scale, setScale] = useState(0);
  const [offset, setOffset] = useState<[number, number, number]>([0, 0, 0]);
  const [opacity, setOpacity] = useState(1.0);

  useFrame((_state, delta) => {
    if (disintegratedAt) {
      const elapsed = (performance.now() - disintegratedAt) / 1000;
      if (elapsed > 0) {
        setOpacity(Math.max(1.0 - elapsed * 1.0, 0));
        setScale(Math.max(1 - elapsed, 0));
        if (drift) {
          setOffset([
            drift[0] * elapsed,
            drift[1] * elapsed,
            drift[2] * elapsed
          ]);
        }
      }
    } else {
      if (scale < 1) {
        setScale(prev => Math.min(prev + delta * 6, 1));
      }
    }

    if (meshRef.current) {
       const currentScale = scale < 1 ? scale * (1.5 - scale * 0.5) : scale; 
       meshRef.current.scale.setScalar(currentScale);
    }
  });

  const finalPosition: [number, number, number] = [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2]
  ];

  return (
    <mesh ref={meshRef} position={finalPosition}>
      <boxGeometry args={[39.5, 39.5, 39.5]} />
      {theme === 'PAPERCRAFT' ? (
        <meshStandardMaterial 
          color={color} 
          roughness={0.95}
          metalness={0.0}
          flatShading={true}
          transparent 
          opacity={opacity} 
        />
      ) : (
        <meshPhysicalMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={disintegratedAt ? 0.6 * opacity : 1.2 * opacity} 
          roughness={0.15}
          metalness={0.3}
          transmission={0.6}
          thickness={2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent 
          opacity={0.9 * opacity} 
        />
      )}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(39.5, 39.5, 39.5)]} />
        <lineBasicMaterial 
          attach="material" 
          color={theme === 'PAPERCRAFT' ? "#000000" : "#ffffff"} 
          transparent 
          opacity={theme === 'PAPERCRAFT' ? 0.15 * opacity : 0.6 * opacity} 
        />
      </lineSegments>
    </mesh>
  );
};


const PAPER_COLORS = ['#2c2b29', '#c45c55', '#d4a34b', '#7c8e65', '#59708f', '#b87a55'];

function App() {
  const theme = 'PAPERCRAFT';
  const COLORS = PAPER_COLORS;

  const [isLaunched, setIsLaunched] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null!);
  
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
  const [page, setPage] = useState<'LANDING' | 'FILTERS'>('LANDING');
    
  const [showSliders, setShowSliders] = useState(false);
  const [activeTab, setActiveTab] = useState<'DRAW' | 'STUDIO' | 'FILTERS'>('DRAW');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [cameraFilter, setCameraFilter] = useState<CameraFilter>('NORMAL');
  const [activeMask, setActiveMask] = useState<MaskId | null>(null);
  const [faceAREnabled, setFaceAREnabled] = useState(false);
  const lastTwoHandGestureRef = useRef<number>(0);
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

  const { isReady, error, handStateRef, secondHandLandmarksRef, debugInfo } = useARTracking(
    videoRef, 
    dimensions.width, 
    dimensions.height, 
    isLaunched
  );
  const { faceLandmarks } = useFaceTracking(
    videoRef,
    dimensions.width,
    dimensions.height,
    isLaunched,
    faceAREnabled
  );

  const [builtBlocks, setBuiltBlocks] = useState<{ 
    gx: number; 
    gy: number; 
    gz: number; 
    color: string; 
    disintegratedAt?: number; 
    drift?: [number, number, number];
  }[]>([]);
  const builtBlocksRef = useRef(builtBlocks);
  useEffect(() => {
    builtBlocksRef.current = builtBlocks;
  }, [builtBlocks]);
  const snapHistoryRef = useRef<number[]>([]);
  const lastSnapTimeRef = useRef<number>(0);
  const lastGridPosRef = useRef<{ gx: number; gy: number; gz: number } | null>(null);
  const smoothedZRef = useRef<number>(0);

  useEffect(() => {
    if (activeTab !== 'DRAW' || mode !== 'BUILD') return;
    let animId: number;

    // 3D Bresenham's Line Algorithm
    const getLineCells3D = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      const cells: { x: number; y: number; z: number }[] = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const dz = Math.abs(z1 - z0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      const sz = z0 < z1 ? 1 : -1;

      let x = x0;
      let y = y0;
      let z = z0;

      if (dx >= dy && dx >= dz) {
        let p1 = 2 * dy - dx;
        let p2 = 2 * dz - dx;
        while (x !== x1) {
          cells.push({ x, y, z });
          x += sx;
          if (p1 >= 0) {
            y += sy;
            p1 -= 2 * dx;
          }
          if (p2 >= 0) {
            z += sz;
            p2 -= 2 * dx;
          }
          p1 += 2 * dy;
          p2 += 2 * dz;
        }
      } else if (dy >= dx && dy >= dz) {
        let p1 = 2 * dx - dy;
        let p2 = 2 * dz - dy;
        while (y !== y1) {
          cells.push({ x, y, z });
          y += sy;
          if (p1 >= 0) {
            x += sx;
            p1 -= 2 * dy;
          }
          if (p2 >= 0) {
            z += sz;
            p2 -= 2 * dy;
          }
          p1 += 2 * dx;
          p2 += 2 * dz;
        }
      } else {
        let p1 = 2 * dx - dz;
        let p2 = 2 * dy - dz;
        while (z !== z1) {
          cells.push({ x, y, z });
          z += sz;
          if (p1 >= 0) {
            x += sx;
            p1 -= 2 * dz;
          }
          if (p2 >= 0) {
            y += sy;
            p2 -= 2 * dz;
          }
          p1 += 2 * dx;
          p2 += 2 * dy;
        }
      }
      cells.push({ x: x1, y: y1, z: z1 });
      return cells;
    };

    const loop = () => {
      const state = handStateRef.current;
      if (state.gesture === 'OK' && state.position) {
        const scale = 662 / dimensions.height;
        const rx = (state.position.x - dimensions.width / 2) * scale;
        const ry = -(state.position.y - dimensions.height / 2) * scale;
        
        // Scale and smooth depth (z)
        const targetZ = (state.position.z || 0) * -2000;
        smoothedZRef.current = smoothedZRef.current + (targetZ - smoothedZRef.current) * 0.15;
        const rz = smoothedZRef.current;

        // Snapped grid coordinates
        const gx = Math.round(rx / 40);
        const gy = Math.round(ry / 40);
        const gz = Math.round(rz / 40);

        if (lastGridPosRef.current) {
          const cells = getLineCells3D(
            lastGridPosRef.current.gx, 
            lastGridPosRef.current.gy, 
            lastGridPosRef.current.gz, 
            gx, 
            gy, 
            gz
          );
          const newBlocks: { gx: number; gy: number; gz: number; color: string }[] = [];
          
          cells.forEach(cell => {
            const exists = builtBlocksRef.current.some(b => b.gx === cell.x && b.gy === cell.y && b.gz === cell.z) || 
                           newBlocks.some(b => b.gx === cell.x && b.gy === cell.y && b.gz === cell.z);
            if (!exists) {
              newBlocks.push({ gx: cell.x, gy: cell.y, gz: cell.z, color });
            }
          });

          if (newBlocks.length > 0) {
            setBuiltBlocks(prev => [...prev, ...newBlocks]);
            audio.playHover();
          }
        } else {
          const exists = builtBlocksRef.current.some(b => b.gx === gx && b.gy === gy && b.gz === gz);
          if (!exists) {
            setBuiltBlocks(prev => [...prev, { gx, gy, gz, color }]);
            audio.playHover();
          }
        }
        lastGridPosRef.current = { gx, gy, gz };
      } else {
        lastGridPosRef.current = null;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [mode, activeTab, color, dimensions]);

  useEffect(() => {
    if (!isLaunched || activeTab !== 'DRAW') return;
    let animId: number;

    const loop = () => {
      const state = handStateRef.current;
      if (state && state.landmarks && state.landmarks.length >= 21) {
        const thumbTip = state.landmarks[4];
        const middleTip = state.landmarks[12];
        const dist = Math.hypot(thumbTip.x - middleTip.x, thumbTip.y - middleTip.y);

        // Push to history
        snapHistoryRef.current.push(dist);
        if (snapHistoryRef.current.length > 8) {
          snapHistoryRef.current.shift();
        }

        if (snapHistoryRef.current.length >= 4) {
          // Detect sudden release from pinch (was < 55px, now > 150px)
          const wasPinching = snapHistoryRef.current[0] < 55 || snapHistoryRef.current[1] < 55 || snapHistoryRef.current[2] < 55;
          const isReleasedNow = dist > 150;

          const now = performance.now();
          if (wasPinching && isReleasedNow && (now - lastSnapTimeRef.current > 1200)) {
            audio.playSnap();
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 150);

            const snapTime = now;
            setBuiltBlocks(prev => prev.map(b => b.disintegratedAt ? b : {
              ...b,
              disintegratedAt: snapTime,
              drift: [
                (Math.random() - 0.5) * 150,
                Math.random() * 200 + 100,
                (Math.random() - 0.5) * 150
              ]
            }));

            setTimeout(() => {
              setBuiltBlocks(prev => prev.filter(b => !b.disintegratedAt));
            }, 1500);

            lastSnapTimeRef.current = now;
          }
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isLaunched, activeTab]);
  // Two-hand spread → cycle face AR mask
  useEffect(() => {
    if (!isLaunched || activeTab !== 'DRAW') return;
    let animId: number;
    const loop = () => {
      const h1 = handStateRef.current;
      const h2Lm = secondHandLandmarksRef.current;
      if (h1?.landmarks && h1.landmarks.length >= 21 && h2Lm && h2Lm.length >= 21) {
        // Both hands detected — check if both palms are open and spread wide
        const h1Palm = h1.gesture === 'PALM';
        // Check second hand: all fingertips above their pip (open palm check)
        const h2IndexUp = h2Lm[8].y < h2Lm[6].y;
        const h2MiddleUp = h2Lm[12].y < h2Lm[10].y;
        const h2PinkyUp = h2Lm[20].y < h2Lm[18].y;
        const h2Palm = h2IndexUp && h2MiddleUp && h2PinkyUp;
        // Distance between wrists
        const wrist1 = h1.landmarks[0];
        const wrist2 = h2Lm[0];
        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);
        const now = performance.now();
        if (h1Palm && h2Palm && wristDist > 280 && (now - lastTwoHandGestureRef.current) > 1500) {
          lastTwoHandGestureRef.current = now;
          setFaceAREnabled(true);
          setActiveMask(prev => {
            if (!prev) return MASKS[0].id;
            const idx = MASKS.findIndex(m => m.id === prev);
            const next = (idx + 1) % MASKS.length;
            // After last mask, disable AR
            if (next === 0) { setFaceAREnabled(false); return null; }
            return MASKS[next].id;
          });
          audio.playHover();
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isLaunched, activeTab]);

const gameEngine = useGameEngine();
  const { clearCanvas, saveToGallery, undo } = useSmoothDrawing(
    canvasRef, 
    cursorCanvasRef, 
    handStateRef, 
    { 
      color: theme === 'PAPERCRAFT' && color === PAPER_COLORS[0] ? '#2c2b29' : color, 
      size, 
      glow: theme === 'PAPERCRAFT' ? 0 : glow, 
      mode, 
      symmetry,
      theme
    }, 
    gameEngine, 
    videoRef, 
    showPreview
  );

  
  // Cycle camera filter on gestures
  useEffect(() => {
    if (!debugInfo.gesture) return;
    
    if (debugInfo.gesture === 'PEACE' && lastGestureRef.current !== 'PEACE') {
      

      const filters: CameraFilter[] = ['NORMAL', 'NEON', 'POP_ART', 'ANIME', 'VAN_GOGH', 'PAPER'];
      setCameraFilter(prev => {
        const nextIndex = (filters.indexOf(prev) + 1) % filters.length;
        return filters[nextIndex];
      });
      setShowFilterToast(true);
      audio.playHover();
      setTimeout(() => setShowFilterToast(false), 2000);
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
      if (key === 'c') { clearCanvas(); setBuiltBlocks([]); }
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
    if (page === 'FILTERS') {
      return (
        <div className="relative w-full min-h-[100dvh] bg-[#f5f2eb] text-[#2c2b29] flex flex-col justify-between overflow-x-hidden font-sans selection:bg-[#8a6d3b]/20">
          
          {/* Header */}
          <motion.header 
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-10 pointer-events-auto"
          >
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('LANDING')}>
              <div className={`w-10 h-10 rounded-xl p-[2px] ${
                theme === 'PAPERCRAFT' ? 'bg-gradient-to-br from-[#8a6d3b] to-[#b87a55]' : 'bg-gradient-to-br from-[#00f3ff] to-[#b026ff]'
              }`}>
                <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  theme === 'PAPERCRAFT' ? 'bg-[#faf8f5]' : 'bg-black'
                }`}>
                  <SparklesIcon className={`w-5 h-5 ${theme === 'PAPERCRAFT' ? 'text-[#8a6d3b]' : 'text-[#00f3ff]'}`} />
                </div>
              </div>
              <span className={`font-extrabold text-2xl tracking-widest ${
                theme === 'PAPERCRAFT' 
                  ? 'text-[#2c2b29]' 
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70'
              }`}>GLOW<span className="font-light">AR</span></span>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={toggleAudio}
                onMouseEnter={handleHover}
                className={`shrink-0 p-3 rounded-full border transition-all shadow-xl cursor-pointer ${
                  theme === 'PAPERCRAFT' 
                    ? 'bg-[#faf8f5] border-[#dedacf] text-[#8a6d3b] hover:bg-[#ebe7df]/50' 
                    : 'bg-white/5 border-white/10 text-[#00f3ff] hover:bg-white/10'
                }`}
                title="Toggle Audio Beat"
              >
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <div className="hidden md:flex gap-8">
                {['Features', 'How it Works', 'Gallery', 'Face Filters'].map((item) => (
                  <a 
                    key={item} 
                    href={item === 'Face Filters' ? '#filters' : '#'} 
                    onClick={(e) => {
                      if (item === 'Face Filters') {
                        e.preventDefault();
                        setPage('FILTERS');
                      } else {
                        e.preventDefault();
                        setPage('LANDING');
                      }
                    }}
                    onMouseEnter={handleHover}
                    className={`text-sm font-semibold tracking-wide transition-colors ${
                      theme === 'PAPERCRAFT' ? 'text-[#5c5952] hover:text-[#2c2b29]' : 'text-[#4a453f]/70 hover:text-[#4a453f]'
                    } ${item === 'Face Filters' ? 'font-extrabold text-[#2c2b29] border-b-2 border-[#8a6d3b]' : ''}`}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </motion.header>

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center z-10 py-12 pointer-events-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
              {/* Left Column: Info Card */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 bg-[#8a6d3b]/10 border border-[#8a6d3b]/30 rounded-full px-5 py-2 text-xs text-[#8a6d3b] font-bold tracking-widest uppercase mb-6"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Real-time Canvas Effects
                </motion.div>
                
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#2c2b29] mb-6 leading-tight">
                  Hand-Gesture<br />
                  <span className="text-[#8a6d3b]">Face Filters</span>
                </h1>
                
                <p className="text-[#5c5952] text-base leading-relaxed mb-8 font-light">
                  Experience 16 vintage, retro, anime, and pixelated visual styles applied live to your camera feed.
                  Simply raise your <strong>Open Palm ✋</strong> to trigger the next style!
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => setPage('LANDING')}
                    className="px-8 py-4 rounded-2xl font-extrabold text-base border-2 border-[#4a453f] bg-transparent text-[#4a453f] hover:bg-[#4a453f]/5 cursor-pointer transition-all"
                  >
                    ← Back Home
                  </button>
                  <button 
                    onClick={handleLaunch}
                    className="px-8 py-4 rounded-2xl font-extrabold text-base bg-[#f5d060] border-2 border-[#4a453f] text-[#2c2b29] shadow-[3px_3px_0px_#4a453f] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#4a453f] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none cursor-pointer transition-all"
                  >
                    Launch Drawing Studio
                  </button>
                </div>
              </div>
              
              {/* Right Column: Face Filter Component Container */}
              <div className="lg:col-span-7 w-full flex justify-center">
                <motion.div 
                  initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-full max-w-[640px] p-4 bg-[#faf8f5] border-2 border-[#4a453f] rounded-[2rem] shadow-[8px_8px_0px_#4a453f]"
                >
                  <GestureFaceFilter />
                </motion.div>
              </div>
            </div>
          </main>

          <footer className="w-full py-8 text-center text-[#5c5952]/40 text-sm font-medium z-10">
            <p>Powered by MediaPipe &middot; 2026</p>
          </footer>
        </div>
      );
    }

    return (
      <div className="relative w-full min-h-[100dvh] bg-[#f5f2eb] text-[#2c2b29] flex flex-col justify-between overflow-x-hidden font-sans selection:bg-[#8a6d3b]/20">
        


        {/* 3D Background & Hand Canvas with Origami Shading Lights */}
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            {theme === 'PAPERCRAFT' ? (
              <>
                <ambientLight intensity={0.75} />
                <directionalLight position={[10, 20, 15]} intensity={1.6} />
                <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#dfc2a5" />
              </>
            ) : null}
            {/* Interactive 3D Hand */}
            <Hand3D isMobile={false} handStateRef={handStateRef} theme={theme} />
          </Canvas>
        </div>

        {/* Grid Overlay */}
        {theme !== 'PAPERCRAFT' && <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRlcm4gaWQ9InNtYWxsR3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMTAgMEwwIDBMMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjc21hbGxHcmlkKSIvPjxwYXRoIGQ9Ik00MCAwTDAgMEwwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>}

        {/* Mini Mouse-Drawing Canvas */}
        <MiniDrawCanvas />

        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-10 pointer-events-auto"
        >
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('LANDING')}>
            <div className={`w-10 h-10 rounded-xl p-[2px] ${
              theme === 'PAPERCRAFT' ? 'bg-gradient-to-br from-[#8a6d3b] to-[#b87a55]' : 'bg-gradient-to-br from-[#00f3ff] to-[#b026ff]'
            }`}>
              <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                theme === 'PAPERCRAFT' ? 'bg-[#faf8f5]' : 'bg-black'
              }`}>
                <SparklesIcon className={`w-5 h-5 ${theme === 'PAPERCRAFT' ? 'text-[#8a6d3b]' : 'text-[#00f3ff]'}`} />
              </div>
            </div>
            <span className={`font-extrabold text-2xl tracking-widest ${
              theme === 'PAPERCRAFT' 
                ? 'text-[#2c2b29]' 
                : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70'
            }`}>GLOW<span className="font-light">AR</span></span>
          </div>

          <div className="flex items-center gap-6">
            {/* Audio Toggle */}
            <button 
              onClick={toggleAudio}
              onMouseEnter={handleHover}
              className={`shrink-0 p-3 rounded-full border transition-all shadow-xl cursor-pointer ${
                theme === 'PAPERCRAFT' 
                  ? 'bg-[#faf8f5] border-[#dedacf] text-[#8a6d3b] hover:bg-[#ebe7df]/50' 
                  : 'bg-white/5 border-white/10 text-[#00f3ff] hover:bg-white/10'
              }`}
              title="Toggle Audio Beat"
            >
              {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="hidden md:flex gap-8">
              {['Features', 'How it Works', 'Gallery', 'Face Filters'].map((item) => (
                <a 
                  key={item} 
                  href={item === 'Face Filters' ? '#filters' : '#'} 
                  onClick={(e) => {
                    if (item === 'Face Filters') {
                      e.preventDefault();
                      setPage('FILTERS');
                    } else {
                      e.preventDefault();
                      setPage('LANDING');
                    }
                  }}
                  onMouseEnter={handleHover}
                  className={`text-sm font-semibold tracking-wide transition-colors ${
                    theme === 'PAPERCRAFT' ? 'text-[#5c5952] hover:text-[#2c2b29]' : 'text-white/70 hover:text-white'
                  } ${item === 'Face Filters' && page === ('FILTERS' as any) ? 'font-extrabold text-[#2c2b29] border-b-2 border-[#8a6d3b]' : ''}`}
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
                <span className={`text-transparent bg-clip-text bg-gradient-to-b ${
                  theme === 'PAPERCRAFT' ? 'from-[#2c2b29] to-[#5c5952]' : 'from-white to-white/70'
                }`}>Paint Reality With</span><br />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                  theme === 'PAPERCRAFT' 
                    ? 'from-[#8a6d3b] via-[#a88d5b] to-[#b87a55]' 
                    : 'from-[#00f3ff] via-[#b026ff] to-[#ff007f] drop-shadow-[0_0_40px_rgba(176,38,255,0.4)]'
                }`}>Bare Hands</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }}
                className={`text-base md:text-lg lg:text-xl max-w-xl mb-12 leading-relaxed font-light ${
                  theme === 'PAPERCRAFT' ? 'text-[#5c5952]' : 'text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                }`}
              >
                No apps. No headsets. Just your camera. Experience frictionless augmented reality drawing and gaming directly in your browser.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.6 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="pointer-events-auto relative group"
              >
                {theme !== 'PAPERCRAFT' && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#00f3ff] via-[#b026ff] to-[#ff007f] rounded-[26px] blur-xl opacity-35 group-hover:opacity-75 group-hover:blur-2xl transition-all duration-500 z-0"></div>
                )}
                <button 
                  onClick={handleLaunch}
                  onMouseEnter={handleHover}
                  className="relative z-10 group font-extrabold text-xl px-12 py-6 rounded-3xl bg-[#faf8f5] border-2 border-[#4a453f] text-[#2c2b29] shadow-[4px_4px_0px_#4a453f] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#4a453f] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150 flex items-center gap-4 cursor-pointer"
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
              <div 
                key={i} 
                className={`rounded-[2rem] p-8 text-left transition-all duration-500 hover:-translate-y-2 group backdrop-blur-xl border ${
                  theme === 'PAPERCRAFT' 
                    ? 'bg-[#faf8f5]/80 border-[#dedacf]/60 shadow-md hover:border-[#dedacf]' 
                    : 'bg-black/30 border-white/5 hover:border-white/20'
                }`}
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110" 
                  style={{ 
                    backgroundColor: theme === 'PAPERCRAFT' ? '#8a6d3b15' : `${f.color}15`, 
                    color: theme === 'PAPERCRAFT' ? '#8a6d3b' : f.color, 
                    boxShadow: theme === 'PAPERCRAFT' ? 'none' : `0 0 30px ${f.color}20` 
                  }}
                >
                  <f.icon size={26} />
                </div>
                <h3 className={`font-bold text-xl mb-3 ${theme === 'PAPERCRAFT' ? 'text-[#2c2b29]' : 'text-white'}`}>{f.title}</h3>
                <p className={`${theme === 'PAPERCRAFT' ? 'text-[#5c5952]' : 'text-white/50'} leading-relaxed`}>{f.desc}</p>
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
      className={`relative w-full h-[100dvh] overflow-hidden transition-colors duration-500 ${
        theme === 'PAPERCRAFT' ? 'bg-[#f5f2eb] text-[#2c2b29]' : 'bg-[#050505] text-white'
      }`}
      onClick={() => setShowColorPicker(false)}
    >



      {/* Page Switcher */}
      {isLaunched && !gameEngine.isGameMode && (
        <div className="absolute top-8 left-8 z-50 bg-[#faf8f5] border-2 border-[#4a453f] rounded-full p-1.5 flex gap-1 shadow-[3px_3px_0px_#4a453f] transition-all">
          <button
            onClick={() => { setActiveTab('DRAW'); audio.playClick(); }}
            className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all border ${
              activeTab === 'DRAW' 
                ? 'bg-[#d4a34b]/20 text-[#8a6d3b] border-[#d4a34b]/40 shadow-inner' 
                : 'text-[#4a453f]/60 hover:text-[#4a453f] hover:bg-[#4a453f]/5 border-transparent'
            }`}
          >
            🎨 Creative Draw
          </button>
          <button
            onClick={() => { setActiveTab('STUDIO'); audio.playClick(); }}
            className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all border ${
              activeTab === 'STUDIO' 
                ? 'bg-[#b87a55]/20 text-[#b87a55] border-[#b87a55]/40 shadow-inner' 
                : 'text-[#4a453f]/60 hover:text-[#4a453f] hover:bg-[#4a453f]/5 border-transparent'
            }`}
          >
            ✨ Gesture Studio
          </button>
          <button
            onClick={() => { setActiveTab('FILTERS'); audio.playClick(); }}
            className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all border ${
              activeTab === 'FILTERS' 
                ? 'bg-violet-500/20 text-violet-700 border-violet-500/40 shadow-inner' 
                : 'text-[#4a453f]/60 hover:text-[#4a453f] hover:bg-[#4a453f]/5 border-transparent'
            }`}
          >
            🎭 Face Filters
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
            { `Filter Changed: ${cameraFilter}`}
          </motion.div>
        )}
      </AnimatePresence>
      {activeTab === 'DRAW' ? (
        <>
      <FPSIndicator />
      
      <CameraFilters />
      <CameraView videoRef={videoRef} showPreview={showPreview} cameraFilter={cameraFilter} />
      {/* Face AR active badge */}
      {faceAREnabled && activeMask && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(250,246,240,0.92)', border: '2px solid #2c2b29',
          borderRadius: 20, padding: '4px 16px', zIndex: 60, fontSize: 13, fontWeight: 700,
          color: '#2c2b29', boxShadow: '3px 3px 0 #2c2b29', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {MASKS.find(m => m.id === activeMask)?.emoji} Face AR: {MASKS.find(m => m.id === activeMask)?.label}
        </div>
      )}

      

            <DrawingCanvas canvasRef={canvasRef} cursorCanvasRef={cursorCanvasRef} width={dimensions.width} height={dimensions.height} />
      {/* Face AR mask overlay */}
      <FaceMaskCanvas
        landmarks={faceLandmarks}
        width={dimensions.width}
        height={dimensions.height}
        maskId={activeMask}
      />

      {/* Face AR mask selector — appears when faceAREnabled */}
      {faceAREnabled && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, zIndex: 50, background: 'rgba(250,246,240,0.92)',
          borderRadius: 24, padding: '8px 14px', border: '2px solid #2c2b29',
          boxShadow: '4px 4px 0 #2c2b29',
        }}>
          {MASKS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMask(prev => prev === m.id ? null : m.id)}
              title={m.label}
              style={{
                width: 44, height: 44, borderRadius: 12, border: '2px solid',
                borderColor: activeMask === m.id ? '#2c2b29' : 'transparent',
                background: activeMask === m.id ? '#f5d060' : 'transparent',
                fontSize: 22, cursor: 'pointer', transition: 'all 0.2s',
                transform: activeMask === m.id ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {m.emoji}
            </button>
          ))}
          <button
            onClick={() => { setFaceAREnabled(false); setActiveMask(null); }}
            style={{
              width: 44, height: 44, borderRadius: 12, border: '2px solid #c45c55',
              background: 'transparent', fontSize: 16, cursor: 'pointer', color: '#c45c55', fontWeight: 700
            }}
          >✕</button>
        </div>
      )}



            {/* 3D Build Canvas (Perspective overlay) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Canvas camera={{ position: [150, 150, 800], fov: 45 }}>
{theme === 'PAPERCRAFT' ? (
                  <>
                    <ambientLight intensity={1.0} />
                    <directionalLight position={[30, 50, 40]} intensity={1.8} />
                    <directionalLight position={[-30, -20, -10]} intensity={0.4} color="#ffffff" />
                  </>
                ) : (
                  <>
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[10, 10, 50]} intensity={2.5} />
                    <pointLight position={[-50, -50, 100]} intensity={2} color="#00f3ff" />
                  </>
                )}
                
                {/* Real-time 3D Origami Hand Tracking inside the Studio Canvas */}
                <Hand3D isMobile={false} handStateRef={handStateRef} theme={theme} />
                
                {builtBlocks.map((b, i) => {
                  const x = b.gx * 40;
                  const y = b.gy * 40;
                  const z = b.gz * 40;
                  return (
                    <AnimatedBlock 
                      key={i} 
                      position={[x, y, z]} 
                      color={b.color} 
                      disintegratedAt={b.disintegratedAt}
                      drift={b.drift}
                      theme={theme}
                    />
                  );
                })}
                <OrbitControls makeDefault />
                
              </Canvas>
            </div>


    
      
        </>
      ) : activeTab === 'STUDIO' ? (
        <AIGestureStudio />
      ) : (
        <div className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col justify-center py-24 select-none pointer-events-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full">
            <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left">
              <span className="inline-flex items-center gap-2 bg-violet-100 border border-violet-300 rounded-full px-5 py-2 text-xs text-violet-700 font-bold tracking-widest uppercase mb-6">
                <Smile className="w-4 h-4 text-violet-700" />
                Webcam Art
              </span>
              <h2 className="text-4xl font-black text-[#2c2b29] mb-4">Face Filters</h2>
              <p className="text-[#5c5952] text-sm leading-relaxed mb-6 font-light">
                Show an open palm ✋ to your camera to cycle through 16 real-time art styles!
              </p>
              <button 
                onClick={() => setActiveTab('DRAW')}
                className="px-6 py-3 rounded-xl font-bold bg-[#faf8f5] border-2 border-[#4a453f] text-[#2c2b29] shadow-[3px_3px_0px_#4a453f] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#4a453f] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none cursor-pointer transition-all"
              >
                ← Return to Canvas
              </button>
            </div>
            <div className="md:col-span-7 w-full max-w-[500px] mx-auto">
              <div className="p-3 bg-[#faf8f5] border-2 border-[#4a453f] rounded-[1.5rem] shadow-[6px_6px_0px_#4a453f]">
                <GestureFaceFilter />
              </div>
            </div>
          </div>
        </div>
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

      
      /* Leftover Mode Toggle Removed */

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

          <div className="shrink-0 w-px h-8 bg-[#4a453f]/15 mx-1 md:mx-2"></div>

          {/* Brushes */}
          <button onClick={() => { audio.playClick(); setMode('DRAW'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'DRAW' ? 'bg-white/10 text-[#00f3ff]' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Neon Pen">
            <Palette size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('COSMIC'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'COSMIC' ? 'bg-white/10 text-yellow-400' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Cosmic Sparkles">
            <SparklesIcon size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('RAINBOW'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'RAINBOW' ? 'bg-white/10 text-[#ff8c00]' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Rainbow Path">
            <Rainbow size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('FIRE'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'FIRE' ? 'bg-white/10 text-red-500' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Rising Flame">
            <Flame size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('LASER'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'LASER' ? 'bg-white/10 text-purple-400' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Double Lasers">
            <Zap size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setMode('ERASE'); setShowColorPicker(false); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${mode === 'ERASE' ? 'bg-white/10 text-[#ff007f]' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Erase (E)">
            <Eraser size={20} />
          </button>
          
          <div className="hidden md:block w-px h-8 bg-[#4a453f]/15 mx-2"></div>

          {/* Collapsible Sliders Panel Toggle */}
          <button 
            onClick={(e) => { e.stopPropagation(); audio.playClick(); setShowSliders(!showSliders); setShowColorPicker(false); }} 
            onMouseEnter={handleHover} 
            className={`p-3 rounded-full transition-all ${showSliders ? 'bg-white/10 text-[#00f3ff]' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} 
            title="Brush Size & Glow"
          >
            <SlidersHorizontal size={20} />
          </button>
          
          <div className="hidden md:block w-px h-8 bg-[#4a453f]/15 mx-2"></div>

          {/* Symmetry Toggle */}
          <button 
            onClick={cycleSymmetry} 
            onMouseEnter={handleHover} 
            className={`p-3 rounded-full transition-all flex items-center justify-center gap-1 ${
              symmetry !== 'NONE' ? 'bg-white/10 text-[#39ff14]' : 'text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5'
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

            {/* BUILD Tool */}
            <button
              onClick={() => { setMode('BUILD'); audio.playClick(); }}
              onMouseEnter={handleHover}
              className={`shrink-0 p-3 rounded-full transition-all ${mode === 'BUILD' ? 'bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.5)] border border-[#00f3ff]/50' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'}`}
              title="Build Blocks (OK Gesture)"
            >
              <Box size={20} />
            </button>
    
          
          <div className="hidden md:block w-px h-8 bg-[#4a453f]/15 mx-2"></div>
          
          {/* Actions */}
          <button onClick={() => { audio.playClick(); undo(); }} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-[#4a453f]/70 hover:text-[#4a453f] hover:bg-[#4a453f]/5 transition-all" title="Undo (Z)">
            <Undo size={20} />
          </button>
          <button onClick={() => { audio.playClick(); clearCanvas(); setBuiltBlocks([]); }} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Clear (C)">
            <Trash2 size={20} />
          </button>
          <button onClick={handleSaveToGallery} onMouseEnter={handleHover} className="shrink-0 p-3 rounded-full text-white/50 hover:text-[#39ff14] hover:bg-[#4a453f]/5 transition-all" title="Save to Local Gallery">
            <FolderHeart size={20} />
          </button>
          <button 
            onClick={cycleEnvironment} 
            onMouseEnter={handleHover} 
            className="shrink-0 p-3 rounded-full text-white/50 hover:text-[#b026ff] hover:bg-[#4a453f]/5 transition-all hidden sm:block" 
            title={`Environment: ${envMode}`}
          >
            <ImageIcon size={20} />
          </button>
          
          <div className="w-px h-8 bg-[#4a453f]/15 mx-2 hidden sm:block"></div>

          {/* Face AR Toggle */}
          <button 
            onClick={() => {
              audio.playClick();
              if (!faceAREnabled) {
                setFaceAREnabled(true);
                setActiveMask(MASKS[0].id);
              } else {
                const idx = MASKS.findIndex(m => m.id === activeMask);
                const next = (idx + 1) % MASKS.length;
                if (next === 0) {
                  setFaceAREnabled(false);
                  setActiveMask(null);
                } else {
                  setActiveMask(MASKS[next].id);
                }
              }
            }} 
            onMouseEnter={handleHover} 
            className={`shrink-0 p-3 rounded-full transition-all ${
              faceAREnabled ? 'bg-yellow-400/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-400/50' : 'text-white/50 hover:bg-[#4a453f]/10 hover:text-white border border-transparent'
            }`} 
            title={`Face AR Mask: ${faceAREnabled && activeMask ? MASKS.find(m => m.id === activeMask)?.label : 'Off'}`}
          >
            <Smile size={20} />
          </button>

          {/* Settings */}
          <button onClick={() => { audio.playClick(); setShowPreview(!showPreview); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all hidden sm:block ${showPreview ? 'text-white' : 'text-white/30 hover:bg-[#4a453f]/5'}`} title="Toggle Camera">
             {showPreview ? <Camera size={20} /> : <X size={20} />}
          </button>
          <button onClick={toggleRecording} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all hidden sm:block ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-white/50 hover:text-red-400 hover:bg-[#4a453f]/5'}`} title="Record Video">
            <Video size={20} />
          </button>
          <button 
            onClick={toggleAudio}
            onMouseEnter={handleHover}
            className={`p-3 rounded-full transition-all hidden sm:block ${isAudioEnabled ? 'text-[#00f3ff] bg-white/5' : 'text-white/30 hover:bg-[#4a453f]/5'}`}
            title="Toggle Synth Audio"
          >
            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <div className="hidden md:block w-px h-8 bg-[#4a453f]/15 mx-2"></div>

          {/* Mode Toggles */}
          <button onClick={() => { audio.playClick(); gameEngine.toggleGameMode(); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${gameEngine.isGameMode ? 'bg-[#b026ff]/20 text-[#b026ff]' : 'text-white/50 hover:text-[#b026ff] hover:bg-[#4a453f]/5'}`} title="Arcade Mode">
            <Gamepad2 size={20} />
          </button>
          <button onClick={() => { audio.playClick(); setShowDebug(!showDebug); }} onMouseEnter={handleHover} className={`p-3 rounded-full transition-all ${showDebug ? 'text-[#39ff14] bg-[#39ff14]/10' : 'text-[#4a453f]/50 hover:text-[#4a453f] hover:bg-[#4a453f]/5'}`} title="Toggle Debug">
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
            className="absolute inset-0 bg-[#f5f2eb]/95 flex items-center justify-center z-30 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-[#4a453f]/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#c45c55] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-4 border-[#d4a34b] border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              </div>
              <p className="text-[#4a453f]/80 tracking-[0.25em] text-sm uppercase font-bold animate-pulse">Folding Origami Studio...</p>
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
              className="bg-[#faf8f5] border-2 border-[#4a453f] rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-[4px_4px_0px_#4a453f] relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-[#d4a34b]/20 border-2 border-[#d4a34b]/40 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} className="text-[#8a6d3b]" />
              </div>

              <h2 className="text-4xl font-extrabold text-[#2c2b29] mb-2 tracking-tight">
                {gameEngine.lives <= 0 ? 'GAME OVER' : 'ROUND COMPLETED'}
              </h2>
              <p className="text-[#4a453f]/60 text-xs font-bold tracking-widest uppercase mb-8">Arcade Smasher Challenge</p>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-4 bg-[#fcfbf9] border-2 border-[#4a453f]/20 rounded-3xl p-6 mb-8 text-left">
                <div>
                  <span className="text-[10px] text-[#4a453f]/50 font-bold uppercase tracking-widest">Final Score</span>
                  <p className="text-3xl font-black text-[#d4a34b] font-mono tracking-wider">{gameEngine.score}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#4a453f]/50 font-bold uppercase tracking-widest">Max Combo</span>
                  <p className="text-3xl font-black text-[#2c2b29] font-mono tracking-wider">{gameEngine.maxCombo}x</p>
                </div>
              </div>

              {/* Score Submission Input */}
              {gameEngine.score > 0 ? (
                <div className="mb-8 text-left">
                  <label htmlFor="player-name" className="block text-[10px] text-[#4a453f]/60 font-bold uppercase tracking-widest mb-2 ml-1">
                    Enter Name for Leaderboard
                  </label>
                  <input
                    id="player-name"
                    type="text"
                    maxLength={10}
                    placeholder="ENTER NAME..."
                    className="w-full bg-[#faf8f5] border-2 border-[#4a453f] focus:border-[#d4a34b] rounded-2xl px-5 py-4 text-[#2c2b29] font-bold tracking-widest font-mono text-center outline-none transition-all placeholder:text-[#4a453f]/30 uppercase"
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
                  <p className="text-[9px] text-[#4a453f]/40 mt-2 text-center">Press Enter to submit and replay</p>
                </div>
              ) : (
                <p className="text-xs text-[#4a453f]/60 mb-8">Score higher than 0 to enter the leaderboard!</p>
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
                  className="flex-1 bg-[#faf8f5] border-2 border-[#4a453f] text-[#2c2b29] font-extrabold text-sm px-6 py-4 rounded-2xl shadow-[3px_3px_0px_#4a453f] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#4a453f] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150 cursor-pointer"
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
                  className="flex-1 bg-[#4a453f]/5 border-2 border-[#4a453f]/10 text-[#4a453f] font-bold text-sm px-6 py-4 rounded-2xl hover:bg-[#4a453f]/10 transition-all cursor-pointer"
                >
                  Exit Mode
                </button>
              </div>

              {gameEngine.score > 0 && (
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just scored ${gameEngine.score} points with a ${gameEngine.maxCombo}x combo in Glow AR Arcade! 🌟 Can you beat my score? #GlowAR #SpatialComputing`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border-2 border-[#1DA1F2]/20 text-[#1DA1F2] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer"
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

