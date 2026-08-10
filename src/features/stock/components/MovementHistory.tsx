import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import type { StockMovement } from "../types";

export function MovementHistory({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return (
      <section className="surface-card p-5 rounded-lg">
        <header>
          <h3 className="text-base font-bold">Movement history</h3>
          <p className="text-xs text-muted-foreground">IN / OUT / ADJUST of stock quantity.</p>
        </header>
        <p className="mt-6 text-sm text-muted-foreground text-center py-6">
          No movements recorded yet. Use <span className="font-medium text-foreground">Stock in / out</span> to log the first.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card p-5 rounded-lg">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Movement history</h3>
          <p className="text-xs text-muted-foreground">Showing newest {Math.min(20, movements.length)} of {movements.length} total.</p>
        </div>
      </header>

      <div className="mt-4 overflow-x-auto -mx-5 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium tabular-nums">Qty</th>
              <th className="px-4 py-2 text-right font-medium tabular-nums">Running</th>
              <th className="px-4 py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {movements.slice(0, 20).map((m) => {
              const Icon =
                m.movementType === "IN" ? ArrowDownToLine
                  : m.movementType === "OUT" ? ArrowUpFromLine
                    : SlidersHorizontal;
              const tone =
                m.movementType === "IN" ? "text-success"
                  : m.movementType === "OUT" ? "text-[color:var(--color-p1)]"
                    : "text-accent-foreground bg-accent/15 rounded px-2 py-0.5 border border-accent/30";
              const label = m.movementType;
              const absQty = Math.abs(m.qty);
              return (
                <tr key={m.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDatetime(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
                      <Icon className="size-3.5" /> {label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums text-sm font-semibold whitespace-nowrap ${
                    m.movementType === "OUT" ? "text-[color:var(--color-p1)]"
                      : m.movementType === "IN" ? "text-success" : "text-foreground"
                  }`}>
                    {m.movementType === "OUT" ? `− ${absQty}` : m.movementType === "IN" ? `+ ${absQty}` : `→ ${absQty}`}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap">
                    {m.runningQty}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground min-w-[180px]">
                    {m.reason ? <span>{m.reason}</span> : <span className="italic text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
