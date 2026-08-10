import { Edit2, ToggleLeft, Printer, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StockItem } from "../types";
import { useStockStore } from "../store";
import { buildItemDeepLink, generateQrDataUrl, triggerPrintSticker } from "../lib/qr";
import { StockQrCodeView } from "./StockQrCodeView";

export function ItemDetailHeader({
  item,
  actorId,
  openLoans,
  isOverdue,
  onEdit,
}: {
  item: StockItem;
  actorId: string;
  openLoans: number;
  isOverdue: boolean;
  onEdit?: () => void;
}) {
  const markInactive = useStockStore((s) => s.markItemInactive);
  const [quickPrintLoading, setQuickPrintLoading] = useState(false);
  const [printedFlash, setPrintedFlash] = useState(false);
  const quickQrDataRef = useRef<string | null>(null);
  const qrDeepLinkRef = useRef<string>(buildItemDeepLink(item.id));

  useEffect(() => {
    qrDeepLinkRef.current = buildItemDeepLink(item.id);
    quickQrDataRef.current = null;
  }, [item.id]);

  const handleQuickPrint = useCallback(async () => {
    if (quickPrintLoading) return;
    try {
      setQuickPrintLoading(true);
      if (!quickQrDataRef.current) {
        quickQrDataRef.current = await generateQrDataUrl(qrDeepLinkRef.current, 600);
      }
      triggerPrintSticker(item, quickQrDataRef.current);
      setPrintedFlash(true);
      window.setTimeout(() => setPrintedFlash(false), 1600);
    } finally {
      setQuickPrintLoading(false);
    }
  }, [quickPrintLoading, item]);

  return (
    <>
      <div className="surface-card p-5 rounded-lg">
        <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-2 justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  SKU {item.sku} · {item.category === "TOOLS" ? "Tool" : item.category === "CONSUMABLES" ? "Consumable" : "Other"}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight truncate">{item.name}</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!item.active ? (
                  <span className="chip bg-muted/50 text-muted-foreground">Inactive</span>
                ) : null}
                {isOverdue ? (
                  <span className="chip border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/15 text-[color:var(--color-p1)]">
                    Overdue loan
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

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">In stock</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums">
                  {item.qtyInStock} <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>
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
              <Button
                onClick={handleQuickPrint}
                variant="default"
                disabled={quickPrintLoading}
                className={printedFlash ? "ring-2 ring-success/60" : ""}
              >
                {printedFlash ? <CheckCircle2 className="size-4" /> : <Printer className="size-4" />}
                {printedFlash ? "Printed" : quickPrintLoading ? "Preparing…" : "Print sticker"}
              </Button>
              <StockQrCodeView item={item} mode="buttonDialog" buttonVariant="secondary" />
              <button
                type="button"
                onClick={onEdit}
                className={buttonVariants({ variant: "secondary" })}
                disabled={!onEdit || !item.active}
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
    </>
  );
}
