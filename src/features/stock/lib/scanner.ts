import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export type CameraFacingMode = "environment" | "user";

export interface QrScannerState {
  status: "idle" | "starting" | "running" | "stopped" | "error";
  error: string | null;
  detected: string | null;
  clear: () => void;
  start: (facingMode?: CameraFacingMode) => Promise<void>;
  stop: () => Promise<void>;
  isSupported: boolean;
  hasPermission: boolean | "unknown";
}

const DEFAULT_ELEMENT_ID = "pmtms-qr-reader";

const START_DEBUG = false;

function debugLog(...args: unknown[]) {
  if (START_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[pmtms:scanner]", ...args);
  }
}

export function useQrScanner(
  elementId: string = DEFAULT_ELEMENT_ID,
  options?: { fps?: number; qrbox?: number },
): QrScannerState {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const lastStartTsRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "stopped" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | "unknown">("unknown");

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  useEffect(() => {
    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().catch(() => undefined);
      }
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, [elementId]);

  function buildScanOptions() {
    const w = options?.qrbox ?? 260;
    const h = options?.qrbox ?? 260;
    return {
      fps: options?.fps ?? 10,
      qrbox: { width: w, height: h },
      aspectRatio: 1.333,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      rememberLastUsedCamera: false,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
    };
  }

  async function start(facingMode: CameraFacingMode = "environment") {
    if (!isSupported) {
      const msg = "Camera API not available on this browser/device. Try Chrome, Edge or Safari 17.4+.";
      setError(msg);
      setStatus("error");
      throw new Error(msg);
    }
    const now = Date.now();
    if (now - lastStartTsRef.current < 750 && isRunningRef.current) {
      setStatus("running");
      return;
    }
    lastStartTsRef.current = now;
    try {
      setStatus("starting");
      setError(null);
      setDetected(null);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId, { verbose: START_DEBUG });
      } else if (isRunningRef.current) {
        setStatus("running");
        return;
      }

      const opts = buildScanOptions();
      const successCb = (decodedText: string) => {
        setDetected((prev) => (prev === decodedText ? prev : decodedText));
      };
      const errCb = () => undefined;

      const attempts: Array<{ label: string; exec: () => Promise<void> }> = [
        {
          label: "v3: Html5Qrcode.start with cameraIdConstraints + videoConfig inline",
          exec: () => {
            debugLog("attempt 1: facingMode ideal + videoConstraints inside config object");
            return (scannerRef.current as Html5Qrcode).start(
              { facingMode: { ideal: facingMode } } as any,
              {
                ...opts,
                videoConstraints: {
                  facingMode: { ideal: facingMode },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  aspectRatio: { ideal: 16 / 9 },
                  frameRate: { ideal: 30, max: 60 },
                },
              } as any,
              successCb,
              errCb,
            );
          },
        },
        {
          label: "v2: Html5Qrcode.start with plain facingMode string (legacy)",
          exec: () => {
            debugLog("attempt 2: start({facingMode:'env'}), opts only");
            return (scannerRef.current as Html5Qrcode).start(
              { facingMode } as any,
              opts as any,
              successCb,
              errCb,
            );
          },
        },
        {
          label: "v1: Html5Qrcode.start request permissions and auto pick first rear",
          exec: () => {
            debugLog("attempt 3: facingMode exact = environment");
            return (scannerRef.current as Html5Qrcode).start(
              { facingMode: { exact: facingMode } } as any,
              opts as any,
              successCb,
              errCb,
            );
          },
        },
      ];

      let lastErr: unknown = null;
      for (let i = 0; i < attempts.length; i++) {
        try {
          debugLog(`[${i + 1}/${attempts.length}] ${attempts[i].label}`);
          await attempts[i].exec();
          debugLog(`[${i + 1}/${attempts.length}] OK — started`);
          lastErr = null;
          break;
        } catch (e) {
          debugLog(`[${i + 1}/${attempts.length}] FAILED:`, e instanceof Error ? e.message : String(e));
          lastErr = e;
        }
      }
      if (lastErr) {
        debugLog("All 3 attempts failed. Last err:", lastErr);
        throw lastErr;
      }

      isRunningRef.current = true;
      setHasPermission(true);
      setStatus("running");
    } catch (err) {
      isRunningRef.current = false;
      const msg =
        err instanceof Error
          ? err.message.toLowerCase().includes("permission")
            ? "Camera permission denied. Allow camera access in your browser settings and refresh."
            : err.message.toLowerCase().includes("requested device") ||
                err.message.toLowerCase().includes("no camera") ||
                err.message.toLowerCase().includes("constraint") ||
                err.message.toLowerCase().includes("cannot read")
              ? `Camera start failed (${facingMode}). Try flipping camera or close other apps using camera.\n\n${err.message}`
              : err.message
          : String(err);
      debugLog("final error =>", msg);
      setError(msg);
      setHasPermission(
        err instanceof Error && err.message.toLowerCase().includes("permission") ? false : "unknown",
      );
      setStatus("error");
      throw err;
    }
  }

  async function stop() {
    if (!scannerRef.current) {
      setStatus("stopped");
      return;
    }
    try {
      await scannerRef.current.stop();
    } catch {
      // ignore
    } finally {
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      isRunningRef.current = false;
      setStatus("stopped");
    }
  }

  function clear() {
    setDetected(null);
    setError(null);
  }

  return {
    status,
    error,
    detected,
    clear,
    start,
    stop,
    isSupported,
    hasPermission,
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
