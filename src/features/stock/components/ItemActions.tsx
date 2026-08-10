import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, UserCheck, PackageCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { visibleUsers } from "@/features/users/data";
import { useStockStore, openLoansForItem } from "../store";
import type { StockItem, StockLoan } from "../types";

const HOURS_48 = 48 * 3_600_000;

type Mode = "none" | "lend" | "return" | "move";

export function ItemActions({
  item,
  loans,
  actorId,
}: {
  item: StockItem;
  loans: StockLoan[];
  actorId: string;
}) {
  const recordMovement = useStockStore((s) => s.recordMovement);
  const lendItem = useStockStore((s) => s.lendItem);
  const returnLoan = useStockStore((s) => s.returnLoan);

  const [mode, setMode] = useState<Mode>("none");
  const [error, setError] = useState<string | null>(null);
  const users = useMemo(() => visibleUsers(), []);
  const open = openLoansForItem(loans, item.id);

  function resetErr() {
    setError(null);
  }

  /* =============== LEND =============== */
  const [lendBorrower, setLendBorrower] = useState<string>("");
  const [lendReturn, setLendReturn] = useState<string>(() => {
    const d = new Date(Date.now() + HOURS_48);
    d.setMinutes(0, 0, 0);
    return toLocalInputDatetimeLocal(d);
  });
  const [lendNotes, setLendNotes] = useState("");

  function handleLendOpen() {
    resetErr();
    setLendBorrower(users[0]?.id ?? "");
    setLendReturn(toLocalInputDatetimeLocal(new Date(Date.now() + HOURS_48)));
    setLendNotes("");
    setMode("lend");
  }

  function handleLendSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = users.find((x) => x.id === lendBorrower);
    if (!u) {
      setError("Select a borrower.");
      return;
    }
    const res = lendItem(item.id, {
      borrowerId: u.id,
      borrowerName: u.name,
      expectedReturnAt: lendReturn ? new Date(lendReturn).toISOString() : undefined,
      notes: lendNotes.trim() || undefined,
    }, actorId);
    if (!res) {
      setError("Cannot lend this item right now. Either out of stock or not a tool/equipment category.");
      return;
    }
    setMode("none");
  }

  /* =============== RETURN =============== */
  const [returnLoanId, setReturnLoanId] = useState<string>("");

  function handleReturnOpen() {
    resetErr();
    setReturnLoanId(open[0]?.id ?? "");
    setMode("return");
  }

  function handleReturnSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!returnLoanId) {
      setError("Pick an open loan to mark as returned.");
      return;
    }
    const res = returnLoan(returnLoanId, actorId);
    if (!res) {
      setError("Could not return loan — might already be closed.");
      return;
    }
    setMode("none");
  }

  /* =============== MOVEMENT =============== */
  const [movType, setMovType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [movQty, setMovQty] = useState<number>(1);
  const [movReason, setMovReason] = useState<string>("");

  function handleMovOpen() {
    resetErr();
    setMovType(item.category === "TOOLS" ? "IN" : "OUT");
    setMovQty(1);
    setMovReason("");
    setMode("move");
  }

  function handleMovSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = recordMovement(item.id, {
      movementType: movType,
      qty: Math.max(1, Number(movQty) || 0),
      reason: movReason.trim() || undefined,
    }, actorId);
    if (!res) {
      setError("Stock would go below 0 with this OUT. Check qty.");
      return;
    }
    setMode("none");
  }

  const available = item.category === "CONSUMABLES" ? item.qtyInStock : Math.max(0, item.qtyInStock - open.length);
  const canLend = item.active && (item.category === "TOOLS" || item.category === "OTHER") && available > 0;
  const canReturn = item.active && open.length > 0;
  const canMove = item.active;

  return (
    <>
      <section className="surface-card p-5 rounded-lg">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Actions</h3>
            <p className="text-xs text-muted-foreground">Record loans, returns and stock movements.</p>
          </div>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleLendOpen}
            disabled={!canLend}
            className={`${buttonVariants({ variant: canLend ? "default" : "secondary" })} ${
              canLend ? "" : "opacity-60 cursor-not-allowed"
            }`}
          >
            <UserCheck className="size-4" /> Lend out
          </button>
          <button
            type="button"
            onClick={handleReturnOpen}
            disabled={!canReturn}
            className={`${buttonVariants({ variant: canReturn ? "default" : "secondary" })} ${
              canReturn ? "" : "opacity-60 cursor-not-allowed"
            }`}
          >
            <PackageCheck className="size-4" /> Return
          </button>
          <button
            type="button"
            onClick={handleMovOpen}
            disabled={!canMove}
            className={`${buttonVariants({ variant: canMove ? "secondary" : "secondary" })} ${
              canMove ? "" : "opacity-60 cursor-not-allowed"
            }`}
          >
            <ArrowDownToLine className="size-4" /> Stock in / out
          </button>
        </div>
      </section>

      {/* ---------- LEND ---------- */}
      <Dialog open={mode === "lend"} onOpenChange={(o) => !o && setMode("none")}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleLendSubmit}>
            <DialogHeader>
              <DialogTitle>Lend out — {item.name}</DialogTitle>
              <DialogDescription>
                Select who is borrowing and an expected return date. Default is +48h.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 mt-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Borrower</span>
                <select
                  className="input mt-1"
                  value={lendBorrower}
                  onChange={(e) => setLendBorrower(e.target.value)}
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Expected return</span>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={lendReturn}
                  onChange={(e) => setLendReturn(e.target.value)}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</span>
                <textarea
                  className="input mt-1 min-h-[80px]"
                  value={lendNotes}
                  onChange={(e) => setLendNotes(e.target.value)}
                  placeholder="e.g. To fix kitchen sink, block 2 flat 12"
                  maxLength={300}
                />
              </label>
            </div>

            {error ? <p className="mt-3 text-xs text-[color:var(--color-p1)]">{error}</p> : null}

            <DialogFooter className="mt-5">
              <button type="button" className={buttonVariants({ variant: "ghost" })} onClick={() => setMode("none")}>
                Cancel
              </button>
              <Button type="submit" disabled={!canLend}>Confirm lend</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- RETURN ---------- */}
      <Dialog open={mode === "return"} onOpenChange={(o) => !o && setMode("none")}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleReturnSubmit}>
            <DialogHeader>
              <DialogTitle>Mark returned — {item.name}</DialogTitle>
              <DialogDescription>
                Pick which open loan is being closed. Returned at = now.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3">
              <label>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Open loan</span>
                <select
                  className="input mt-1"
                  value={returnLoanId}
                  onChange={(e) => setReturnLoanId(e.target.value)}
                  required
                >
                  {open.length === 0 ? (
                    <option value="" disabled>No open loans for this item</option>
                  ) : (
                    open.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.borrowerName} · loaned {formatRelative(l.loanedAt)}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {error ? <p className="mt-3 text-xs text-[color:var(--color-p1)]">{error}</p> : null}

            <DialogFooter className="mt-5">
              <button type="button" className={buttonVariants({ variant: "ghost" })} onClick={() => setMode("none")}>
                Cancel
              </button>
              <Button type="submit" disabled={open.length === 0}>
                <RotateCcw className="size-4" /> Mark returned
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- MOVEMENT ---------- */}
      <Dialog open={mode === "move"} onOpenChange={(o) => !o && setMode("none")}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleMovSubmit}>
            <DialogHeader>
              <DialogTitle>Stock in / out — {item.name}</DialogTitle>
              <DialogDescription>
                ADJUST overwrites stock count. Use for physical counts.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 mt-3 sm:grid-cols-2">
              <label>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Type</span>
                <select
                  className="input mt-1"
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as "IN" | "OUT" | "ADJUST")}
                >
                  <option value="IN"><ArrowDownToLine className="inline size-3 align-text-bottom mr-1" />IN — add stock</option>
                  <option value="OUT"><ArrowUpFromLine className="inline size-3 align-text-bottom mr-1" />OUT — remove / consume</option>
                  <option value="ADJUST">ADJUST — set exact count</option>
                </select>
              </label>
              <label>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Qty ({item.unit})</span>
                <input
                  type="number"
                  className="input mt-1"
                  min={movType === "ADJUST" ? 0 : 1}
                  step={1}
                  value={movQty}
                  onChange={(e) => setMovQty(Number(e.target.value))}
                  required
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Reason (optional)</span>
                <input
                  className="input mt-1"
                  placeholder="e.g. 4 used at Martlett 302, damaged bulb"
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  maxLength={240}
                />
              </label>
            </div>

            {movType !== "ADJUST" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                After this movement, stock becomes:
                <span className="ml-1 font-mono font-semibold">
                  {movType === "IN"
                    ? `${item.qtyInStock} + ${movQty} = ${item.qtyInStock + movQty} ${item.unit}`
                    : `${item.qtyInStock} − ${movQty} = ${Math.max(0, item.qtyInStock - movQty)} ${item.unit}`}
                </span>
              </p>
            ) : null}

            {error ? <p className="mt-3 text-xs text-[color:var(--color-p1)]">{error}</p> : null}

            <DialogFooter className="mt-5">
              <button type="button" className={buttonVariants({ variant: "ghost" })} onClick={() => setMode("none")}>
                Cancel
              </button>
              <Button type="submit">Record movement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function toLocalInputDatetimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function formatRelative(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.max(1, Math.round(s))}s ago`;
  const m = s / 60;
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const days = h / 24;
  return `${Math.round(days)}d ago`;
}
