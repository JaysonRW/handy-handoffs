import { Edit2, AlertTriangle, ToggleLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { StockItem } from "../types";
import { useStockStore } from "../store";
import { StockQrCodeView } from "./StockQrCodeView";

export function ItemDetailHeader({
  item,
  actorId,
  openLoans,
  isLowStock,
  isOverdue,
  onEdit,
}: {
  item: StockItem;
  actorId: string;
  openLoans: number;
  isLowStock: boolean;
  isOverdue: boolean;
  onEdit?: () => void;
}) {
  const markInactive = useStockStore((s) => s.markItemInactive);

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
              <StockQrCodeView item={item} />
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
