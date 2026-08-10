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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  extractItemIdFromQr,
  useQrScanner,
  type CameraFacingMode,
} from "@/features/stock/lib/scanner";
import { useStockStore } from "@/features/stock/store";
import { buildItemDeepLink } from "@/features/stock/lib/qr";

export const Route = createFileRoute("/admin/stock/scan")({
  head: () => ({ meta: [{ title: "Scan QR · PMTMS Admin" }] }),
  component: AdminStockScan,
});

const ACTOR_ID = "u_admin";
const SCANNER_EL_ID = "pmtms-qr-reader-scan";

function AdminStockScan() {
  const navigate = useNavigate({ from: "/admin/stock/scan" });
  const items = useStockStore((s) => s.items);
  const hydratePromiseRef = useRef<Promise<unknown> | null>(null);

  const {
    status,
    error,
    detected,
    clear,
    start,
    stop,
    isSupported,
    hasPermission,
  } = useQrScanner(SCANNER_EL_ID, { fps: 10, qrbox: 260 });

  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");
  const [navigating, setNavigating] = useState(false);
  const [lastInvalid, setLastInvalid] = useState<string | null>(null);
  const [goNavigating, setGoNavigating] = useState(false);

  useEffect(() => {
    if (status !== "running") return;
    return () => {
      stop().catch(() => undefined);
    };
  }, [status, stop]);

  useEffect(() => {
    if (goNavigating) {
      start(facingMode).catch(() => undefined);
      setGoNavigating(false);
    }
  }, [goNavigating, facingMode, start]);

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
    setGoNavigating(true);
  }

  function handleToggleFacing() {
    const next: CameraFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    stop()
      .catch(() => undefined)
      .then(() => {
        return start(next).catch(() => undefined);
      });
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
    const ev = { target: { value: deep } } as any;
    setGoNavigating(false);
    setTimeout(() => {
      // Trigger via setDetected-like hook using our internal setter isn't exposed; use a manual navigate instead
      setNavigating(true);
      navigate({
        to: "/admin/stock/$itemId",
        params: { itemId: first.id },
        replace: false,
      });
      void ev;
    }, 250);
  }

  const canScan = isSupported && (status === "running" || status === "starting");

  return (
    <AdminShell userId={ACTOR_ID} title="Scan QR" subtitle="Point the camera at a printed PMTMS stock sticker">
      <div className="mx-auto max-w-3xl w-full px-4 py-8">
        <div className="mb-5">
          <Link
            to="/admin/stock"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Back to stock
          </Link>
        </div>

        <div className="surface-card p-6 rounded-xl border-primary/25 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-70" />

          <div className="flex items-start gap-4 mb-5">
            <div className="size-14 grid place-items-center rounded-xl bg-primary/15 border border-primary/30 text-primary shrink-0">
              <ScanLine className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black tracking-tight">QR camera scanner</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Works on Safari iOS 17.4+, Android Chrome, Edge and desktop. Requires HTTPS (localhost is trusted).
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md bg-black rounded-2xl overflow-hidden border border-border shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]">
            <div
              id={SCANNER_EL_ID}
              className="w-full aspect-square bg-surface-2/70"
              aria-label="QR code camera scanner"
            />

            {status === "starting" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm text-white text-center p-4">
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
              <div className="absolute inset-0 grid place-items-center bg-black/75 backdrop-blur-sm text-white text-center p-5">
                <div>
                  <CameraOff className="size-9 mx-auto mb-2 text-[color:var(--color-p1)]" />
                  <p className="text-sm font-bold text-[color:var(--color-p1)]">Camera unavailable</p>
                  <p className="text-xs mt-2 opacity-90 break-words">{error}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button variant="secondary" onClick={handleRetryPerm}>
                      <RotateCcw className="size-4" /> Retry
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {status === "idle" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm text-white text-center p-5">
                <div>
                  <Camera className="size-9 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Camera off</p>
                  <p className="text-xs opacity-80 mt-1 max-w-xs mx-auto">
                    Click <span className="font-semibold">Start camera</span> below. On first visit,
                    browser will ask for permission.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="default"
                      onClick={() => setGoNavigating(true)}
                      disabled={!isSupported || navigating}
                    >
                      <Camera className="size-4" /> Start camera
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {status === "running" ? (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[65%] max-w-[260px] rounded-xl border-2 border-dashed border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <div className="absolute -top-0.5 -left-0.5 size-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                  <div className="absolute -top-0.5 -right-0.5 size-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                  <div className="absolute -bottom-0.5 -left-0.5 size-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                  <div className="absolute -bottom-0.5 -right-0.5 size-5 border-b-2 border-r-2 border-primary rounded-br-md" />
                  <div className="absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanline_2.2s_ease-in-out_infinite]" />
                </div>
              </div>
            ) : null}

            <style>{`
              @keyframes scanline {
                0% { transform: translateY(0); opacity: 0.05; }
                10% { opacity: 0.9; }
                90% { opacity: 0.9; }
                50% { transform: translateY(150px); }
                100% { transform: translateY(0); opacity: 0.05; }
              }
            `}</style>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {status === "running" ? (
              <>
                <Button variant="secondary" onClick={() => stop().catch(() => undefined)}>
                  <CameraOff className="size-4" /> Pause
                </Button>
                <Button variant="ghost" onClick={handleToggleFacing}>
                  <SwitchCamera className="size-4" /> Flip camera
                </Button>
              </>
            ) : status === "stopped" || status === "error" ? (
              <Button onClick={handleRetryPerm}>
                <Camera className="size-4" /> Resume camera
              </Button>
            ) : status === "idle" ? (
              <Button onClick={() => setGoNavigating(true)} disabled={!isSupported || navigating}>
                <Camera className="size-4" /> Start camera
              </Button>
            ) : null}
            <button
              type="button"
              className={buttonVariants({ variant: "ghost" })}
              onClick={simulateDemoItem}
            >
              <CheckCircle2 className="size-4" /> Test with first item (demo)
            </button>
          </div>

          {!isSupported ? (
            <UnsupportedBanner />
          ) : null}

          {hasPermission === false && status !== "error" ? (
            <p className="mt-4 text-xs text-[color:var(--color-p1)] text-center">
              <AlertTriangle className="inline size-3.5 mr-1 align-text-bottom" />
              Permission was denied. Reset camera permissions in your browser settings and refresh.
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
                    Expected format: <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : "<your-domain>"}/admin/stock/&lt;item-id&gt;</span>
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

          <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">How to get QRs</p>
              <p>Open any item and click <span className="font-medium text-foreground">QR & print sticker</span>.</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">Sticker size</p>
              <p>58mm width · fits any thermal label printer. Print on matte for best scan.</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border/60">
              <p className="font-semibold text-foreground text-sm mb-1">Doesn&apos;t scan?</p>
              <p>Adjust distance (10–25 cm), clean lens, ensure room lighting and no glare on sticker.</p>
            </div>
          </div>
        </div>
      </div>
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
            This device or browser does not expose <code className="font-mono bg-black/10 px-1 rounded">navigator.mediaDevices.getUserMedia()</code>.
            Reasons can be: running on plain HTTP (not localhost or HTTPS), old iOS Safari (&lt; 17.4), running inside a WebView without permission, or a third-party cookie blocker blocking the camera frame.
          </p>
          <div className="mt-3 text-xs flex flex-wrap gap-2">
            <span className="chip border-accent/40">Safari 17.4+</span>
            <span className="chip border-accent/40">Chrome 100+</span>
            <span className="chip border-accent/40">HTTPS or localhost</span>
          </div>
        </div>
      </div>
    </div>
  );
}
