import { useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronUp, Edit2, Play, Trash2 } from "lucide-react";
import { useChecklistStore } from "../store";
import type { ChecklistItem, ChecklistPeriodType } from "../types";
import { WEEKDAY_RULES } from "../types";
import { ChecklistItemDialog, type ChecklistFilterState } from "./ChecklistItemDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Grouped = {
  periodType: ChecklistPeriodType;
  periodLabel: string;
  items: ChecklistItem[];
};

export function ChecklistAdminList({ actorId }: { actorId: string }) {
  const allItems = useChecklistStore((s) => s.items);
  const moveItem = useChecklistStore((s) => s.moveItem);
  const toggleItemActive = useChecklistStore((s) => s.toggleItemActive);

  const [filter, setFilter] = useState<ChecklistFilterState>({ search: "", status: "ALL" });
  const [openDialog, setOpenDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<ChecklistItem | null>(null);

  function updateSearch(v: string) {
    setFilter((f) => ({ ...f, search: v }));
  }
  function updateStatus(v: ChecklistFilterState["status"]) {
    setFilter((f) => ({ ...f, status: v }));
  }

  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return allItems.filter((it) => {
      if (filter.status === "ACTIVE" && !it.active) return false;
      if (filter.status === "INACTIVE" && it.active) return false;
      if (q && !it.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allItems, filter]);

  const groups = useMemo<Grouped[]>(() => {
    const byPeriod = new Map<ChecklistPeriodType, ChecklistItem[]>();
    for (const it of filtered) {
      const slot = byPeriod.get(it.periodType) ?? [];
      slot.push(it);
      byPeriod.set(it.periodType, slot);
    }
    const order: ChecklistPeriodType[] = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];
    return order
      .map((p) => ({
        periodType: p,
        periodLabel: labelPeriod(p),
        items: (byPeriod.get(p) ?? []).sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const it of allItems) {
      if (it.active) active += 1;
      else inactive += 1;
    }
    return { all: allItems.length, active, inactive };
  }, [allItems]);

  function openCreate() {
    setEditTarget(null);
    setOpenDialog(true);
  }
  function openEdit(it: ChecklistItem) {
    setEditTarget(it);
    setOpenDialog(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-card p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <input
              className="input mt-1"
              value={filter.search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Search by title…"
              maxLength={140}
            />
          </div>
          <div className="flex flex-wrap gap-1 sm:justify-end">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors border",
                  filter.status === s
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-transparent border-border text-foreground hover:bg-accent",
                )}
              >
                {s}
                <span className="ml-2 text-[10px] opacity-70">
                  ({s === "ALL" ? counts.all : s === "ACTIVE" ? counts.active : counts.inactive})
                </span>
              </button>
            ))}
          </div>
          <Button onClick={openCreate}>
            <Play className="size-4" /> New item
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="surface-card p-8 flex flex-col items-center justify-center text-center gap-2">
          <div className="size-14 rounded-full bg-muted/50 grid place-items-center text-muted-foreground">
            <Trash2 className="size-6" />
          </div>
          <h3 className="font-bold">No checklist items</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {allItems.length === 0
              ? "Get started by creating your first checklist item. It will show up on the Caretaker daily & weekly screen."
              : "No items match the current filters. Try switching status or clearing search."}
          </p>
          {allItems.length === 0 ? (
            <button onClick={openCreate} className={cn(buttonVariants({}), "mt-2")}>
              <Play className="size-4" /> Create first item
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.periodType} className="flex flex-col gap-2">
              <header className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">{g.periodLabel}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {g.items.length} item{g.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </header>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {g.items.map((it, idx) => (
                  <li
                    key={it.id}
                    className={cn(
                      "surface-card p-3 flex items-center gap-3",
                      !it.active && "opacity-60",
                    )}
                  >
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(it.id, "UP")}
                        aria-label="Move up"
                        disabled={idx === 0}
                        className={cn(
                          "size-7 grid place-items-center rounded-md border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed",
                        )}
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(it.id, "DOWN")}
                        aria-label="Move down"
                        disabled={idx === g.items.length - 1}
                        className={cn(
                          "size-7 grid place-items-center rounded-md border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed",
                        )}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold truncate">{it.title}</p>
                        {it.active ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider">
                            Archived
                          </span>
                        )}
                        {it.periodType === "WEEKLY" && it.periodRule && WEEKDAY_RULES.includes(it.periodRule as typeof WEEKDAY_RULES[number]) ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                            {labelWeekday(it.periodRule as typeof WEEKDAY_RULES[number])}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.periodLabel}
                        <span className="mx-1.5 opacity-50">·</span>
                        Sort #{it.sortOrder}
                        <span className="mx-1.5 opacity-50">·</span>
                        ID {shortId(it.id)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(it)}
                        aria-label="Edit item"
                        className="size-8 grid place-items-center rounded-md border border-border hover:bg-accent"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleItemActive(it.id, actorId)}
                        aria-label={it.active ? "Archive" : "Restore"}
                        className={cn(
                          "size-8 grid place-items-center rounded-md border hover:bg-accent",
                          it.active ? "border-border" : "border-primary/40 text-primary",
                        )}
                      >
                        {it.active ? <Archive className="size-4" /> : <Play className="size-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ChecklistItemDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        actorId={actorId}
        editTarget={editTarget}
      />
    </div>
  );
}

function labelPeriod(p: ChecklistPeriodType): string {
  switch (p) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "BIWEEKLY":
      return "Every 15 days";
    case "MONTHLY":
      return "Monthly";
  }
}

function labelWeekday(w: (typeof WEEKDAY_RULES)[number]): string {
  switch (w) {
    case "MON":
      return "Monday";
    case "TUE":
      return "Tuesday";
    case "WED":
      return "Wednesday";
    case "THU":
      return "Thursday";
    case "FRI":
      return "Friday";
    case "SAT":
      return "Saturday";
    case "SUN":
      return "Sunday";
  }
}

function shortId(id: string) {
  if (!id) return "—";
  if (id.length <= 8) return id;
  return id.slice(0, 6);
}
