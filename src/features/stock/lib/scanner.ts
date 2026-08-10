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

export function useQrScanner(
  elementId: string = DEFAULT_ELEMENT_ID,
  options?: { fps?: number; qrbox?: number },
): QrScannerState {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
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

  async function start(facingMode: CameraFacingMode = "environment") {
    if (!isSupported) {
      const msg = "Camera API not available on this browser/device. Try Chrome, Edge or Safari 17.4+.";
      setError(msg);
      setStatus("error");
      throw new Error(msg);
    }
    try {
      setStatus("starting");
      setError(null);
      setDetected(null);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId, {
          verbose: false,
        });
      } else if (isRunningRef.current) {
        setStatus("running");
        return;
      }

      await scannerRef.current.start(
        { facingMode },
        {
          fps: options?.fps ?? 10,
          qrbox: {
            width: options?.qrbox ?? 260,
            height: options?.qrbox ?? 260,
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setDetected((prev) => (prev === decodedText ? prev : decodedText));
        },
        () => {
          // per-frame scan error — ignore, decoder is blind until next frame
        },
      );
      isRunningRef.current = true;
      setHasPermission(true);
      setStatus("running");
    } catch (err) {
      isRunningRef.current = false;
      const msg =
        err instanceof Error
          ? err.message.toLowerCase().includes("permission")
            ? "Camera permission denied. Allow camera access in your browser settings and refresh."
            : err.message
          : String(err);
      setError(msg);
      setHasPermission(false);
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
