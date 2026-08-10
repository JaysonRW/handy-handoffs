import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { StockCategory } from "../types";

export type StockFilterState = {
  search: string;
  category: StockCategory | "ALL";
  status: "ALL" | "ACTIVE" | "INACTIVE" | "LOANED" | "OVERDUE";
};

export function StockFilters({
  value,
  onChange,
  overdueItemIds,
  loanedItemIds,
}: {
  value: StockFilterState;
  onChange: (v: StockFilterState) => void;
  overdueItemIds: Set<string>;
  loanedItemIds: Set<string>;
}) {
  const [focus, setFocus] = useState(false);
  const statusBadges = useMemo(
    () => [
      { k: "ALL", label: "All" },
      { k: "ACTIVE", label: "Active" },
      { k: "LOANED", label: `Loaned (${loanedItemIds.size})` },
      { k: "OVERDUE", label: `Overdue (${overdueItemIds.size})` },
      { k: "INACTIVE", label: "Inactive" },
    ],
    [loanedItemIds, overdueItemIds],
  );

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Search by SKU, name, location, QR…"
            className={`w-full input pl-9 ${focus ? "ring-2 ring-primary/30" : ""}`}
          />
        </label>

        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value as StockFilterState["category"] })}
          className="input"
        >
          <option value="ALL">All categories</option>
          <option value="TOOLS">Tools / Equipment</option>
          <option value="CONSUMABLES">Consumables</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statusBadges.map((b) => {
          const active = value.status === b.k;
          return (
            <button
              key={b.k}
              type="button"
              onClick={() => onChange({ ...value, status: b.k as StockFilterState["status"] })}
              className={`chip cursor-pointer transition focus-ring ${
                active
                  ? "bg-primary text-primary-foreground border-primary/40"
                  : "hover:bg-surface-2 text-muted-foreground"
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
