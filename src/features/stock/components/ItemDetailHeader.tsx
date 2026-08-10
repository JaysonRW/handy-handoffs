import { useEffect, useState } from "react";
import { Download, Printer, AlertTriangle, Edit2, ToggleLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { StockItem } from "../types";
import { buildItemDeepLink, generateQrDataUrl, triggerPrintSticker } from "../lib/qr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStockStore } from "../store";

export function ItemDetailHeader({
  item,
  actorId,
  openLoans,
  isLowStock,
  isOverdue,
}: {
  item: StockItem;
  actorId: string;
  openLoans: number;
  isLowStock: boolean;
  isOverdue: boolean;
}) {
  const markInactive = useStockStore((s) => s.markItemInactive);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDeeplink, setQrDeeplink] = useState<string>(buildItemDeepLink(item.id));

  useEffect(() => {
    setQrDeeplink(buildItemDeepLink(item.id));
    setQrData(null);
  }, [item.id]);

  async function handleOpenQr() {
    if (qrData) {
      setQrOpen(true);
      return;
    }
    try {
      setQrLoading(true);
      const data = await generateQrDataUrl(qrDeeplink, 600);
      setQrData(data);
      setQrOpen(true);
    } finally {
      setQrLoading(false);
    }
  }

  function handleDownload() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `qrcode-${item.sku}-${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handlePrint() {
    if (!qrData) return;
    triggerPrintSticker(item, qrData);
  }

  return (
    <>
      <div className="surface-card p-5 rounded-lg">
        <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-2 justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  SKU {item.sku} · {item.category === "TOOLS" ? "Tool" : item.category === "CONSUMABLES" ? "Consumable" : "Other"} · unit {item.unit}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight truncate">{item.name}</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!item.active ? (
                  <span className="chip bg-muted/50 text-muted-foreground">Inactive</span>
                ) : null}
                {isLowStock ? (
                  <span className="chip border-accent/40 bg-accent/15 text-accent-foreground">
                    <AlertTriangle className="size-3" /> Low stock
                  </span>
                ) : null}
                {isOverdue ? (
                  <span className="chip border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/15 text-[color:var(--color-p1)]">
                    <AlertTriangle className="size-3" /> Overdue loan
                  </span>
                ) : openLoans > 0 ? (
                  <span className="chip border-primary/30 bg-primary/10 text-primary">
                    {openLoans} on loan
                  </span>
                ) : null}
              </div>
            </div>

            {item.description ? (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">In stock</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums">
                  {item.qtyInStock} <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Min. level</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {item.minStockLevel === undefined || item.minStockLevel === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${item.minStockLevel} ${item.unit}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Location</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {item.location?.trim() ? <span>📍 {item.location}</span> : <span className="text-muted-foreground">Not set</span>}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={handleOpenQr} variant="secondary">
                <Printer className="size-4" /> {qrLoading ? "Generating QR…" : "QR & print sticker"}
              </Button>
              <button
                type="button"
                disabled
                className={buttonVariants({ variant: "secondary" }) + " cursor-not-allowed opacity-60"}
                title="Coming soon: edit item in-place"
              >
                <Edit2 className="size-4" /> Edit
              </button>
              {item.active ? (
                <button
                  type="button"
                  onClick={() => markInactive(item.id, actorId)}
                  className={buttonVariants({ variant: "ghost" }) + " text-muted-foreground hover:text-foreground"}
                >
                  <ToggleLeft className="size-4" /> Mark inactive
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              QR ID: <span className="font-mono">{item.qrCodeId}</span>
              {item.nfcTagId ? (
                <>
                  {"  ·  "}NFC tag: <span className="font-mono">{item.nfcTagId}</span>
                </>
              ) : null}
            </p>
        </div>
      </div>

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
              qrData && <img src={qrData} alt={`QR ${item.sku}`} className="size-[320px] max-w-full rounded-lg border border-border bg-white p-2" />
            )}
            <p className="text-xs text-muted-foreground break-all px-4">{qrDeeplink}</p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={handleDownload} disabled={!qrData}>
              <Download className="size-4" /> Download PNG
            </Button>
            <Button onClick={handlePrint} disabled={!qrData}>
              <Printer className="size-4" /> Print sticker (58mm)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
