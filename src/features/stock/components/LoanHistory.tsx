import { UserCheck, PackageCheck, ClockAlert } from "lucide-react";
import { isOverdueLoan } from "../store";
import type { StockLoan } from "../types";

export function LoanHistory({ loans }: { loans: StockLoan[] }) {
  if (loans.length === 0) {
    return (
      <section className="surface-card p-5 rounded-lg">
        <header>
          <h3 className="text-base font-bold">Loan history</h3>
          <p className="text-xs text-muted-foreground">All open and closed borrows of this item.</p>
        </header>
        <p className="mt-6 text-sm text-muted-foreground text-center py-6">
          No loans yet. Use <span className="font-medium text-foreground">Lend out</span> to register the first.
        </p>
      </section>
    );
  }

  const open = loans.filter((l) => !l.returnedAt);
  const closed = loans.filter((l) => l.returnedAt);

  return (
    <section className="surface-card p-5 rounded-lg space-y-6">
      <header>
        <h3 className="text-base font-bold">Loan history</h3>
        <p className="text-xs text-muted-foreground">
          {open.length} open · {closed.length} returned · total {loans.length}
        </p>
      </header>

      {open.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
            <UserCheck className="size-4" /> Open / on loan
          </h4>
          <LoanTable rows={open} />
        </div>
      ) : null}

      {closed.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-1.5">
            <PackageCheck className="size-4" /> Returned
          </h4>
          <LoanTable rows={closed.slice(0, 20)} />
        </div>
      ) : null}
    </section>
  );
}

function LoanTable({ rows }: { rows: StockLoan[] }) {
  return (
    <div className="overflow-x-auto -mx-5 sm:mx-0 border border-border/60 rounded-lg bg-surface-2/30">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">Borrower</th>
            <th className="px-4 py-2 font-medium">Loaned at</th>
            <th className="px-4 py-2 font-medium">Expected return</th>
            <th className="px-4 py-2 font-medium">Returned</th>
            <th className="px-4 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((l) => {
            const overdue = !l.returnedAt && isOverdueLoan(l);
            return (
              <tr key={l.id} className="hover:bg-surface-2/40">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-semibold">{l.borrowerName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{l.borrowerId}</p>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {formatDatetime(l.loanedAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums">
                  {l.expectedReturnAt ? (
                    <span className={overdue ? "font-semibold text-[color:var(--color-p1)] inline-flex items-center gap-1" : ""}>
                      {overdue ? <ClockAlert className="size-3.5" /> : null}
                      {formatDatetime(l.expectedReturnAt)}
                      {overdue ? <span className="text-[10px] uppercase tracking-wider ml-1">overdue</span> : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">default (48h)</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {l.returnedAt ? (
                    <span className="inline-flex items-center gap-1 text-success font-medium">
                      <PackageCheck className="size-3.5" /> {formatDatetime(l.returnedAt)}
                    </span>
                  ) : (
                    <span className="italic text-primary font-medium">Out</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground min-w-[200px]">
                  {l.notes ? <p className="line-clamp-2">{l.notes}</p> : <span className="italic text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDatetime(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${mo}/${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}
