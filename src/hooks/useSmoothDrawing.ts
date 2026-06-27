import { useEffect, useRef } from 'react';
import type { GestureType } from '../utils/gestureDetection';

interface Point { x: number; y: number; z: number; }
export type DrawMode = 'DRAW' | 'ERASE' | 'POINTER' | 'COSMIC' | 'RAINBOW' | 'FIRE' | 'LASER';
export type SymmetryMode = 'NONE' | 'HORIZONTAL' | 'RADIAL';

interface DrawOptions {
  color: string;
  size: number;
  glow: number;
  mode: DrawMode;
  symmetry?: SymmetryMode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  type?: 'fire' | 'spark';
}

export const useSmoothDrawing = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  handStateRef: React.MutableRefObject<{ position: Point | null; gesture: GestureType; landmarks?: any[] }>,
  options: DrawOptions,
  gameEngine?: any,
  videoRef?: React.RefObject<HTMLVideoElement>,
  showPreview?: boolean
) => {
  const prevPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(false);
  const undoStackRef = useRef<ImageData[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const posHistoryRef = useRef<Point[]>([]);
  const smoothedPosRef = useRef<Point | null>(null);
  const prevGameModeRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!cursorCanvasRef.current && canvas.width > 0) {
      try {
        const cursorCanvas = document.createElement('canvas');
        cursorCanvas.width = canvas.width;
        cursorCanvas.height = canvas.height;
        cursorCanvas.className = "absolute inset-0 w-full h-full pointer-events-none z-10";
        canvas.parentElement?.appendChild(cursorCanvas);
        cursorCanvasRef.current = cursorCanvas;
        undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      } catch (e) {
        console.error("Failed to initialize cursor canvas", e);
      }
    }

    let animationFrameId: number;

    const renderLoop = () => {
      try {
        const state = handStateRef.current;
        const cursorCanvas = cursorCanvasRef.current;
        const cursorCtx = cursorCanvas?.getContext('2d');

        if (cursorCtx && cursorCanvas) {
          cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
        }

        const isGameMode = !!gameEngine?.isGameMode;
        if (prevGameModeRef.current && !isGameMode && canvas.width > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        prevGameModeRef.current = isGameMode;

        if (isGameMode && canvas.width > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw hand tracking skeleton on cursor canvas
        if (cursorCtx && cursorCanvas && state.landmarks && canvas.width > 0) {
          cursorCtx.save();
          cursorCtx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
          cursorCtx.lineWidth = 2;
          cursorCtx.shadowBlur = 10;
          cursorCtx.shadowColor = '#00f3ff';
          
          const connections = [
            [0,1], [1,2], [2,3], [3,4], // Thumb
            [0,5], [5,6], [6,7], [7,8], // Index
            [5,9], [9,10], [10,11], [11,12], // Middle
            [9,13], [13,14], [14,15], [15,16], // Ring
            [13,17], [0,17], [17,18], [18,19], [19,20] // Pinky & Palm
          ];

          cursorCtx.beginPath();
          connections.forEach(([i, j]) => {
            const p1 = state.landmarks![i];
            const p2 = state.landmarks![j];
            if (p1 && p2) {
              cursorCtx.moveTo(p1.x, p1.y);
              cursorCtx.lineTo(p2.x, p2.y);
            }
          });
          cursorCtx.stroke();
          
          cursorCtx.fillStyle = '#ffffff';
          state.landmarks.forEach((lm: any) => {
            cursorCtx.beginPath();
            cursorCtx.arc(lm.x, lm.y, 3, 0, Math.PI * 2);
            cursorCtx.fill();
          });
          cursorCtx.restore();
        }
        
        // Update and draw particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          
          if (p.type === 'fire') {
            p.vy -= 0.15; // Float UP
            p.vx *= 0.95; // Dampen horizontal movement
          } else {
            p.vy += 0.1; // Normal gravity drops
          }

          if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          if (cursorCtx) {
            cursorCtx.beginPath();
            cursorCtx.arc(p.x, p.y, (p.life / p.maxLife) * 4, 0, Math.PI * 2);
            cursorCtx.fillStyle = p.color;
            cursorCtx.shadowBlur = 10;
            cursorCtx.shadowColor = p.color;
            cursorCtx.fill();
          }
        }

        if (!state.position || options.mode === 'POINTER' || state.gesture === 'PAUSE') {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (canvas.width > 0 && !gameEngine?.isGameMode) {
              undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
              if (undoStackRef.current.length > 20) undoStackRef.current.shift();
            }
          }
          prevPointRef.current = null;
          posHistoryRef.current = [];
          smoothedPosRef.current = null;
          
          if (state.position && cursorCtx && state.gesture !== 'PAUSE') {
            const zScale = Math.max(0.2, 1 - (state.position.z * 10));
            
            // Helper to draw a single cursor circle
            const drawCursor = (x: number, y: number, colorStr: string) => {
              cursorCtx.beginPath();
              cursorCtx.arc(x, y, options.size * zScale * 1.5, 0, Math.PI * 2);
              cursorCtx.fillStyle = colorStr;
              cursorCtx.shadowBlur = 15;
              cursorCtx.shadowColor = colorStr;
              cursorCtx.fill();
            };

            const activeColor = options.mode === 'DRAW' ? options.color : (options.mode === 'ERASE' ? '#ff007f' : '#00f3ff');
            
            // Draw symmetric cursor indicators
            drawCursor(state.position.x, state.position.y, activeColor);
            
            // Ghost Dust Trail
            if (Math.random() > 0.5) {
              const rx = state.position.x + (Math.random() - 0.5) * 10;
              const ry = state.position.y + (Math.random() - 0.5) * 10;
              particlesRef.current.push({
                x: rx, y: ry,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: Math.random() * 15 + 5,
                maxLife: 20,
                color: 'rgba(255, 255, 255, 0.4)',
                type: 'spark'
              });
            }
            
            const sym = options.symmetry || 'NONE';
            if (sym === 'HORIZONTAL') {
              drawCursor(2 * cx - state.position.x, state.position.y, activeColor);
            } else if (sym === 'RADIAL') {
              const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
              angles.forEach(angle => {
                const rx = cx + (state.position!.x - cx) * Math.cos(angle) - (state.position!.y - cy) * Math.sin(angle);
                const ry = cy + (state.position!.x - cx) * Math.sin(angle) + (state.position!.y - cy) * Math.cos(angle);
                drawCursor(rx, ry, activeColor);
              });
            }
          }

          if (gameEngine?.isGameMode) {
            const isPaused = !state.position || state.gesture === 'PAUSE';
            gameEngine.updatePhysics(ctx, canvas.width, canvas.height, state.position?.x || null, state.position?.y || null, false, isPaused);
          }

          animationFrameId = requestAnimationFrame(renderLoop);
          return;
        }

        const shouldDraw = state.gesture === 'DRAW';

        posHistoryRef.current.push(state.position);
        if (posHistoryRef.current.length > (gameEngine?.isGameMode ? 15 : 5)) posHistoryRef.current.shift();
        
        // Fast Exponential Moving Average (EMA) to prevent alignment offsets and tracking lag
        const alpha = gameEngine?.isGameMode ? 0.75 : 0.6;
        if (!smoothedPosRef.current) {
          smoothedPosRef.current = { ...state.position };
        } else {
          smoothedPosRef.current = {
            x: smoothedPosRef.current.x * (1 - alpha) + state.position.x * alpha,
            y: smoothedPosRef.current.y * (1 - alpha) + state.position.y * alpha,
            z: smoothedPosRef.current.z * (1 - alpha) + state.position.z * alpha
          };
        }
        const avgPos = smoothedPosRef.current;

        const zScale = Math.max(0.1, 1 - (avgPos.z * 12));
        const dynamicSize = options.size * zScale;

        // Custom active colors per mode
        let activeColor = options.color;
        if (options.mode === 'COSMIC') {
          activeColor = `hsl(${Date.now() / 5 % 360}, 100%, 60%)`;
        } else if (options.mode === 'RAINBOW') {
          activeColor = `hsl(${Date.now() / 3 % 360}, 100%, 55%)`;
        } else if (options.mode === 'FIRE') {
          activeColor = `hsl(${Math.random() * 28 + 12}, 100%, 60%)`;
        }

        if (cursorCtx) {
          if (gameEngine?.isGameMode && posHistoryRef.current.length > 1) {
            cursorCtx.beginPath();
            cursorCtx.moveTo(posHistoryRef.current[0].x, posHistoryRef.current[0].y);
            for (let i = 1; i < posHistoryRef.current.length; i++) {
              cursorCtx.lineTo(posHistoryRef.current[i].x, posHistoryRef.current[i].y);
            }
            cursorCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            cursorCtx.lineWidth = dynamicSize;
            cursorCtx.shadowBlur = 20;
            cursorCtx.shadowColor = '#00f3ff';
            cursorCtx.lineCap = 'round';
            cursorCtx.lineJoin = 'round';
            cursorCtx.stroke();
          } else {
            // Draw cursor indicator at active coordinate
            cursorCtx.beginPath();
            cursorCtx.arc(avgPos.x, avgPos.y, dynamicSize * 1.5, 0, Math.PI * 2);
            cursorCtx.fillStyle = options.mode === 'ERASE' ? '#ff007f' : activeColor;
            cursorCtx.shadowBlur = 15;
            cursorCtx.shadowColor = cursorCtx.fillStyle;
            cursorCtx.fill();
          }
        }

        // Shared symmetric line drawing routine
        const drawLineSegment = (
          x1: number, y1: number,
          x2: number, y2: number,
          w: number,
          strokeCol: string,
          shadowCol: string,
          blurVal: number,
          compositeOp: GlobalCompositeOperation = 'source-over'
        ) => {
          ctx.save();
          ctx.globalCompositeOperation = compositeOp;
          ctx.lineWidth = w;
          ctx.strokeStyle = strokeCol;
          ctx.shadowBlur = blurVal;
          ctx.shadowColor = shadowCol;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();
        };

        const drawSymmetric = (
          x1: number, y1: number,
          x2: number, y2: number,
          w: number,
          strokeCol: string,
          shadowCol: string,
          blurVal: number,
          compositeOp: GlobalCompositeOperation = 'source-over'
        ) => {
          drawLineSegment(x1, y1, x2, y2, w, strokeCol, shadowCol, blurVal, compositeOp);

          const sym = options.symmetry || 'NONE';
          if (sym === 'HORIZONTAL') {
            drawLineSegment(2 * cx - x1, y1, 2 * cx - x2, y2, w, strokeCol, shadowCol, blurVal, compositeOp);
          } else if (sym === 'RADIAL') {
            const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(angle => {
              const rx1 = cx + (x1 - cx) * Math.cos(angle) - (y1 - cy) * Math.sin(angle);
              const ry1 = cy + (x1 - cx) * Math.sin(angle) + (y1 - cy) * Math.cos(angle);
              const rx2 = cx + (x2 - cx) * Math.cos(angle) - (y2 - cy) * Math.sin(angle);
              const ry2 = cy + (x2 - cx) * Math.sin(angle) + (y2 - cy) * Math.cos(angle);
              drawLineSegment(rx1, ry1, rx2, ry2, w, strokeCol, shadowCol, blurVal, compositeOp);
            });
          }
        };

        // Shared symmetric particle spawning routine
        const spawnParticlesSymmetric = (
          px: number, py: number,
          vx: number, vy: number,
          col: string,
          pType: Particle['type'] = 'spark'
        ) => {
          particlesRef.current.push({
            x: px, y: py, vx, vy,
            life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
            maxLife: pType === 'fire' ? 35 : 25,
            color: col, type: pType
          });

          const sym = options.symmetry || 'NONE';
          if (sym === 'HORIZONTAL') {
            particlesRef.current.push({
              x: 2 * cx - px, y: py,
              vx: -vx, vy,
              life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
              maxLife: pType === 'fire' ? 35 : 25,
              color: col, type: pType
            });
          } else if (sym === 'RADIAL') {
            const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(angle => {
              const rpx = cx + (px - cx) * Math.cos(angle) - (py - cy) * Math.sin(angle);
              const rpy = cy + (px - cx) * Math.sin(angle) + (py - cy) * Math.cos(angle);
              
              const rvx = vx * Math.cos(angle) - vy * Math.sin(angle);
              const rvy = vx * Math.sin(angle) + vy * Math.cos(angle);

              particlesRef.current.push({
                x: rpx, y: rpy,
                vx: rvx, vy: rvy,
                life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
                maxLife: pType === 'fire' ? 35 : 25,
                color: col, type: pType
              });
            });
          }
        };

        if (shouldDraw) {
          if (!isDrawingRef.current || !prevPointRef.current) {
            isDrawingRef.current = true;
            prevPointRef.current = avgPos;
          } else {
            const prev = prevPointRef.current;
            const curr = avgPos;
            
            const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
            if (dist > 1000) {
              prevPointRef.current = curr;
              animationFrameId = requestAnimationFrame(renderLoop);
              return;
            }

            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;

            if (!gameEngine?.isGameMode) {
              
              if (options.mode === 'ERASE') {
                drawSymmetric(prev.x, prev.y, midX, midY, dynamicSize, 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 0, 'destination-out');
              } 
              else if (options.mode === 'LASER') {
                const dx = curr.x - prev.x;
                const dy = curr.y - prev.y;
                const len = Math.hypot(dx, dy);
                if (len > 0.5) {
                  const nx = -dy / len;
                  const ny = dx / len;
                  const offset = dynamicSize * 1.2;

                  // Dual Laser 1 (Left)
                  drawSymmetric(prev.x + nx * offset, prev.y + ny * offset, curr.x + nx * offset, curr.y + ny * offset, dynamicSize * 0.3, activeColor, activeColor, options.glow);
                  // Dual Laser 2 (Right)
                  drawSymmetric(prev.x - nx * offset, prev.y - ny * offset, curr.x - nx * offset, curr.y - ny * offset, dynamicSize * 0.3, activeColor, activeColor, options.glow);

                  // Core glow (White center)
                  drawSymmetric(prev.x + nx * offset, prev.y + ny * offset, curr.x + nx * offset, curr.y + ny * offset, dynamicSize * 0.1, '#ffffff', activeColor, options.glow * 0.4);
                  drawSymmetric(prev.x - nx * offset, prev.y - ny * offset, curr.x - nx * offset, curr.y - ny * offset, dynamicSize * 0.1, '#ffffff', activeColor, options.glow * 0.4);
                }
              }
              else if (options.mode === 'FIRE') {
                // Flame trail sparks
                for (let i = 0; i < 4; i++) {
                  const rx = avgPos.x + (Math.random() - 0.5) * 8;
                  const ry = avgPos.y + (Math.random() - 0.5) * 8;
                  const colStr = `hsl(${Math.random() * 28 + 12}, 100%, ${Math.random() * 30 + 50}%)`;
                  
                  spawnParticlesSymmetric(
                    rx, ry,
                    (Math.random() - 0.5) * 2,
                    -(Math.random() * 4 + 2),
                    colStr,
                    'fire'
                  );
                }
              }
              else {
                // DRAW, COSMIC, RAINBOW Brush
                drawSymmetric(prev.x, prev.y, midX, midY, dynamicSize, activeColor, activeColor, options.glow);
                // Draw inner white core
                drawSymmetric(prev.x, prev.y, midX, midY, dynamicSize * 0.4, '#ffffff', activeColor, options.glow * 0.5);

                // Normal particle sparkles
                if (Math.random() > 0.65 || options.mode === 'COSMIC') {
                  spawnParticlesSymmetric(
                    avgPos.x, avgPos.y,
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 6,
                    activeColor,
                    'spark'
                  );
                }
              }
            }

            prevPointRef.current = curr;
          }
        } else {
          if (isDrawingRef.current) {
            if (canvas.width > 0 && !gameEngine?.isGameMode) {
              undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
              if (undoStackRef.current.length > 20) undoStackRef.current.shift();
            }
          }
          prevPointRef.current = null;
          isDrawingRef.current = false;
        }

        if (gameEngine?.isGameMode) {
          gameEngine.updatePhysics(ctx, canvas.width, canvas.height, avgPos.x, avgPos.y, shouldDraw, false);
        }

      } catch (e) {
        console.error("Drawing error:", e);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasRef, handStateRef, options, gameEngine]);
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && canvas.width > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  };
  
  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'glow-finger-drawing.png';
      link.href = dataUrl;
      link.click();
    }
  };

  const saveToGallery = () => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // 1. Draw mirrored webcam feed as background
    if (video && showPreview) {
      tempCtx.save();
      tempCtx.translate(tempCanvas.width, 0);
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.restore();
    } else {
      tempCtx.fillStyle = '#050505';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }

    // 2. Draw canvas drawing layer on top
    tempCtx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);

    try {
      const saved = localStorage.getItem('glow_ar_gallery');
      const gallery = saved ? JSON.parse(saved) : [];
      gallery.unshift({
        id: Date.now(),
        image: dataUrl,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      });
      // Save last 9 snapshots
      localStorage.setItem('glow_ar_gallery', JSON.stringify(gallery.slice(0, 9)));
      
      // Dispatch event to refresh GallerySection
      window.dispatchEvent(new Event('gallery-update'));
    } catch (e) {
      console.error("Failed to save masterpiece to gallery", e);
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || undoStackRef.current.length <= 1) return;
    
    undoStackRef.current.pop();
    const previousState = undoStackRef.current[undoStackRef.current.length - 1];
    ctx.putImageData(previousState, 0, 0);
  };

  return { clearCanvas, saveDrawing, saveToGallery, undo };
};
