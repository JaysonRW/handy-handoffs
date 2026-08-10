import { Link } from "@tanstack/react-router";
import { ArrowRight, PackageOpen, AlertTriangle, UserCheck, ClockAlert } from "lucide-react";
import type { StockItem, StockLoan } from "../types";
import { cn } from "@/lib/utils";

export function StockItemCard({
  item,
  openLoans,
  isLowStock,
  isOverdue,
  onOpenEdit,
}: {
  item: StockItem;
  openLoans: StockLoan[];
  isLowStock: boolean;
  isOverdue: boolean;
  onOpenEdit?: (item: StockItem) => void;
}) {
  const available =
    item.category === "CONSUMABLES"
      ? item.qtyInStock
      : Math.max(0, item.qtyInStock - openLoans.length);

  const body = (
    <div className="min-w-0 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            SKU {item.sku} · {item.category === "TOOLS" ? "Tool" : item.category === "CONSUMABLES" ? "Consumable" : "Other"} · unit {item.unit}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 flex-wrap justify-end">
          {!item.active ? (
            <span className="chip bg-muted/50 text-muted-foreground">Inactive</span>
          ) : null}
          {isLowStock ? (
            <span className="chip border-accent/40 bg-accent/15 text-accent-foreground">
              <AlertTriangle className="size-3" /> Low
            </span>
          ) : null}
          {isOverdue ? (
            <span className="chip border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/15 text-[color:var(--color-p1)]">
              <ClockAlert className="size-3" /> Overdue
            </span>
          ) : openLoans.length > 0 ? (
            <span className="chip border-primary/30 bg-primary/10 text-primary">
              <UserCheck className="size-3" /> {openLoans.length} loaned
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">In stock</p>
          <p className="text-xl font-black tabular-nums">
            {item.qtyInStock}
            <span className="ml-1 text-sm font-medium text-muted-foreground">{item.unit}</span>
          </p>
        </div>
        {item.category === "TOOLS" ? (
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Available</p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                available === 0 ? "text-muted-foreground" : "text-success",
              )}
            >
              {available === 0 ? (
                <span className="inline-flex items-center gap-1">
                  <PackageOpen className="size-4" /> All out
                </span>
              ) : (
                `${available} of ${item.qtyInStock}`
              )}
            </p>
          </div>
        ) : null}
      </div>

      {item.location ? (
        <p className="mt-3 text-xs text-muted-foreground truncate">📍 {item.location}</p>
      ) : null}

      {openLoans.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {openLoans.slice(0, 2).map((l) => (
            <li key={l.id} className="text-xs text-muted-foreground truncate">
              <UserCheck className="inline size-3 mr-1 align-text-bottom" />
              {l.borrowerName}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (onOpenEdit) {
    return (
      <div className="surface-card hover:border-primary/40 hover:bg-surface-2 transition focus-ring rounded-lg p-4 relative group flex flex-col">
        <button
          type="button"
          onClick={() => onOpenEdit(item)}
          className="w-full text-left min-h-[120px] pr-10"
          aria-label={`Edit ${item.name}`}
        >
          {body}
        </button>
        <Link
          to={`/admin/stock/${item.id}` as any}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground transition focus-ring"
          aria-label={`Open ${item.name} details`}
          title="Open details"
        >
          <ArrowRight className="size-5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <Link
      to={`/admin/stock/${item.id}` as any}
      className="surface-card p-4 hover:border-primary/40 hover:bg-surface-2 transition focus-ring group rounded-lg"
    >
      {body}
    </Link>
  );
}
