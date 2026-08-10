import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StockItem } from "../types";
import { buildItemDeepLink, generateQrDataUrl, triggerPrintSticker } from "../lib/qr";

export interface StockQrCodeViewProps {
  item: StockItem;
  mode?: "buttonDialog" | "inlineCard";
  size?: number;
  showDownload?: boolean;
  showPrint?: boolean;
  showLabelOrigin?: boolean;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost";
  className?: string;
  onPrinted?: () => void;
  onDownloaded?: () => void;
  autoGenerateInline?: boolean;
}

export function StockQrCodeView({
  item,
  mode = "buttonDialog",
  size = 600,
  showDownload = true,
  showPrint = true,
  showLabelOrigin = true,
  buttonVariant = "secondary",
  className,
  onPrinted,
  onDownloaded,
  autoGenerateInline = true,
}: StockQrCodeViewProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDeeplink, setQrDeeplink] = useState<string>(() => buildItemDeepLink(item.id));

  useEffect(() => {
    setQrDeeplink(buildItemDeepLink(item.id));
    setQrData(null);
  }, [item.id]);

  useEffect(() => {
    if (mode === "inlineCard" && autoGenerateInline && !qrData && !qrLoading) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoGenerateInline, qrDeeplink, item.id]);

  async function generate(): Promise<string | null> {
    if (qrData) return qrData;
    try {
      setQrLoading(true);
      const data = await generateQrDataUrl(qrDeeplink, size);
      setQrData(data);
      return data;
    } finally {
      setQrLoading(false);
    }
  }

  async function handleOpenQr() {
    if (qrData) {
      setQrOpen(true);
      return;
    }
    const data = await generate();
    if (data) setQrOpen(true);
  }

  function handleDownload() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `qrcode-${item.sku}-${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    onDownloaded?.();
  }

  function handlePrint() {
    if (!qrData) return;
    triggerPrintSticker(item, qrData);
    onPrinted?.();
  }

  const originLabel = showLabelOrigin
    ? (typeof window !== "undefined" ? window.location.origin : "PMTMS").replace(/^https?:\/\//, "")
    : null;

  if (mode === "inlineCard") {
    return (
      <div className={`w-full ${className ?? ""}`}>
        <div className="rounded-xl border border-border bg-background p-5 flex flex-col items-center gap-3">
          <div className="w-full text-left">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Item created successfully</p>
            <h3 className="mt-1 text-lg font-black tracking-tight truncate">{item.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              SKU <span className="font-mono">{item.sku}</span> · Qty <span className="font-mono">{item.qtyInStock} {item.unit}</span>
              {item.location ? <> · 📍 {item.location}</> : null}
            </p>
          </div>

          <div className="relative w-full max-w-[320px] aspect-square grid place-items-center rounded-xl border border-dashed border-border bg-muted/30 overflow-hidden">
            {qrLoading ? (
              <p className="text-xs text-muted-foreground">Generating QR sticker…</p>
            ) : qrData ? (
              <img
                src={qrData}
                alt={`QR code for ${item.sku}`}
                className="w-full h-full object-contain p-4 bg-white"
              />
            ) : (
              <Button variant="secondary" onClick={() => generate()}>
                <Printer className="size-4" /> Generate QR
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground break-all px-4 max-w-full text-center w-full truncate" title={qrDeeplink}>
            {qrDeeplink}
          </p>

          <div className="grid grid-cols-2 gap-2 w-full mt-1">
            {showDownload ? (
              <Button variant="secondary" onClick={handleDownload} disabled={!qrData}>
                <Download className="size-4" /> Download PNG
              </Button>
            ) : null}
            {showPrint ? (
              <Button onClick={handlePrint} disabled={!qrData}>
                <Printer className="size-4" /> Print sticker (58mm)
              </Button>
            ) : null}
          </div>

          {originLabel ? (
            <p className="mt-1 text-[10px] text-muted-foreground/80 tracking-wider uppercase">
              Scan with any camera · PMTMS · {originLabel}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <Button variant={buttonVariant} onClick={handleOpenQr} className={className}>
        <Printer className="size-4" /> {qrLoading ? "Generating…" : "QR &amp; print sticker"}
      </Button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR code sticker — {item.sku}</DialogTitle>
            <DialogDescription>
              Scan this QR from any mobile browser to jump directly to this item.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center gap-3 mt-1">
            {qrLoading ? (
              <div className="size-[320px] grid place-items-center border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">Generating QR…</p>
              </div>
            ) : (
              qrData && (
                <img
                  src={qrData}
                  alt={`QR ${item.sku}`}
                  className="size-[320px] max-w-full rounded-lg border border-border bg-white p-2"
                />
              )
            )}
            <p className="text-xs text-muted-foreground break-all px-4">{qrDeeplink}</p>
            {originLabel ? (
              <p className="text-[10px] text-muted-foreground/80 tracking-wider uppercase">
                PMTMS · {originLabel}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            {showDownload ? (
              <Button variant="secondary" onClick={handleDownload} disabled={!qrData}>
                <Download className="size-4" /> Download PNG
              </Button>
            ) : null}
            {showPrint ? (
              <Button onClick={handlePrint} disabled={!qrData}>
                <Printer className="size-4" /> Print sticker (58mm)
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
