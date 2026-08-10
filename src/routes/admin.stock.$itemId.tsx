import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { useStockStore, lowStockItems, overdueLoans, openLoansForItem } from "@/features/stock/store";
import { useMemo, useState } from "react";
import { ItemDetailHeader } from "@/features/stock/components/ItemDetailHeader";
import { ItemActions } from "@/features/stock/components/ItemActions";
import { MovementHistory } from "@/features/stock/components/MovementHistory";
import { LoanHistory } from "@/features/stock/components/LoanHistory";
import { NewItemDialog } from "@/features/stock/components/NewItemDialog";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/stock/$itemId")({
  component: AdminStockItemDetail,
});

const ACTOR_ID = "u_admin";

function AdminStockItemDetail() {
  const { itemId } = Route.useParams();
  const items = useStockStore((s) => s.items);
  const movements = useStockStore((s) => s.movements);
  const loans = useStockStore((s) => s.loans);

  const item = items.find((i) => i.id === itemId);
  const [editOpen, setEditOpen] = useState(false);

  const { itemMovements, itemLoans, openLoans, isLowStock, isOverdue } = useMemo(() => {
    if (!item) return { itemMovements: [], itemLoans: [], openLoans: [], isLowStock: false, isOverdue: false };
    const mv = movements
      .filter((m) => m.itemId === item.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const ln = loans
      .filter((l) => l.itemId === item.id)
      .sort((a, b) => new Date(b.loanedAt).getTime() - new Date(a.loanedAt).getTime());
    const open = openLoansForItem(ln, item.id);
    const low = lowStockItems([item]).length > 0;
    const anyOverdue = overdueLoans(open).length > 0;
    return { itemMovements: mv, itemLoans: ln, openLoans: open, isLowStock: low, isOverdue: anyOverdue };
  }, [item, movements, loans]);

  if (!item) throw notFound();

  return (
    <AdminShell title={item.name} subtitle={`SKU · ${item.sku}`}>
      <div className="mx-auto max-w-6xl w-full space-y-5 px-4 py-6">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/stock"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Back to stock
          </Link>
        </div>

        <ItemDetailHeader
          item={item}
          actorId={ACTOR_ID}
          openLoans={openLoans.length}
          isLowStock={isLowStock}
          isOverdue={isOverdue}
          onEdit={() => setEditOpen(true)}
        />

        <ItemActions item={item} loans={itemLoans} actorId={ACTOR_ID} />

        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-5">
            <MovementHistory movements={itemMovements} />
          </div>
          <div className="lg:col-span-2 space-y-5">
            <LoanHistory loans={itemLoans} />
          </div>
        </div>
      </div>

      <NewItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        actorId={ACTOR_ID}
        editTarget={item}
      />
    </AdminShell>
  );
}
