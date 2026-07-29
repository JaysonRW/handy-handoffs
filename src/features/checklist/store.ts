import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChecklistCompletion, ChecklistItem, ChecklistSnapshot } from "./types";
import { isCheckedForCurrentPeriod, periodKeyForItem, toUtcIso } from "./period";
import { nanoid } from "@/lib/id";

type ChecklistState = {
  items: ChecklistItem[];
  completions: ChecklistCompletion[];
  hydratedFromServerAt?: string;
  pendingUpserts: string[];
  lastError?: string;

  hydrateFromServer: (snapshot: ChecklistSnapshot) => void;
  toggleItem: (itemId: string, checkedById: string) => { item: ChecklistItem | null; upsertKey: string | null };
  markUpsertDone: (upsertKey: string, syncedCompletion: ChecklistCompletion) => void;
  markUpsertFailed: (upsertKey: string, error: string) => void;
  setLastError: (error: string | undefined) => void;
  getPendingUpserts: () => Array<{ key: string; item: ChecklistItem; completion: ChecklistCompletion }>;
  resetLocal: () => void;
  getProgress: (now?: Date) => { done: number; total: number };
};

const now = () => new Date();

export const useChecklistStore = create<ChecklistState>()(
  persist(
    (set, get) => ({
      items: [],
      completions: [],
      hydratedFromServerAt: undefined,
      pendingUpserts: [],
      lastError: undefined,

      hydrateFromServer: (snapshot) => {
        const state = get();
        const mergedItems = new Map(state.items.map((it) => [it.id, it] as const));
        for (const srv of snapshot.items) mergedItems.set(srv.id, srv);

        const mergedCompletions = new Map(
          state.completions.map((c) => [`${c.itemId}::${c.periodKey}`, c] as const),
        );
        for (const c of snapshot.completions) {
          const key = `${c.itemId}::${c.periodKey}`;
          const local = mergedCompletions.get(key);
          if (!local) {
            mergedCompletions.set(key, c);
            continue;
          }
          if (new Date(c.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
            mergedCompletions.set(key, c);
          }
        }

        set({
          items: Array.from(mergedItems.values()).sort(
            (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
          ),
          completions: Array.from(mergedCompletions.values()),
          hydratedFromServerAt: toUtcIso(),
        });
      },

      toggleItem: (itemId, checkedById) => {
        const d = now();
        const state = get();
        const item = state.items.find((it) => it.id === itemId && it.active) ?? null;
        if (!item) return { item: null, upsertKey: null };

        const currentCheckedAt = findCurrentPeriodCheckedAt(state.completions, item, d);
        const isChecked = isCheckedForCurrentPeriod(item, currentCheckedAt, d);

        if (isChecked) {
          const periodKey = periodKeyForItem(item, { now: d, lastCheckedAt: currentCheckedAt });
          set((s) => ({
            completions: s.completions.filter(
              (c) => !(c.itemId === item.id && c.periodKey === periodKey),
            ),
            pendingUpserts: s.pendingUpserts.filter((key) => key !== upsertId(item.id, periodKey)),
          }));
          return { item, upsertKey: null };
        }

        const periodKey = periodKeyForItem(item, { now: d });
        const completion: ChecklistCompletion = {
          itemId: item.id,
          periodKey,
          checkedAt: toUtcIso(d),
          checkedById,
          updatedAt: toUtcIso(d),
        };
        const key = upsertId(item.id, periodKey);
        set((s) => {
          const others = s.completions.filter(
            (c) => !(c.itemId === item.id && c.periodKey === periodKey),
          );
          return {
            completions: [...others, completion],
            pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
            lastError: undefined,
          };
        });
        return { item, upsertKey: key };
      },

      markUpsertDone: (upsertKey, syncedCompletion) => {
        set((s) => ({
          pendingUpserts: s.pendingUpserts.filter((k) => k !== upsertKey),
          completions: [
            ...s.completions.filter(
              (c) =>
                !(
                  c.itemId === syncedCompletion.itemId && c.periodKey === syncedCompletion.periodKey
                ),
            ),
            syncedCompletion,
          ],
          lastError: undefined,
        }));
      },

      markUpsertFailed: (upsertKey, error) => {
        set({ lastError: error });
      },

      setLastError: (error) => {
        set({ lastError: error });
      },

      getPendingUpserts: () => {
        const state = get();
        const out: Array<{ key: string; item: ChecklistItem; completion: ChecklistCompletion }> = [];
        for (const key of state.pendingUpserts) {
          const [itemId, periodKey] = parseUpsertId(key);
          const item = state.items.find((i) => i.id === itemId) ?? null;
          const completion = state.completions.find(
            (c) => c.itemId === itemId && c.periodKey === periodKey,
          );
          if (item && completion) out.push({ key, item, completion });
        }
        return out;
      },

      resetLocal: () => {
        set({ items: [], completions: [], hydratedFromServerAt: undefined, pendingUpserts: [], lastError: undefined });
      },

      getProgress: (d = now()) => {
        const state = get();
        const active = state.items.filter((it) => it.active);
        let done = 0;
        for (const it of active) {
          const last = findCurrentPeriodCheckedAt(state.completions, it, d);
          if (isCheckedForCurrentPeriod(it, last, d)) done += 1;
        }
        return { done, total: active.length };
      },
    }),
    { name: "pmtms.checklist.v1" },
  ),
);

function findCurrentPeriodCheckedAt(
  completions: ChecklistCompletion[],
  item: ChecklistItem,
  now: Date,
): string | null {
  const sameItem = completions.filter((c) => c.itemId === item.id);
  if (sameItem.length === 0) return null;
  const latest = sameItem
    .slice()
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0]!;
  return latest.checkedAt;
}

function upsertId(itemId: string, periodKey: string) {
  return `${itemId}::${periodKey}`;
}

function parseUpsertId(key: string): [string, string] {
  const idx = key.indexOf("::");
  if (idx < 0) return [key, ""];
  return [key.slice(0, idx), key.slice(idx + 2)];
}

export const selectCheckedInCurrentPeriod =
  (item: ChecklistItem, now = new Date()) => (s: ChecklistState) => {
    const currentCheckedAt = findCurrentPeriodCheckedAt(s.completions, item, now);
    return isCheckedForCurrentPeriod(item, currentCheckedAt, now) ? currentCheckedAt : null;
  };

export const selectActiveItemsByBuildingByPeriod = (s: ChecklistState) => {
  const active = s.items.filter((it) => it.active);
  const byPeriod = new Map<
    string,
    {
      periodLabel: string;
      items: ChecklistItem[];
    }
  >();
  for (const item of active) {
    const key = item.periodType;
    const slot = byPeriod.get(key) ?? { periodLabel: labelForPeriod(item.periodType), items: [] };
    slot.items.push(item);
    byPeriod.set(key, slot);
  }
  const order: ChecklistItem["periodType"][] = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];
  return order
    .map((p) => byPeriod.get(p))
    .filter(Boolean)
    .map((slot) => ({
      periodLabel: slot!.periodLabel,
      items: slot!.items.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.buildingId.localeCompare(b.buildingId) ||
          a.title.localeCompare(b.title),
      ),
    }));
};

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
