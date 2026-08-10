import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  SwitchCamera,
  Info,
  X,
  Camera as CameraIconPhoto,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  extractItemIdFromQr,
  useQrScanner,
  type CameraFacingMode,
} from "@/features/stock/lib/scanner";
import { useStockStore } from "@/features/stock/store";
import { buildItemDeepLink } from "@/features/stock/lib/qr";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/stock/scan")({
  head: () => ({ meta: [{ title: "Scan QR · PMTMS Admin" }] }),
  component: AdminStockScan,
});

const SCANNER_EL_ID = "pmtms-qr-reader-scan";

function AdminStockScan() {
  const navigate = useNavigate({ from: "/admin/stock/scan" });
  const items = useStockStore((s) => s.items);
  const hydratePromiseRef = useRef<Promise<unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    status,
    error,
    detected,
    clear,
    start,
    stop,
    isSupported,
    hasPermission,
    scanFromFile,
    canFileFallback,
  } = useQrScanner(SCANNER_EL_ID, { fps: 10, qrboxSizePx: 260 });

  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");
  const [navigating, setNavigating] = useState(false);
  const [lastInvalid, setLastInvalid] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (status !== "running") return;
    return () => {
      stop().catch(() => undefined);
    };
  }, [status, stop]);

  useEffect(() => {
    if (pendingStart) {
      start(facingMode)
        .catch(() => undefined)
        .finally(() => setPendingStart(false));
    }
  }, [pendingStart, facingMode, start]);

  useEffect(() => {
    if (!detected) return;
    const parsed = extractItemIdFromQr(detected);
    if (!parsed) {
      setLastInvalid(detected);
      return;
    }
    const exists = items.some((i) => i.id === parsed.itemId);
    if (!exists) {
      const hydrate = useStockStore.getState();
      if ("hydrateFromServer" in hydrate && typeof hydrate.hydrateFromServer === "function") {
        if (!hydratePromiseRef.current) {
          hydratePromiseRef.current = Promise.resolve()
            .then(() => (hydrate as any).hydrateFromServer("qr-miss-fallback"))
            .then(() => {
              const items2 = useStockStore.getState().items;
              const exist2 = items2.some((i) => i.id === parsed.itemId);
              if (exist2) {
                setNavigating(true);
                navigate({
                  to: "/admin/stock/$itemId",
                  params: { itemId: parsed.itemId },
                  replace: false,
                });
              } else {
                setLastInvalid(`${parsed.itemId} (not in stock list — try refreshing)`);
              }
            })
            .finally(() => {
              hydratePromiseRef.current = null;
            });
        }
      } else {
        setLastInvalid(`${parsed.itemId} (not found in stock)`);
      }
      return;
    }
    setNavigating(true);
    navigate({
      to: "/admin/stock/$itemId",
      params: { itemId: parsed.itemId },
      replace: false,
    });
  }, [detected, items, navigate]);

  function handleRetryPerm() {
    clear();
    setLastInvalid(null);
    setPendingStart(true);
  }

  function handleToggleFacing() {
    const next: CameraFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    stop()
      .catch(() => undefined)
      .then(() => setPendingStart(true));
  }

  function simulateDemoItem() {
    const first = items[0];
    if (!first) {
      setLastInvalid("No items in stock yet — create at least one item first.");
      return;
    }
    const deep = buildItemDeepLink(first.id);
    clear();
    setLastInvalid(null);
    setTimeout(() => {
      setNavigating(true);
      navigate({
        to: "/admin/stock/$itemId",
        params: { itemId: first.id },
        replace: false,
      });
    }, 250);
    void deep;
  }

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await scanFromFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canScan = isSupported && (status === "running" || status === "starting");

  return (
    <AdminShell
      title="Scan QR"
      subtitle="Point camera at a printed PMTMS stock sticker"
      actions={
        <button
          type="button"
          className={buttonVariants({ variant: "secondary", size: "icon" })}
          onClick={() => setInfoOpen(true)}
          aria-label="Show scanner tips"
          title="Tips & help"
        >
          <Info className="size-5" />
        </button>
      }
    >
      <div className="w-full -mx-4 sm:mx-0 px-0 sm:px-0 py-0 sm:py-6 min-h-[calc(100dvh-160px)] grid grid-rows-[auto_1fr_auto] gap-4">
        <div className="px-4 sm:px-0 pt-3 sm:pt-0">
          <Link
            to="/admin/stock"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Back to stock
          </Link>
        </div>

        <div className="surface-card rounded-b-none sm:rounded-xl border-t sm:border border-primary/25 relative overflow-hidden px-4 py-5 sm:p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-70" />

          <div className="hidden sm:flex items-start gap-4 mb-5">
            <div className="size-14 grid place-items-center rounded-xl bg-primary/15 border border-primary/30 text-primary shrink-0">
              <ScanLine className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black tracking-tight">QR camera scanner</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Native browser APIs — no plugins. Works on Safari iOS 17.4+, Chrome Android 83+, Edge and desktop.
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md bg-black rounded-2xl overflow-hidden border border-border shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]">
            <div
              id={SCANNER_EL_ID}
              className="w-full aspect-[4/5] sm:aspect-square bg-surface-2/70 relative"
              aria-label="QR code camera scanner"
            />

            {status === "starting" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm text-white text-center p-4 z-20">
                <div>
                  <Camera className="size-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-semibold">Starting camera…</p>
                  <p className="text-xs opacity-80 mt-1">
                    Accept the browser permission prompt when it appears.
                  </p>
                </div>
              </div>
            ) : null}

            {status === "error" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/75 backdrop-blur-sm text-white text-center p-5 z-20">
                <div>
                  <CameraOff className="size-9 mx-auto mb-2 text-[color:var(--color-p1)]" />
                  <p className="text-sm font-bold text-[color:var(--color-p1)]">Camera unavailable</p>
                  <p className="text-xs mt-2 opacity-90 whitespace-pre-wrap break-words">{error}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button variant="secondary" onClick={handleRetryPerm}>
                      <RotateCcw className="size-4" /> Retry
                    </Button>
                    {canFileFallback ? (
                      <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <CameraIconPhoto className="size-4" /> Capture photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {status === "idle" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm text-white text-center p-5 z-20">
                <div>
                  <Camera className="size-9 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Camera off</p>
                  <p className="text-xs opacity-80 mt-1 max-w-xs mx-auto">
                    Click <span className="font-semibold">Start camera</span> below. On first visit,
                    browser will ask for permission.
                  </p>
                </div>
              </div>
            ) : null}

            {status === "running" ? (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[72%] sm:size-[65%] max-w-[260px] rounded-xl border-2 border-dashed border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <div className="absolute -top-0.5 -left-0.5 size-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                  <div className="absolute -top-0.5 -right-0.5 size-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                  <div className="absolute -bottom-0.5 -left-0.5 size-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                  <div className="absolute -bottom-0.5 -right-0.5 size-5 border-b-2 border-r-2 border-primary rounded-br-md" />
                  <div className={cn("absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent")}
                    style={{ animation: "scanlineNative 2.2s ease-in-out infinite" }} />
                </div>
              </div>
            ) : null}

            <style>{`
              @keyframes scanlineNative {
                0% { transform: translateY(0); opacity: 0.05; }
                10% { opacity: 0.9; }
                90% { opacity: 0.9; }
                50% { transform: translateY(180px); }
                100% { transform: translateY(0); opacity: 0.05; }
              }
            `}</style>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePickPhoto}
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {status === "running" ? (
              <>
                <Button variant="secondary" onClick={() => stop().catch(() => undefined)}>
                  <CameraOff className="size-4" /> Pause
                </Button>
                <Button variant="ghost" onClick={handleToggleFacing}>
                  <SwitchCamera className="size-4" /> Flip camera
                </Button>
                {canFileFallback ? (
                  <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    <CameraIconPhoto className="size-4" /> Photo
                  </Button>
                ) : null}
              </>
            ) : status === "stopped" || status === "error" ? (
              <>
                <Button onClick={handleRetryPerm}>
                  <Camera className="size-4" /> Resume camera
                </Button>
                {canFileFallback ? (
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <CameraIconPhoto className="size-4" /> Capture photo
                  </Button>
                ) : null}
              </>
            ) : status === "idle" ? (
              <>
                <Button onClick={() => setPendingStart(true)} disabled={!isSupported || navigating}>
                  <Camera className="size-4" /> Start camera
                </Button>
                {canFileFallback ? (
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <CameraIconPhoto className="size-4" /> Capture photo
                  </Button>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className={buttonVariants({ variant: "ghost" })}
              onClick={simulateDemoItem}
            >
              <CheckCircle2 className="size-4" /> Test with first item
            </button>
          </div>

          {!isSupported ? (
            <UnsupportedBanner />
          ) : null}

          {hasPermission === false && status !== "error" ? (
            <p className="mt-4 text-xs text-[color:var(--color-p1)] text-center">
              <AlertTriangle className="inline size-3.5 mr-1 align-text-bottom" />
              Permission was denied. Reset camera permissions in your browser settings and refresh,
              or use &quot;Capture photo&quot; fallback.
            </p>
          ) : null}

          {lastInvalid ? (
            <div className="mt-4 surface-card border border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/5 p-3 rounded-lg text-xs text-[color:var(--color-p1)]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">QR format not recognized or item unknown</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] opacity-90">
                    {lastInvalid.length > 180 ? lastInvalid.slice(0, 180) + "…" : lastInvalid}
                  </p>
                  <p className="mt-1 opacity-90">
                    Expected format:{" "}
                    <span className="font-mono">
                      {typeof window !== "undefined" ? window.location.origin : "<your-domain>"}
                      /admin/stock/{"<item-id>"}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="mt-2 underline hover:no-underline font-medium"
                    onClick={() => setLastInvalid(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {detected && !lastInvalid && !navigating ? (
            <div className="mt-4 surface-card border border-success/40 bg-success/5 p-3 rounded-lg text-xs text-success">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">QR recognized — navigating…</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] opacity-90">{detected}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-5" /> Scanner tips &amp; help
            </DialogTitle>
            <DialogDescription>
              Everything you need to scan PMTMS stock QR stickers successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm sm:text-xs text-muted-foreground sm:grid-cols-3 mt-2">
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">How to get QRs</p>
              <p>
                Open any item and click{" "}
                <span className="font-medium text-foreground">QR &amp; print sticker</span>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">Sticker size</p>
              <p>58mm width · fits any thermal label printer. Print on matte for best scan.</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">Doesn&apos;t scan?</p>
              <p>
                Try &quot;Capture photo&quot; button instead — works in every phone even if
                live camera is blocked.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-end justify-stretch mt-4">
            <Button onClick={() => setInfoOpen(false)}>
              <X className="size-4" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function UnsupportedBanner() {
  return (
    <div className="mt-5 surface-card border border-accent/40 bg-accent/10 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 mt-0.5 text-accent-foreground" />
        <div className="flex-1 text-sm">
          <p className="font-bold text-accent-foreground">Camera API not available</p>
          <p className="mt-1 text-accent-foreground/90 text-xs">
            This device or browser does not expose{" "}
            <code className="font-mono bg-black/10 px-1 rounded">navigator.mediaDevices.getUserMedia()</code>.
            Reasons can be: running on plain HTTP (not localhost or HTTPS), old iOS Safari (&lt;
            17.4), running inside a WebView without permission, or a third-party cookie blocker
            blocking the camera frame.
          </p>
          <div className="mt-3 text-xs flex flex-wrap gap-2">
            <span className="chip border-accent/40">Safari 17.4+</span>
            <span className="chip border-accent/40">Chrome 83+</span>
            <span className="chip border-accent/40">HTTPS or localhost</span>
            <span className="chip border-accent/40">BarcodeDetector required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
