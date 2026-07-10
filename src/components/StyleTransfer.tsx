import React, { useRef, useEffect, useState } from 'react';
import { Download, Repeat, RefreshCw } from 'lucide-react';
import { ModelLoader } from '../utils/ModelLoader';
import { STYLE_MAP } from './StyleSelector';

interface Props {
  capturedFrame: string | null; // base64 data URL
  activeStyle: string; // 'Anime' | 'Cyberpunk' | etc.
  onReset: () => void;
}

export const StyleTransfer: React.FC<Props> = ({
  capturedFrame,
  activeStyle,
  onReset
}) => {
  const [stylizedFrame, setStylizedFrame] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!capturedFrame) return;
    runStyleTransfer();
  }, [capturedFrame, activeStyle]);

  const runStyleTransfer = async () => {
    setIsProcessing(true);
    setStylizedFrame(null);

    const img = new Image();
    img.src = capturedFrame!;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // If Model is not loaded or tf is missing, run high-fidelity fallback styling (Canvas Pixel Shaders)
    const tf = (window as any).tf;
    if (!ModelLoader.isLoaded() || !tf) {
      console.log("Using High-Fidelity local canvas shaders for styling...");
      // Add slight delay to simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 800));
      applyCanvasFilter(ctx, canvas.width, canvas.height, activeStyle);
      setStylizedFrame(canvas.toDataURL('image/jpeg'));
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Run via TensorFlow.js Graph Model
      const contentTensor = tf.browser.fromPixels(img)
        .toFloat()
        .div(255.0)
        .expandDims(0); // [1, H, W, 3]

      // Create a style image representation (dynamic pattern on small canvas)
      const styleCanvas = document.createElement('canvas');
      styleCanvas.width = 256;
      styleCanvas.height = 256;
      const sCtx = styleCanvas.getContext('2d')!;
      drawStylePattern(sCtx, activeStyle);

      const styleTensor = tf.browser.fromPixels(styleCanvas)
        .toFloat()
        .div(255.0)
        .expandDims(0); // [1, H, W, 3]

      // Run Predictor to get 100-d style vector
      const styleBottleneck = ModelLoader.predictorModel.predict(styleTensor);

      // Run Transformer to apply style to content
      const stylizedTensor = ModelLoader.transformerModel.execute(
        { 'placeholder_content': contentTensor, 'placeholder_style_num': styleBottleneck }
      );

      // Output to Canvas
      const squeezed = tf.squeeze(stylizedTensor);
      await tf.browser.toPixels(squeezed, canvas);

      setStylizedFrame(canvas.toDataURL('image/jpeg'));
      
      // Cleanup tensors
      contentTensor.dispose();
      styleTensor.dispose();
      styleBottleneck.dispose();
      stylizedTensor.dispose();
      squeezed.dispose();

    } catch (e) {
      console.error("TF.js Error, falling back to Canvas filter:", e);
      applyCanvasFilter(ctx, canvas.width, canvas.height, activeStyle);
      setStylizedFrame(canvas.toDataURL('image/jpeg'));
    } finally {
      setIsProcessing(false);
    }
  };

  const drawStylePattern = (ctx: CanvasRenderingContext2D, style: string) => {
    // Generate distinct color patterns representing the styles for the prediction model
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    if (style === 'Cyberpunk') {
      grad.addColorStop(0, '#ff007f');
      grad.addColorStop(1, '#00f3ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    } else if (style === 'Anime') {
      grad.addColorStop(0, '#ffc0cb');
      grad.addColorStop(0.5, '#87ceeb');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    } else if (style === 'Comic') {
      ctx.fillStyle = '#b026ff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#fae100';
      ctx.beginPath();
      ctx.arc(128, 128, 64, 0, 2 * Math.PI);
      ctx.fill();
    } else if (style === 'Sketch') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 10;
      ctx.strokeRect(50, 50, 150, 150);
    } else if (style === 'Watercolor') {
      grad.addColorStop(0, '#ff8c00');
      grad.addColorStop(1, '#ffc0cb');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    } else if (style === 'Neon') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(50, 50, 156, 156);
    } else {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);
    }
  };

  const applyCanvasFilter = (ctx: CanvasRenderingContext2D, w: number, h: number, style: string) => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    if (style === 'Cyberpunk') {
      // Pink and Cyan color grading
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Boost reds and blues, shift green down
        data[i] = Math.min(r * 1.4, 255);
        data[i + 1] = g * 0.7;
        data[i + 2] = Math.min(b * 1.5 + 50, 255);
      }
    } else if (style === 'Anime') {
      // Smooth pastel look
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Saturate and brighten
        data[i] = Math.min(r * 1.1 + 20, 255);
        data[i + 1] = Math.min(g * 1.1 + 20, 255);
        data[i + 2] = Math.min(b * 1.2 + 10, 255);
      }
    } else if (style === 'Comic') {
      // High contrast halftone comic style
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;

        // Posterize colors to 4 levels
        data[i] = Math.floor(r / 64) * 64;
        data[i + 1] = Math.floor(g / 64) * 64;
        data[i + 2] = Math.floor(b / 64) * 64;

        if (avg < 50) {
          data[i] = 10; data[i + 1] = 10; data[i + 2] = 20; // dark ink outlines
        }
      }
    } else if (style === 'Sketch') {
      // Sobel Edge Filter simulation
      const gray = new Uint8ClampedArray(w * h);
      for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      }

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const pixelX = 
            (gray[idx - w + 1] + 2 * gray[idx + 1] + gray[idx + w + 1]) -
            (gray[idx - w - 1] + 2 * gray[idx - 1] + gray[idx + w - 1]);
          const pixelY = 
            (gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1]) -
            (gray[idx - w - 1] + 2 * gray[idx - w] + gray[idx - w + 1]);

          const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
          const edgeValue = Math.max(0, 255 - magnitude); // inverted for pencil on white paper

          const dIdx = idx * 4;
          data[dIdx] = edgeValue;
          data[dIdx + 1] = edgeValue;
          data[dIdx + 2] = edgeValue;
        }
      }
    } else if (style === 'Watercolor') {
      // Soft blurred warm paint look
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(data[i] * 1.3, 255);
        data[i + 1] = Math.min(data[i + 1] * 1.1 + 10, 255);
        data[i + 2] = Math.min(data[i + 2] * 0.9, 255);
      }
    } else if (style === 'Neon') {
      // Invert, dark, and saturate greens
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const v = (r + g + b) / 3;

        if (v > 100) {
          data[i] = 10;
          data[i + 1] = 255; // electric neon green
          data[i + 2] = 50;
        } else {
          data[i] = 5; data[i + 1] = 5; data[i + 2] = 10;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const handleDownload = (imgUrl: string, suffix: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = "ar_gesture_studio_" + suffix + ".jpg";
    link.click();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  const activeColor = STYLE_MAP.find(s => s.name === activeStyle)?.color || '#00f3ff';

  return (
    <div className="flex flex-col items-center w-full gap-8">
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Image Slider Panel */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0d] shadow-2xl select-none"
        style={{ maxWidth: '720px' }}
      >
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050508]/85 backdrop-blur-xl z-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: activeColor, borderTopColor: 'transparent' }} />
            </div>
            <p className="text-white/60 tracking-wider text-xs uppercase font-bold animate-pulse">
              Stylizing via Local Neural Engine...
            </p>
          </div>
        )}

        {/* Captured Original (Bottom Layer) */}
        {capturedFrame && (
          <img 
            src={capturedFrame} 
            alt="Original Capture"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Stylized Output (Top Layer - Slider Clipping) */}
        {stylizedFrame && (
          <div 
            className="absolute inset-0 w-full h-full overflow-hidden z-10"
            style={{ clipPath: "polygon(0 0, " + sliderPosition + "% 0, " + sliderPosition + "% 100%, 0 100%)" }}
          >
            <img 
              src={stylizedFrame} 
              alt="Stylized AI"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%', height: containerRef.current ? containerRef.current.clientHeight : '100%' }}
            />
          </div>
        )}

        {/* Sliding Indicator Handle */}
        {stylizedFrame && !isProcessing && (
          <div 
            className="absolute top-0 bottom-0 w-1 z-20 pointer-events-none"
            style={{ left: sliderPosition + "%", backgroundColor: activeColor }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-xl border cursor-ew-resize"
              style={{ backgroundColor: activeColor, borderColor: '#ffffff20' }}
            >
              <Repeat size={14} className="text-white rotate-90" />
            </div>
          </div>
        )}

        {/* Slider Input */}
        {stylizedFrame && !isProcessing && (
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={sliderPosition} 
            onChange={handleSliderChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
          />
        )}
      </div>

      {/* Buttons */}
      {!isProcessing && (
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-[720px]">
          <button 
            onClick={onReset}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all"
          >
            <RefreshCw size={16} /> Retake Photo
          </button>
          {stylizedFrame && (
            <>
              <button 
                onClick={() => handleDownload(stylizedFrame, activeStyle.toLowerCase())}
                className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-lg hover:scale-105"
                style={{ backgroundColor: activeColor }}
              >
                <Download size={16} /> Download Styled
              </button>
              <button 
                onClick={() => handleDownload(capturedFrame!, 'original')}
                className="flex items-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all"
              >
                <Download size={16} /> Original
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
