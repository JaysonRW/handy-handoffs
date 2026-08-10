import { useMemo } from "react";
import { useStockStore, lowStockItems, overdueLoans, openLoansForItem } from "../store";
import { StockItemCard } from "./StockItemCard";
import type { StockFilterState } from "./StockFilters";
import type { StockItem } from "../types";

export function StockItemsList({
  filters,
  onOpenEdit,
}: {
  filters: StockFilterState;
  onOpenEdit?: (item: StockItem) => void;
}) {
  const items = useStockStore((s) => s.items);
  const loans = useStockStore((s) => s.loans);
  const lastError = useStockStore((s) => s.lastError);
  const hydrated = useStockStore((s) => s.hydratedFromServerAt);

  const { lowIds, loanedIds, overdueIds, rows } = useMemo(() => {
    const low = new Set(lowStockItems(items).map((i) => i.id));
    const overdueLoansArr = overdueLoans(loans);
    const overdue = new Set(overdueLoansArr.map((l) => l.itemId));
    const loaned = new Set(loans.filter((l) => !l.returnedAt).map((l) => l.itemId));

    const q = filters.search.trim().toLowerCase();
    const filtered = items.filter((i) => {
      if (filters.category !== "ALL" && i.category !== filters.category) return false;
      switch (filters.status) {
        case "ACTIVE":
          if (!i.active) return false;
          break;
        case "INACTIVE":
          if (i.active) return false;
          break;
        case "LOW":
          if (!low.has(i.id)) return false;
          break;
        case "LOANED":
          if (!loaned.has(i.id)) return false;
          break;
        case "OVERDUE":
          if (!overdue.has(i.id)) return false;
          break;
      }
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.qrCodeId.toLowerCase().includes(q) ||
        (i.location ?? "").toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
      );
    });

    return { lowIds: low, loanedIds: loaned, overdueIds: overdue, rows: filtered };
  }, [items, loans, filters]);

  if (!hydrated) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Syncing stock from Supabase…</p>
        {lastError ? (
          <p className="mt-2 text-xs text-[color:var(--color-p1)] whitespace-pre-wrap">
            {lastError}
          </p>
        ) : (
          <p className="mt-1 text-xs">If stuck, confirm the stock tables + RLS policies are applied.</p>
        )}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No items match this filter.</p>
        <p className="mt-1 text-xs">Try clearing the search or switch status/category. Click “New item” to add your first.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((item) => (
        <StockItemCard
          key={item.id}
          item={item}
          openLoans={openLoansForItem(loans, item.id)}
          isLowStock={lowIds.has(item.id)}
          isOverdue={overdueIds.has(item.id)}
          onOpenEdit={onOpenEdit}
        />
      ))}
    </div>
  );
}

export function useFilterIndexSets() {
  const items = useStockStore((s) => s.items);
  const loans = useStockStore((s) => s.loans);
  return useMemo(() => {
    const lowIds = new Set(lowStockItems(items).map((i) => i.id));
    const overdueIds = new Set(overdueLoans(loans).map((l) => l.itemId));
    const loanedIds = new Set(loans.filter((l) => !l.returnedAt).map((l) => l.itemId));
    return { lowIds, overdueIds, loanedIds };
  }, [items, loans]);
}
