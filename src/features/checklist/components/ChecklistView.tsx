import { useMemo } from "react";
import { useSyncStore } from "@/features/sync/store";
import { triggerManualSync } from "@/features/sync/runtime";
import { useChecklistStore } from "@/features/checklist/store";
import { formatCheckedAt, humanPeriod, isCheckedForCurrentPeriod, isOverdue } from "@/features/checklist/period";
import type { ChecklistItem } from "@/features/checklist/types";
import { getBlock } from "@/features/blocks/data";
import { CheckSquare2, CloudOff, Loader2 } from "lucide-react";

export function ChecklistView({ userId, basePath }: { userId: string; basePath: string }) {
  const items = useChecklistStore((s) => s.items);
  const lastError = useChecklistStore((s) => s.lastError);
  const hydratedFromServerAt = useChecklistStore((s) => s.hydratedFromServerAt);
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const toggleItem = useChecklistStore((s) => s.toggleItem);
  const progressDone = useChecklistStore((s) => s.getProgress().done);
  const progressTotal = useChecklistStore((s) => s.getProgress().total);
  void basePath;

  const active = useMemo(() => items.filter((i) => i.active), [items]);
  const groups = useMemo(() => {
    type Slot = { periodLabel: string; items: ChecklistItem[] };
    const byPeriod = new Map<ChecklistItem["periodType"], Slot>();
    for (const item of active) {
      const slot = byPeriod.get(item.periodType) ?? {
        periodLabel: labelForPeriod(item.periodType),
        items: [],
      };
      slot.items.push(item);
      byPeriod.set(item.periodType, slot);
    }
    const order: ChecklistItem["periodType"][] = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];
    return order
      .map((p) => byPeriod.get(p))
      .filter((s): s is Slot => Boolean(s))
      .map((slot) => ({
        periodLabel: slot.periodLabel,
        items: [...slot.items].sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.buildingId.localeCompare(b.buildingId) ||
            a.title.localeCompare(b.title),
        ),
      }));
  }, [active]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <header className="surface-card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="size-11 rounded-full grid place-items-center bg-primary/15 text-primary">
            <CheckSquare2 className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Daily &amp; weekly checklist</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {active.length === 0
                ? "Waiting for the first sync from Supabase…"
                : `${progressDone} of ${progressTotal} completed in the current period`}
            </p>
          </div>
        </div>
        <button
          onClick={() => triggerManualSync()}
          disabled={!online || syncing}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 focus-ring hover:bg-surface disabled:opacity-40"
          title="Sync checklist checks to Supabase"
        >
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <CloudOff className="size-3.5" />}
          Sync now
        </button>
      </header>

      {!online && (
        <div className="surface-card border-accent/40 bg-accent/5 p-3 text-sm text-accent-foreground">
          You are offline. Checks are saved locally and will be sent when back online.
        </div>
      )}

      {lastError ? (
        <div className="surface-card border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Last sync failed: {lastError}
        </div>
      ) : null}

      {active.length === 0 ? (
        <div className="surface-card p-8 text-sm text-muted-foreground flex flex-col gap-3">
          {!hydratedFromServerAt ? (
            <>
              <div className="font-semibold text-foreground">Waiting for the first sync from Supabase…</div>
              <div className="text-xs leading-relaxed">
                If this message never goes away, the most common cause is missing RLS policies on{" "}
                <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">checklist_items</code> /{" "}
                <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">checklist_completions</code>.
                Run the RLS SQL provided with this release or click <strong>Sync now</strong> above.
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-destructive">
                Supabase returned 0 active checklist items
              </div>
              <div className="text-xs leading-relaxed space-y-1.5">
                <div>
                  Checklist was successfully synced at{" "}
                  <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">
                    {new Date(hydratedFromServerAt).toLocaleString()}
                  </code>
                  , but <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">checklist_items</code>{" "}
                  is empty. Usually one of these:
                </div>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>The <strong>SQL seed</strong> for checklist items was not executed yet on Supabase.</li>
                  <li>
                    RLS policies exist but the seed rows belong to another user (rare — seed uses
                    <code className="bg-surface-2 px-1 py-0.5 rounded text-[10px]"> created_by_id NULL</code>
                    so it should be public).
                  </li>
                  <li>All items have <code className="bg-surface-2 px-1 py-0.5 rounded text-[10px]">active = false</code>.</li>
                </ol>
              </div>
            </>
          )}
          <div className="pt-1 text-xs">
            <strong>Quick test:</strong> in the Supabase SQL editor run →{" "}
            <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">
              SELECT COUNT(*) FROM public.checklist_items WHERE active = true;
            </code>{" "}
            Expected: <em>11 rows</em> (or more, if you added custom items).
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.periodLabel} className="flex flex-col gap-2">
              <h2 className="text-sm font-bold px-1">{group.periodLabel}</h2>
              <div className="surface-card divide-y divide-border rounded-lg overflow-hidden">
                {group.items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    userId={userId}
                    onChange={() => {
                      toggleItem(item.id, userId);
                      if (online) void triggerManualSync();
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  userId,
  onChange,
}: {
  item: ChecklistItem;
  userId: string;
  onChange: () => void;
}) {
  void userId;
  const lastCheckedAt = useChecklistStore((s) => {
    const same = s.completions.filter((c) => c.itemId === item.id);
    if (same.length === 0) return null;
    const latest = same
      .slice()
      .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0];
    return latest?.checkedAt ?? null;
  });
  const currentCheckedAt = useMemo(
    () => (lastCheckedAt && isCheckedForCurrentPeriod(item, lastCheckedAt) ? lastCheckedAt : null),
    [lastCheckedAt, item],
  );
  const overdue = isOverdue(item, currentCheckedAt ?? null);
  const building = getBlock(item.buildingId);
  const checked = !!currentCheckedAt;

  return (
    <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2/60 focus-within:bg-surface-2/60">
      <input
        type="checkbox"
        className="mt-0.5 size-5 rounded-md border-border bg-surface-2 text-primary focus-ring accent-primary"
        checked={checked}
        onChange={onChange}
      />
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm leading-tight min-w-0">{item.title}</span>
          <span className="chip border bg-primary/10 text-primary border-primary/40 text-[11px]">
            {building?.name ?? item.buildingId}
          </span>
          {overdue && !checked && (
            <span className="chip border bg-destructive/10 text-destructive border-destructive/40 text-[11px]">
              Overdue
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{humanPeriod(item)}</span>
          {currentCheckedAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatCheckedAt(currentCheckedAt)}
            </span>
          )}
        </div>
      </div>
    </label>
  );
}

function labelForPeriod(p: ChecklistItem["periodType"]) {
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
