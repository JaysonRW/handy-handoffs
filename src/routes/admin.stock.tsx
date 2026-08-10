import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, ScanLine } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminShell } from "@/components/layout/AdminShell";
import { ShellActionsMenu } from "@/components/layout/ShellActionsMenu";
import { SyncIndicator } from "@/features/sync/SyncIndicator";
import { StockStatsBar } from "@/features/stock/components/StockStatsBar";
import {
  StockFilters,
  type StockFilterState,
} from "@/features/stock/components/StockFilters";
import { StockItemsList, useFilterIndexSets } from "@/features/stock/components/StockItemsList";
import { NewItemDialog } from "@/features/stock/components/NewItemDialog";
import { useStockStore } from "@/features/stock/store";
import type { StockItem } from "@/features/stock/types";

const ADMIN_ACTOR_ID = "u_admin";
type StockSearch = { filter?: StockFilterState["status"] };

const statusFromFilter: Record<Exclude<StockSearch["filter"], undefined>, StockFilterState["status"]> = {
  low: "LOW",
  loaned: "LOANED",
  overdue: "OVERDUE",
  active: "ACTIVE",
  all: "ALL",
  inactive: "INACTIVE",
};
const statusToFilter: Record<StockFilterState["status"], StockSearch["filter"] | undefined> = {
  LOW: "low",
  LOANED: "loaned",
  OVERDUE: "overdue",
  ACTIVE: "active",
  ALL: "all",
  INACTIVE: "inactive",
};

export const Route = createFileRoute("/admin/stock")({
  head: () => ({ meta: [{ title: "Stock · PMTMS Admin" }] }),
  validateSearch: (s): StockSearch => ({
    filter:
      typeof s.filter === "string" && Object.hasOwn(statusFromFilter, s.filter)
        ? (s.filter as StockSearch["filter"])
        : undefined,
  }),
  component: AdminStockIndex,
});

function AdminStockIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/stock" });
  const initialStatus = search.filter ? statusFromFilter[search.filter] : "ACTIVE";

  const [filters, setFilters] = useState<StockFilterState>({
    search: "",
    category: "ALL",
    status: initialStatus,
  });

  useEffect(() => {
    const next = search.filter ? statusFromFilter[search.filter] : "ACTIVE";
    setFilters((prev) => (prev.status === next ? prev : { ...prev, status: next }));
  }, [search.filter]);

  const { lowIds, loanedIds, overdueIds } = useFilterIndexSets();
  const lastError = useStockStore((s) => s.lastError);

  function handleChangeFilter(next: StockFilterState) {
    setFilters(next);
    const f = statusToFilter[next.status];
    navigate({
      to: "/admin/stock",
      search: f ? { filter: f as StockSearch["filter"] } : {},
      replace: true,
    });
  }

  const [newOpen, setNewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StockItem | null>(null);

  return (
    <AdminShell
      title="Stock control"
      subtitle="Tools, equipment and consumables. Scan QR to jump to an item. Tap a card to edit, the arrow → for full details."
      actions={
        <ShellActionsMenu
          menuLabel="Stock actions"
          items={[
            {
              key: "sync",
              label: "Sync status",
              labelOnly: true,
              node: <SyncIndicator />,
            },
            {
              key: "scan",
              label: "Scan QR",
              icon: ScanLine,
              href: "/admin/stock/scan",
              variant: "secondary",
            },
            {
              key: "new",
              label: "New item",
              icon: Plus,
              onClick: () => setNewOpen(true),
              variant: "default",
            },
          ]}
        >
          <SyncIndicator />
          <Link to="/admin/stock/scan" className={buttonVariants({ variant: "secondary" })}>
            <ScanLine className="size-4" /> Scan QR
          </Link>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New item
          </Button>
        </ShellActionsMenu>
      }
    >
      {lastError ? (
        <div className="mb-4 surface-card border border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/5 p-3 text-sm text-[color:var(--color-p1)] rounded-lg whitespace-pre-wrap">
          {lastError}
        </div>
      ) : null}

      <StockStatsBar />

      <div className="mt-6">
        <StockFilters
          value={filters}
          onChange={handleChangeFilter}
          lowItemIds={lowIds}
          loanedItemIds={loanedIds}
          overdueItemIds={overdueIds}
        />
      </div>

      <div className="mt-6">
        <StockItemsList filters={filters} onOpenEdit={(it) => setEditTarget(it)} />
      </div>

      <NewItemDialog open={newOpen} onOpenChange={setNewOpen} actorId={ADMIN_ACTOR_ID} />
      <NewItemDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        actorId={ADMIN_ACTOR_ID}
        editTarget={editTarget}
        onEditSaved={() => setEditTarget(null)}
      />
    </AdminShell>
  );
}
