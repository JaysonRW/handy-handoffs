import { useEffect, useRef, useState } from "react";

export type CameraFacingMode = "environment" | "user";

export interface QrScannerState {
  status: "idle" | "starting" | "running" | "stopped" | "error";
  error: string | null;
  detected: string | null;
  clear: () => void;
  start: (facingMode?: CameraFacingMode) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
  isSupported: boolean;
  hasPermission: boolean | "unknown";
  scanFromFile: (file: File) => Promise<string | null>;
  videoEl: HTMLVideoElement | null;
  canFileFallback: boolean;
}

export interface QrScannerOptions {
  fps?: number;
  qrboxSizePx?: number;
}

const VERBOSE = false;
function debug(...args: unknown[]) {
  if (VERBOSE) {
    // eslint-disable-next-line no-console
    console.log("[pmtms:qr-native]", ...args);
  }
}

function supportsBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in (window as unknown as Record<string, unknown>);
}

function supportsGetUserMedia(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      createImageBitmap(img)
        .then((bmp) => {
          URL.revokeObjectURL(url);
          resolve(bmp);
        })
        .catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function qrDetectViaBarcodeDetector(
  image: ImageBitmap | HTMLCanvasElement | HTMLVideoElement,
  formats = ["qr_code"],
): Promise<string | null> {
  if (!supportsBarcodeDetector()) return null;
  try {
    const Detector = (window as unknown as { BarcodeDetector: new (opts?: { formats: string[] }) => { detect: (img: unknown) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    const detector = new Detector({ formats });
    const codes = await detector.detect(image);
    if (codes && codes.length) {
      return codes[0].rawValue;
    }
    return null;
  } catch (e) {
    debug("BarcodeDetector.detect error:", e);
    return null;
  }
}

export function useQrScanner(
  videoElementId: string,
  options: QrScannerOptions = {},
): QrScannerState {
  const { fps = 10, qrboxSizePx = 260 } = options;

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastDetectAtRef = useRef(0);
  const isScanningRef = useRef(false);
  const isPausedRef = useRef(false);
  const lastStartTsRef = useRef(0);

  const [status, setStatus] = useState<QrScannerState["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | "unknown">("unknown");
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [canFileFallback] = useState<boolean>(() => supportsBarcodeDetector());

  const isSupported = supportsGetUserMedia();

  useEffect(() => {
    if (typeof document === "undefined") return;
    let container: HTMLElement | null = null;
    try {
      container = document.getElementById(videoElementId);
    } catch {
      container = null;
    }
    if (!container) return;

    let v = container.querySelector<HTMLVideoElement>("video");
    if (!v) {
      v = document.createElement("video");
      v.setAttribute("autoplay", "");
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.style.width = "100%";
      v.style.height = "100%";
      v.style.objectFit = "cover";
      v.style.background = "#000";
      container.appendChild(v);
    }
    let cv = container.querySelector<HTMLCanvasElement>("canvas");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.style.position = "absolute";
      cv.style.left = "-10000px";
      cv.style.width = "1px";
      cv.style.height = "1px";
      cv.style.opacity = "0";
      cv.style.pointerEvents = "none";
      cv.tabIndex = -1;
      container.appendChild(cv);
    }
    videoElRef.current = v;
    canvasElRef.current = cv;
    setVideoEl(v);
    return () => {
      cleanupStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoElementId]);

  function cleanupStream() {
    isScanningRef.current = false;
    isPausedRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      try {
        const s = streamRef.current;
        s.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (videoElRef.current) {
      try {
        videoElRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
  }

  async function detectLoopFrame(intervalMs: number, qrboxPx: number): Promise<void> {
    const video = videoElRef.current;
    const canvas = canvasElRef.current;
    if (!video || !canvas || !isScanningRef.current) return;
    if (isPausedRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        void detectLoopFrame(intervalMs, qrboxPx);
      });
      return;
    }
    try {
      const now = performance.now();
      if (now - lastDetectAtRef.current >= intervalMs && video.readyState >= 2) {
        lastDetectAtRef.current = now;
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (vw && vh) {
          const minSide = Math.min(vw, vh);
          const boxSize = Math.round(Math.min(minSide, qrboxPx * (minSide / 480)));
          const sx = Math.round((vw - boxSize) / 2);
          const sy = Math.round((vh - boxSize) / 2);
          canvas.width = boxSize;
          canvas.height = boxSize;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, sx, sy, boxSize, boxSize, 0, 0, boxSize, boxSize);
            const result = await qrDetectViaBarcodeDetector(canvas);
            if (result) {
              setDetected((prev) => (prev === result ? prev : result));
            }
          }
        }
      }
    } catch (e) {
      debug("frame detect error:", e);
    }
    if (isScanningRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        void detectLoopFrame(intervalMs, qrboxPx);
      });
    }
  }

  async function start(facingMode: CameraFacingMode = "environment") {
    const now = Date.now();
    if (now - lastStartTsRef.current < 750 && isScanningRef.current) {
      setStatus("running");
      return;
    }
    lastStartTsRef.current = now;
    try {
      setStatus("starting");
      setError(null);
      setDetected(null);

      if (!isSupported) {
        throw new Error("Camera not supported on this browser. Try Chrome, Edge, or Safari 17.4+.");
      }
      if (!videoElRef.current) {
        throw new Error("Video element not ready. Please refresh the page.");
      }
      if (!supportsBarcodeDetector()) {
        throw new Error(
          "Barcode detector not supported on this browser. Chrome Android 83+, Safari iOS 17.4+ required. Use 'Capture photo' fallback below.",
        );
      }

      cleanupStream();
      isPausedRef.current = false;
      setIsPaused(false);

      const idealWidth = 1280;
      const idealHeight = 720;
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
          frameRate: { ideal: 30, max: 60 },
        },
      };

      debug("requesting media stream:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      const video = videoElRef.current;
      video.srcObject = stream;
      try {
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
      } catch {
        // ignore
      }
      debug("calling play() on video");
      await video.play();
      debug("video play OK");
      isScanningRef.current = true;
      const intervalMs = 1000 / (fps || 10);
      setStatus("running");
      rafIdRef.current = requestAnimationFrame(() => {
        void detectLoopFrame(intervalMs, qrboxSizePx);
      });
    } catch (err) {
      cleanupStream();
      const msg =
        err instanceof Error
          ? err.message.toLowerCase().includes("permission") ||
              err.message.toLowerCase().includes("denied") ||
              err.message.toLowerCase().includes("notallowed")
            ? "Camera permission denied. Open browser settings → Site settings → Camera → Allow, then refresh."
            : err.message.toLowerCase().includes("notfound") ||
                err.message.toLowerCase().includes("device") ||
                err.message.toLowerCase().includes("overconstrained")
              ? `Camera not available (${facingMode}). Close other apps using camera and retry, or use the 'Capture photo' fallback.\n\n${err.message}`
              : err.message
          : String(err);
      debug("start failed:", msg);
      setError(msg);
      setHasPermission(
        err instanceof Error &&
        (err.name === "NotAllowedError" ||
          /permission|denied|notallowed/i.test(err.message))
          ? false
          : "unknown",
      );
      setStatus("error");
      throw err;
    }
  }

  async function stop() {
    cleanupStream();
    setIsPaused(false);
    setStatus("stopped");
  }

  function pause() {
    if (!isScanningRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
  }

  function resume() {
    if (!isScanningRef.current) return;
    lastDetectAtRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);
  }

  function clear() {
    setDetected(null);
    setError(null);
  }

  async function scanFromFile(file: File): Promise<string | null> {
    try {
      setError(null);
      const bmp = await fileToImageBitmap(file);
      const result = await qrDetectViaBarcodeDetector(bmp);
      if (result) {
        setDetected(result);
      } else {
        setError("Could not find a QR code in the photo. Try again with better lighting.");
      }
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    }
  }

  return {
    status,
    error,
    detected,
    clear,
    start,
    stop,
    pause,
    resume,
    isPaused,
    isSupported,
    hasPermission,
    scanFromFile,
    videoEl,
    canFileFallback,
  };
}

export function extractItemIdFromQr(
  text: string,
): { itemId: string; origin: string } | null {
  if (!text) return null;
  try {
    const url = new URL(text.trim());
    const match = url.pathname.match(/^\/admin\/stock\/([a-zA-Z0-9_-]+)\/?$/);
    if (match && match[1]) {
      return { itemId: match[1], origin: url.origin };
    }
    return null;
  } catch {
    return null;
  }
}
