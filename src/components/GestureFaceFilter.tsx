"use client";

import { useEffect, useRef, useState } from "react";

const WORK_W = 320;
const WORK_H = 240;
const COOLDOWN_MS = 1000;

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function toGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = g;
  }
}

function sobelEdges(imgData: ImageData, threshold: number = 60, invert: boolean = false): ImageData {
  const { width: w, height: h, data } = imgData;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const out = new Uint8ClampedArray(data.length);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0, sy = 0, k = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const val = gray[(y + j) * w + (x + i)];
          sx += val * gx[k];
          sy += val * gy[k];
          k++;
        }
      }
      const mag = Math.sqrt(sx * sx + sy * sy);
      const edge = mag > threshold ? 255 : 0;
      const idx = (y * w + x) * 4;
      const v = invert ? 255 - edge : edge;
      out[idx] = out[idx + 1] = out[idx + 2] = v;
      out[idx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

function posterize(data: Uint8ClampedArray, levels: number = 4): void {
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(Math.round(Math.round(data[i] / step) * step));
    data[i + 1] = clamp(Math.round(Math.round(data[i + 1] / step) * step));
    data[i + 2] = clamp(Math.round(Math.round(data[i + 2] / step) * step));
  }
}

function duotone(data: Uint8ClampedArray, colorLow: [number, number, number], colorHigh: [number, number, number]): void {
  for (let i = 0; i < data.length; i += 4) {
    const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    data[i] = clamp(colorLow[0] + (colorHigh[0] - colorLow[0]) * g);
    data[i + 1] = clamp(colorLow[1] + (colorHigh[1] - colorLow[1]) * g);
    data[i + 2] = clamp(colorLow[2] + (colorHigh[2] - colorLow[2]) * g);
  }
}

function pixelateBlocks(imgData: ImageData, blockSize: number = 10): void {
  const { width: w, height: h, data } = imgData;
  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let y = by; y < Math.min(by + blockSize, h); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, w); x++) {
          const idx = (y * w + x) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
        }
      }
      r /= count; g /= count; b /= count;
      for (let y = by; y < Math.min(by + blockSize, h); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, w); x++) {
          const idx = (y * w + x) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
        }
      }
    }
  }
}

function halftoneDots(imgData: ImageData, cell: number = 5, color: [number, number, number] = [255, 255, 255]): void {
  const { width: w, height: h, data } = imgData;
  const out = new Uint8ClampedArray(data.length).fill(0);
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  for (let by = 0; by < h; by += cell) {
    for (let bx = 0; bx < w; bx += cell) {
      let sum = 0, count = 0;
      for (let y = by; y < Math.min(by + cell, h); y++) {
        for (let x = bx; x < Math.min(bx + cell, w); x++) {
          const idx = (y * w + x) * 4;
          sum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          count++;
        }
      }
      const avg = sum / count / 255;
      const radius = (1 - avg) * (cell * 0.55);
      const cx = bx + cell / 2, cy = by + cell / 2;
      for (let y = by; y < Math.min(by + cell, h); y++) {
        for (let x = bx; x < Math.min(bx + cell, w); x++) {
          const dx = x - cx, dy = y - cy;
          const idx = (y * w + x) * 4;
          if (Math.sqrt(dx * dx + dy * dy) < radius) {
            out[idx] = color[0]; out[idx + 1] = color[1]; out[idx + 2] = color[2];
          }
        }
      }
    }
  }
  imgData.data.set(out);
}

function rgbShift(data: Uint8ClampedArray, w: number, h: number, shift: number = 4): void {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const rx = Math.min(w - 1, x + shift);
      const bx = Math.max(0, x - shift);
      data[idx] = copy[(y * w + rx) * 4];
      data[idx + 2] = copy[(y * w + bx) * 4 + 2];
    }
  }
}

function scanlines(data: Uint8ClampedArray, w: number, h: number, strength: number = 0.25): void {
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] *= 1 - strength;
      data[idx + 1] *= 1 - strength;
      data[idx + 2] *= 1 - strength;
    }
  }
}

function grain(data: Uint8ClampedArray, amount: number = 18): void {
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + n);
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n);
  }
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function thermalMap(data: Uint8ClampedArray): void {
  const stops = [[0, 0, 80], [0, 180, 255], [0, 255, 120], [255, 240, 0], [255, 40, 0]];
  for (let i = 0; i < data.length; i += 4) {
    const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const scaled = g * (stops.length - 1);
    const idx0 = Math.floor(scaled);
    const idx1 = Math.min(stops.length - 1, idx0 + 1);
    const t = scaled - idx0;
    const c0 = stops[idx0], c1 = stops[idx1];
    data[i] = clamp(c0[0] + (c1[0] - c0[0]) * t);
    data[i + 1] = clamp(c0[1] + (c1[1] - c0[1]) * t);
    data[i + 2] = clamp(c0[2] + (c1[2] - c0[2]) * t);
  }
}

interface FaceStyle {
  name: string;
  cssFilter?: string;
  fx?: (img: ImageData) => void;
  post?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  halftone?: boolean;
}

const STYLES: FaceStyle[] = [
  { name: "Original", cssFilter: "none" },
  {
    name: "Van Gogh",
    cssFilter: "saturate(1.9) contrast(1.15) hue-rotate(-8deg) brightness(1.05) blur(0.6px)",
    post: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(30,80,180,0.12)");
      g.addColorStop(1, "rgba(255,200,60,0.10)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    name: "Neon Wire",
    fx: (img) => {
      const e = sobelEdges(img, 45);
      const d = img.data, ed = e.data;
      for (let i = 0; i < d.length; i += 4) {
        const on = ed[i] > 0;
        d[i] = on ? 20 : d[i] * 0.15;
        d[i + 1] = on ? 255 : d[i + 1] * 0.15;
        d[i + 2] = on ? 220 : d[i + 2] * 0.15;
      }
    },
  },
  {
    name: "Anime Cel",
    fx: (img) => {
      posterize(img.data, 5);
      const e = sobelEdges(img, 40);
      const d = img.data, ed = e.data;
      for (let i = 0; i < d.length; i += 4) {
        if (ed[i] > 0) { d[i] = 15; d[i + 1] = 15; d[i + 2] = 15; }
      }
    },
  },
  {
    name: "Pop Art",
    fx: (img) => {
      posterize(img.data, 4);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = clamp(img.data[i] * 1.3);
        img.data[i + 2] = clamp(img.data[i + 2] * 1.4);
      }
    },
  },
  {
    name: "Graffiti",
    cssFilter: "saturate(2.1) contrast(1.25) hue-rotate(15deg)",
    post: (ctx, w, h) => {
      const d = ctx.getImageData(0, 0, w, h);
      grain(d.data, 26);
      ctx.putImageData(d, 0, 0);
    },
  },
  {
    name: "Pencil Sketch",
    fx: (img) => {
      toGrayscale(img.data);
      const e = sobelEdges(img, 30, true);
      img.data.set(e.data);
    },
  },
  { name: "Thermal", fx: (img) => thermalMap(img.data) },
  {
    name: "Cyberpunk",
    fx: (img) => duotone(img.data, [10, 0, 40], [255, 0, 180]),
    post: (ctx, w, h) => {
      const d = ctx.getImageData(0, 0, w, h);
      scanlines(d.data, w, h, 0.2);
      ctx.putImageData(d, 0, 0);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "rgba(0,255,255,0.08)");
      g.addColorStop(1, "rgba(255,0,180,0.08)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    name: "Vintage Film",
    cssFilter: "sepia(0.55) contrast(1.05) brightness(0.95) saturate(1.1)",
    post: (ctx, w, h) => {
      const d = ctx.getImageData(0, 0, w, h);
      grain(d.data, 14);
      ctx.putImageData(d, 0, 0);
      vignette(ctx, w, h);
    },
  },
  {
    name: "Watercolor",
    cssFilter: "saturate(1.3) contrast(0.92) blur(1.4px) brightness(1.08)",
    post: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6);
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(1, "rgba(120,90,180,0.10)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  { name: "Comic Book", fx: (img) => posterize(img.data, 4), halftone: true },
  {
    name: "Glitch",
    cssFilter: "saturate(1.4) contrast(1.1)",
    post: (ctx, w, h) => {
      const d = ctx.getImageData(0, 0, w, h);
      rgbShift(d.data, w, h, 5);
      scanlines(d.data, w, h, 0.15);
      ctx.putImageData(d, 0, 0);
      if (Math.random() < 0.15) {
        const sy = Math.random() * h;
        const sh = 8 + Math.random() * 20;
        const off = (Math.random() - 0.5) * 30;
        const slice = ctx.getImageData(0, sy, w, sh);
        ctx.putImageData(slice, off, sy);
      }
    },
  },
  { name: "Duotone", fx: (img) => duotone(img.data, [15, 10, 45], [0, 230, 220]) },
  {
    name: "Pixel Art",
    fx: (img) => { pixelateBlocks(img, 8); posterize(img.data, 5); },
  },
  {
    name: "X-Ray",
    cssFilter: "invert(1) contrast(1.2) brightness(1.1) hue-rotate(180deg) saturate(1.6)",
  },
];

export default function GestureFaceFilter({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const [styleIndex, setStyleIndex] = useState(0);
  const [gestureLabel, setGestureLabel] = useState("no hand");
  const [gestureActive, setGestureActive] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const styleIndexRef = useRef(0);
  const lastTriggerRef = useRef(0);
  const activeFramesRef = useRef(0);
  const rafRenderRef = useRef<number | null>(null);
  const rafDetectRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    styleIndexRef.current = styleIndex;
  }, [styleIndex]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await new Promise<void>((res) => {
            video.onloadedmetadata = () => res();
          });
          await video.play();
        }

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = 960;
          canvas.height = 720;
        }

        const work = document.createElement("canvas");
        work.width = WORK_W;
        work.height = WORK_H;
        workRef.current = work;

        setStatus("ready");
        renderLoop();
        loadGestures();
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message || "Could not access your webcam.");
          setStatus("error");
        }
      }
    }

    function renderLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const work = workRef.current;
      if (!video || !canvas || !work) return;
      const ctx = canvas.getContext("2d");
      const wctx = work.getContext("2d", { willReadFrequently: true });
      if (!ctx || !wctx) return;

      const style = STYLES[styleIndexRef.current];
      wctx.drawImage(video, 0, 0, WORK_W, WORK_H);

      if (style.cssFilter && style.cssFilter !== "none") {
        wctx.filter = style.cssFilter;
        wctx.drawImage(video, 0, 0, WORK_W, WORK_H);
        wctx.filter = "none";
      }

      let imgData = wctx.getImageData(0, 0, WORK_W, WORK_H);
      if (style.fx) {
        style.fx(imgData);
        wctx.putImageData(imgData, 0, 0);
      }
      if (style.halftone) {
        let d2 = wctx.getImageData(0, 0, WORK_W, WORK_H);
        halftoneDots(d2, 5, [255, 255, 255]);
        wctx.putImageData(d2, 0, 0);
      }
      if (style.post) style.post(wctx, WORK_W, WORK_H);

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(work, 0, 0, canvas.width, canvas.height);

      rafRenderRef.current = requestAnimationFrame(renderLoop);
    }

    async function loadGestures() {
      try {
        const { GestureRecognizer, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        recognizerRef.current = recognizer;
        detectLoop();
      } catch (err) {
        console.error("Gesture engine failed to load", err);
        setGestureLabel("gesture engine unavailable");
      }
    }

    const DETECT_INTERVAL = 1000 / 15; // 15 FPS for gesture detection
    let lastDetectTime = 0;

    function detectLoop() {
      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      const detectNow = performance.now();
      if (video && recognizer && video.readyState >= 2 && (detectNow - lastDetectTime >= DETECT_INTERVAL)) {
        lastDetectTime = detectNow;
        const now = performance.now();
        const result = recognizer.recognizeForVideo(video, now);

        let isOpenPalm = false;
        if (result.gestures && result.gestures.length > 0) {
          const top = result.gestures[0][0];
          if (top.categoryName === "Open_Palm" && top.score > 0.65) isOpenPalm = true;
          setGestureLabel(top.categoryName.replace("_", " ").toLowerCase());
        } else {
          setGestureLabel("no hand");
        }
        setGestureActive(isOpenPalm);

        if (isOpenPalm) {
          activeFramesRef.current++;
        } else {
          activeFramesRef.current = 0;
        }

        if (activeFramesRef.current === 3 && now - lastTriggerRef.current > COOLDOWN_MS) {
          setStyleIndex((prev) => (prev + 1) % STYLES.length);
          lastTriggerRef.current = now;
        }
      }
      rafDetectRef.current = requestAnimationFrame(detectLoop);
    }

    boot();

    return () => {
      cancelled = true;
      if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
      if (rafDetectRef.current) cancelAnimationFrame(rafDetectRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recognizerRef.current && recognizerRef.current.close) recognizerRef.current.close();
    };
  }, []);

  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black ${className}`}>
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="w-full h-full block scale-x-[-1]" />

      {status === "ready" && (
        <>
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className="text-xs font-bold tracking-wide bg-black/50 border border-white/10 px-3 py-2 rounded-full backdrop-blur">
              GLOWAR STYLE
            </div>
            <div
              className={`text-xs font-semibold px-3 py-2 rounded-full border backdrop-blur transition-colors ${
                gestureActive
                  ? "text-emerald-300 border-emerald-400/50"
                  : "text-white/50 border-white/10"
              } bg-black/50`}
            >
              {gestureLabel}
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            <div className="text-[10px] tracking-widest uppercase text-white/50">
              Style {styleIndex + 1} / {STYLES.length}
            </div>
            <div className="text-2xl font-extrabold px-6 py-2 rounded-2xl bg-black/50 border border-white/10 backdrop-blur bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              {STYLES[styleIndex].name}
            </div>
          </div>
        </>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 text-center px-6">
          <div className="w-7 h-7 rounded-full border-[3px] border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-white/60 max-w-xs">
            Requesting camera access and loading the gesture model…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 text-center px-6">
          <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Camera access needed
          </h2>
          <p className="text-sm text-white/60 max-w-sm">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
