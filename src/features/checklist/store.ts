import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChecklistCompletion, ChecklistItem, ChecklistPeriodType, ChecklistSnapshot } from "./types";
import { isCheckedForCurrentPeriod, periodKeyForItem, toUtcIso } from "./period";
import { nanoid } from "@/lib/id";

type ChecklistItemPendingKind = "TOGGLE_COMPLETION" | "CREATE_ITEM" | "UPDATE_ITEM";

type ChecklistItemPendingUpsert =
  | {
      key: string;
      kind: "TOGGLE_COMPLETION";
      item: ChecklistItem;
      completion: ChecklistCompletion;
    }
  | {
      key: string;
      kind: "CREATE_ITEM" | "UPDATE_ITEM";
      item: ChecklistItem;
    };

export type ChecklistItemDraft = {
  title: string;
  periodType: ChecklistPeriodType;
  periodRule?: string;
  buildingId?: string;
  sortOrder?: number;
  active?: boolean;
};

type ChecklistState = {
  items: ChecklistItem[];
  completions: ChecklistCompletion[];
  hydratedFromServerAt?: string;
  pendingUpserts: string[];
  lastError?: string;

  hydrateFromServer: (snapshot: ChecklistSnapshot) => void;
  toggleItem: (
    itemId: string,
    checkedById: string,
  ) => { item: ChecklistItem | null; upsertKey: string | null };
  markUpsertDone: (upsertKey: string, syncedPayload: ChecklistCompletion | ChecklistItem) => void;
  markUpsertFailed: (upsertKey: string, error: string) => void;
  setLastError: (error: string | undefined) => void;

  addItem: (draft: ChecklistItemDraft, actorId: string) => { item: ChecklistItem; upsertKey: string };
  editItem: (
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "title" | "periodType" | "periodRule" | "sortOrder" | "active">>,
    actorId: string,
  ) => ChecklistItem | null;
  toggleItemActive: (itemId: string, actorId: string) => ChecklistItem | null;
  moveItem: (itemId: string, direction: "UP" | "DOWN") => void;

  getPendingUpserts: () => ChecklistItemPendingUpsert[];
  resetLocal: () => void;
  getProgress: (now?: Date) => { done: number; total: number };
};

const now = () => new Date();

export function checklistPendingKey(kind: ChecklistItemPendingKind, id: string) {
  return `${kind}::${id}`;
}

function parsePendingKey(key: string): { kind: ChecklistItemPendingKind | null; id: string; rest: string } {
  const firstSep = key.indexOf("::");
  if (firstSep < 0) return { kind: null, id: key, rest: "" };
  const kindSegment = key.slice(0, firstSep) as ChecklistItemPendingKind;
  const rest = key.slice(firstSep + 2);
  if (kindSegment === "TOGGLE_COMPLETION" || kindSegment === "CREATE_ITEM" || kindSegment === "UPDATE_ITEM") {
    return { kind: kindSegment, id: rest, rest };
  }
  const secondSep = rest.indexOf("::");
  if (secondSep >= 0) {
    return { kind: "TOGGLE_COMPLETION", id: rest.slice(0, secondSep), rest };
  }
  return { kind: null, id: rest, rest };
}

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
          const oldKey = legacyToggleKey(item.id, periodKey);
          set((s) => ({
            completions: s.completions.filter(
              (c) => !(c.itemId === item.id && c.periodKey === periodKey),
            ),
            pendingUpserts: s.pendingUpserts.filter((k) => k !== oldKey && k !== checklistPendingKey("TOGGLE_COMPLETION", oldKey)),
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
        const upsertIdInner = legacyToggleKey(item.id, periodKey);
        const key = checklistPendingKey("TOGGLE_COMPLETION", upsertIdInner);
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

      markUpsertDone: (upsertKey, syncedPayload) => {
        set((s) => {
          const parsed = parsePendingKey(upsertKey);
          if (parsed.kind === "TOGGLE_COMPLETION") {
            const completion = syncedPayload as ChecklistCompletion;
            return {
              pendingUpserts: s.pendingUpserts.filter((k) => k !== upsertKey),
              completions: [
                ...s.completions.filter(
                  (c) =>
                    !(
                      c.itemId === completion.itemId && c.periodKey === completion.periodKey
                    ),
                ),
                completion,
              ],
              lastError: undefined,
            };
          }
          if (parsed.kind === "CREATE_ITEM" || parsed.kind === "UPDATE_ITEM") {
            const item = syncedPayload as ChecklistItem;
            const mapItems = new Map(s.items.map((it) => [it.id, it] as const));
            mapItems.set(item.id, item);
            return {
              pendingUpserts: s.pendingUpserts.filter((k) => k !== upsertKey),
              items: Array.from(mapItems.values()).sort(
                (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
              ),
              lastError: undefined,
            };
          }
          return {
            pendingUpserts: s.pendingUpserts.filter((k) => k !== upsertKey),
            lastError: undefined,
          };
        });
      },

      markUpsertFailed: (upsertKey, error) => {
        set({ lastError: error });
      },

      setLastError: (error) => {
        set({ lastError: error });
      },

      addItem: (draft, actorId) => {
        const state = get();
        const maxSort =
          state.items.length === 0 ? 0 : Math.max(...state.items.map((it) => it.sortOrder)) + 1;
        const id = nanoid();
        const created: ChecklistItem = {
          id,
          title: draft.title.trim(),
          periodType: draft.periodType,
          periodRule: draft.periodRule,
          buildingId: draft.buildingId ?? "MASTER",
          sortOrder: draft.sortOrder ?? maxSort,
          active: draft.active ?? true,
          createdAt: toUtcIso(),
          updatedAt: toUtcIso(),
          createdById: actorId,
        };
        const key = checklistPendingKey("CREATE_ITEM", id);
        set((s) => ({
          items: [...s.items.filter((it) => it.id !== id), created].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
          ),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
          lastError: undefined,
        }));
        return { item: created, upsertKey: key };
      },

      editItem: (itemId, patch, actorId) => {
        const state = get();
        const existing = state.items.find((it) => it.id === itemId);
        if (!existing) return null;

        const updated: ChecklistItem = {
          ...existing,
          ...patch,
          title: patch.title !== undefined ? patch.title.trim() : existing.title,
          updatedAt: toUtcIso(),
          createdById: existing.createdById ?? actorId,
        };
        const key = checklistPendingKey("UPDATE_ITEM", updated.id);
        set((s) => ({
          items: [...s.items.filter((it) => it.id !== updated.id), updated].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
          ),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
          lastError: undefined,
        }));
        return updated;
      },

      toggleItemActive: (itemId, actorId) => {
        const state = get();
        const existing = state.items.find((it) => it.id === itemId);
        if (!existing) return null;
        return get().editItem(itemId, { active: !existing.active }, actorId);
      },

      moveItem: (itemId, direction) => {
        const state = get();
        const list = [...state.items].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
        );
        const idx = list.findIndex((it) => it.id === itemId);
        if (idx < 0) return;
        const target = direction === "UP" ? idx - 1 : idx + 1;
        if (target < 0 || target >= list.length) return;
        const a = list[idx]!;
        const b = list[target]!;
        const aOrder = a.sortOrder;
        const bOrder = b.sortOrder;
        const nowIso = toUtcIso();
        const aUpdated: ChecklistItem = { ...a, sortOrder: bOrder, updatedAt: nowIso };
        const bUpdated: ChecklistItem = { ...b, sortOrder: aOrder, updatedAt: nowIso };
        const keyA = checklistPendingKey("UPDATE_ITEM", aUpdated.id);
        const keyB = checklistPendingKey("UPDATE_ITEM", bUpdated.id);

        set((s) => {
          const rest = s.items.filter((it) => it.id !== aUpdated.id && it.id !== bUpdated.id);
          return {
            items: [...rest, aUpdated, bUpdated].sort(
              (x, y) => x.sortOrder - y.sortOrder || x.title.localeCompare(y.title),
            ),
            pendingUpserts: Array.from(new Set([...s.pendingUpserts, keyA, keyB])),
            lastError: undefined,
          };
        });
      },

      getPendingUpserts: () => {
        const state = get();
        const out: ChecklistItemPendingUpsert[] = [];
        for (const key of state.pendingUpserts) {
          const parsed = parsePendingKey(key);
          if (parsed.kind === "TOGGLE_COMPLETION") {
            const [itemId, periodKey] = splitLegacyToggleKey(parsed.id);
            if (!itemId || !periodKey) continue;
            const item = state.items.find((i) => i.id === itemId) ?? null;
            const completion = state.completions.find(
              (c) => c.itemId === itemId && c.periodKey === periodKey,
            );
            if (item && completion) out.push({ key, kind: "TOGGLE_COMPLETION", item, completion });
          } else if (parsed.kind === "CREATE_ITEM" || parsed.kind === "UPDATE_ITEM") {
            const item = state.items.find((i) => i.id === parsed.id) ?? null;
            if (item) out.push({ key, kind: parsed.kind, item });
          }
        }
        return out;
      },

      resetLocal: () => {
        set({
          items: [],
          completions: [],
          hydratedFromServerAt: undefined,
          pendingUpserts: [],
          lastError: undefined,
        });
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
    { name: "pmtms.checklist.v2" },
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

function legacyToggleKey(itemId: string, periodKey: string) {
  return `${itemId}::${periodKey}`;
}

function splitLegacyToggleKey(combined: string): [string, string] {
  const idx = combined.indexOf("::");
  if (idx < 0) return [combined, ""];
  return [combined.slice(0, idx), combined.slice(idx + 2)];
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
