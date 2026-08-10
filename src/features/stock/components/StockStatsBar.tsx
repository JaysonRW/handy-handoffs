import { Package, UserCheck, ClockAlert, AlertTriangle } from "lucide-react";
import { Stat } from "@/components/ui/stat";
import { useStockStore, overdueLoans } from "../store";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

export function StockStatsBar() {
  const items = useStockStore((s) => s.items);
  const loans = useStockStore((s) => s.loans);

  const counts = useMemo(() => {
    const total = items.filter((i) => i.active).length;
    const openLoans = loans.filter((l) => !l.returnedAt).length;
    const overdue = overdueLoans(loans);
    const qtyOnLoan = openLoans;
    const qtyInStock = items.reduce((acc, i) => (i.active ? acc + Math.max(0, Number(i.qtyInStock ?? 0)) : acc), 0);
    return { total, openLoans, overdueList: overdue, overdueCount: overdue.length, qtyOnLoan, qtyInStock };
  }, [items, loans]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total items"
          value={counts.total}
          icon={Package}
          tone="primary"
          to="/admin/stock"
        />
        <Stat
          label="Total in stock (qty)"
          value={counts.qtyInStock}
          icon={Package}
          tone="success"
          to="/admin/stock"
        />
        <Stat
          label="On loan"
          value={counts.openLoans}
          icon={UserCheck}
          tone="primary"
          to="/admin/stock"
          search={{ filter: "loaned" }}
        />
        <Stat
          label="Overdue (>48h)"
          value={counts.overdueCount}
          icon={ClockAlert}
          tone="danger"
          to="/admin/stock"
          search={{ filter: "overdue" }}
        />
      </div>

      {counts.overdueCount > 0 ? (
        <div className="surface-card border border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/5 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 mt-0.5 text-[color:var(--color-p1)] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[color:var(--color-p1)]">
                {counts.overdueCount} equipment loan(s) overdue — contact borrower to return.
              </p>
              <ul className="mt-2 divide-y divide-border/40">
                {counts.overdueList.slice(0, 5).map((l) => {
                  const item = items.find((i) => i.id === l.itemId);
                  return (
                    <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/admin/stock/${l.itemId}` as any}
                          className="text-sm font-medium hover:text-primary focus-ring rounded"
                        >
                          {item?.name ?? "Unknown item"}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          Borrower: {l.borrowerName}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        Due {formatDistanceToNow(new Date(l.expectedReturnAt ?? l.loanedAt), { addSuffix: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
