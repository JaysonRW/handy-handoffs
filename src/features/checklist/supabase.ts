import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { toUtcIso } from "./period";
import type { ChecklistCompletion, ChecklistItem, ChecklistSnapshot } from "./types";

type ItemRow = {
  id: string;
  title: string;
  period_type: ChecklistItem["periodType"];
  period_rule: string | null;
  building_id: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
};

type CompletionRow = {
  item_id: string;
  period_key: string;
  checked_at: string;
  checked_by_id: string;
  updated_at: string;
};

const ITEM_SELECT =
  "id,title,period_type,period_rule,building_id,sort_order,active,created_at,updated_at,created_by_id";

const COMPLETION_SELECT = "item_id,period_key,checked_at,checked_by_id,updated_at";

function mapItem(row: ItemRow): ChecklistItem {
  return {
    id: row.id,
    title: row.title,
    periodType: row.period_type,
    periodRule: row.period_rule ?? undefined,
    buildingId: row.building_id,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdById: row.created_by_id ?? undefined,
  };
}

function mapCompletion(row: CompletionRow): ChecklistCompletion {
  return {
    itemId: row.item_id,
    periodKey: row.period_key,
    checkedAt: row.checked_at,
    checkedById: row.checked_by_id,
    updatedAt: row.updated_at,
  };
}

function itemToRow(item: ChecklistItem): ItemRow {
  return {
    id: item.id,
    title: item.title,
    period_type: item.periodType,
    period_rule: item.periodRule ?? null,
    building_id: item.buildingId,
    sort_order: item.sortOrder,
    active: item.active,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    created_by_id: item.createdById ?? null,
  };
}

export type FetchSnapshotOptions = {
  /**
   * Caretaker runtime: includeInactive=false (default backward compat).
   * Admin CRUD screen: includeInactive=true (para ver arquivados e poder restaurar).
   */
  includeInactive?: boolean;
};

export async function fetchChecklistSnapshot(
  opts: FetchSnapshotOptions = {},
): Promise<ChecklistSnapshot | null> {
  if (!isSupabaseConfigured) return null;

  const { includeInactive = false } = opts;
  const supabase = getSupabaseBrowserClient();

  const itemsQuery = supabase.from("checklist_items").select(ITEM_SELECT);
  if (!includeInactive) itemsQuery.eq("active", true);
  itemsQuery
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  const [itemsResult, completionsResult] = await Promise.all([
    itemsQuery,
    supabase
      .from("checklist_completions")
      .select(COMPLETION_SELECT)
      .order("checked_at", { ascending: false }),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (completionsResult.error) throw completionsResult.error;

  const items = ((itemsResult.data ?? []) as ItemRow[]).map(mapItem);
  const completions = ((completionsResult.data ?? []) as CompletionRow[]).map(mapCompletion);

  if (!includeInactive && items.length === 0 && completions.length === 0) return null;
  return { items, completions };
}

export async function upsertChecklistCompletion(
  completion: ChecklistCompletion,
): Promise<ChecklistCompletion> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build.");
  }

  const supabase = getSupabaseBrowserClient();
  const syncedAt = toUtcIso();
  const row: CompletionRow = {
    item_id: completion.itemId,
    period_key: completion.periodKey,
    checked_at: completion.checkedAt,
    checked_by_id: completion.checkedById,
    updated_at: syncedAt,
  };

  const { data, error } = await supabase
    .from("checklist_completions")
    .upsert(row, { onConflict: "item_id,period_key" })
    .select(COMPLETION_SELECT)
    .single();

  if (error) throw error;
  return mapCompletion(data as CompletionRow);
}

export async function insertChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build.");
  }
  const supabase = getSupabaseBrowserClient();
  const row = itemToRow({ ...item, updatedAt: toUtcIso() });
  const { data, error } = await supabase
    .from("checklist_items")
    .insert(row)
    .select(ITEM_SELECT)
    .single();
  if (error) throw error;
  return mapItem(data as ItemRow);
}

export async function updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build.");
  }
  const supabase = getSupabaseBrowserClient();
  const row = itemToRow({ ...item, updatedAt: toUtcIso() });
  const { data, error } = await supabase
    .from("checklist_items")
    .update(row)
    .eq("id", row.id)
    .select(ITEM_SELECT)
    .single();
  if (error) throw error;
  return mapItem(data as ItemRow);
}

export async function deleteChecklistItemHard(itemId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build.");
  }
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) throw error;
}

export {
  itemToRow,
  mapItem as mapChecklistItemFromRow,
  mapCompletion as mapChecklistCompletionFromRow,
};
