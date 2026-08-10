import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  StockItem,
  StockLoan,
  StockMovement,
  StockSnapshot,
} from "./types";

export type StockItemRow = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: StockItem["category"];
  unit: string;
  qty_in_stock: number;
  min_stock_level: number | null;
  location: string | null;
  photo_url: string | null;
  qr_code_id: string;
  nfc_tag_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
};

export type StockMovementRow = {
  id: string;
  item_id: string;
  movement_type: StockMovement["movementType"];
  qty: number;
  running_qty: number;
  reason: string | null;
  actor_id: string;
  related_loan_id: string | null;
  created_at: string;
};

export type StockLoanRow = {
  id: string;
  item_id: string;
  borrower_id: string;
  borrower_name: string;
  loaned_at: string;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
};

const ITEMS_SELECT =
  "id,sku,name,description,category,unit,qty_in_stock,min_stock_level,location,photo_url,qr_code_id,nfc_tag_id,active,created_at,updated_at,created_by_id";
const MOVEMENTS_SELECT = "id,item_id,movement_type,qty,running_qty,reason,actor_id,related_loan_id,created_at";
const LOANS_SELECT =
  "id,item_id,borrower_id,borrower_name,loaned_at,expected_return_at,returned_at,notes,created_by_id,created_at,updated_at";

function mapItem(row: StockItemRow): StockItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category,
    unit: row.unit,
    qtyInStock: row.qty_in_stock,
    minStockLevel: row.min_stock_level ?? undefined,
    location: row.location ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    qrCodeId: row.qr_code_id,
    nfcTagId: row.nfc_tag_id ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdById: row.created_by_id ?? undefined,
    synced: true,
  };
}

function mapMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    movementType: row.movement_type,
    qty: row.qty,
    runningQty: row.running_qty,
    reason: row.reason ?? undefined,
    actorId: row.actor_id,
    relatedLoanId: row.related_loan_id ?? undefined,
    createdAt: row.created_at,
    synced: true,
  };
}

function mapLoan(row: StockLoanRow): StockLoan {
  return {
    id: row.id,
    itemId: row.item_id,
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
    loanedAt: row.loaned_at,
    expectedReturnAt: row.expected_return_at ?? undefined,
    returnedAt: row.returned_at ?? undefined,
    notes: row.notes ?? undefined,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
  };
}

function itemToRow(item: StockItem): StockItemRow {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description ?? null,
    category: item.category,
    unit: item.unit,
    qty_in_stock: item.qtyInStock,
    min_stock_level: item.minStockLevel ?? null,
    location: item.location ?? null,
    photo_url: item.photoUrl ?? null,
    qr_code_id: item.qrCodeId,
    nfc_tag_id: item.nfcTagId ?? null,
    active: item.active,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    created_by_id: item.createdById ?? null,
  };
}

function movementToRow(m: StockMovement): StockMovementRow {
  return {
    id: m.id,
    item_id: m.itemId,
    movement_type: m.movementType,
    qty: m.qty,
    running_qty: m.runningQty,
    reason: m.reason ?? null,
    actor_id: m.actorId,
    related_loan_id: m.relatedLoanId ?? null,
    created_at: m.createdAt,
  };
}

function loanToRow(l: StockLoan): StockLoanRow {
  return {
    id: l.id,
    item_id: l.itemId,
    borrower_id: l.borrowerId,
    borrower_name: l.borrowerName,
    loaned_at: l.loanedAt,
    expected_return_at: l.expectedReturnAt ?? null,
    returned_at: l.returnedAt ?? null,
    notes: l.notes ?? null,
    created_by_id: l.createdById,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export async function fetchStockSnapshot(): Promise<StockSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseBrowserClient();

  const [itemsRes, movesRes, loansRes] = await Promise.all([
    supabase.from("stock_items").select(ITEMS_SELECT).order("name", { ascending: true }),
    supabase
      .from("stock_movements")
      .select(MOVEMENTS_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("stock_loans")
      .select(LOANS_SELECT)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (movesRes.error) throw movesRes.error;
  if (loansRes.error) throw loansRes.error;

  return {
    items: (itemsRes.data ?? []).map(mapItem),
    movements: (movesRes.data ?? []).map(mapMovement),
    loans: (loansRes.data ?? []).map(mapLoan),
  };
}

export async function upsertStockItem(item: StockItem): Promise<StockItem> {
  const supabase = getSupabaseBrowserClient();
  const row = itemToRow(item);
  const res = await supabase
    .from("stock_items")
    .upsert(row, { onConflict: "id" })
    .select(ITEMS_SELECT)
    .single();
  if (res.error) throw res.error;
  return mapItem(res.data as StockItemRow);
}

export async function upsertMovement(movement: StockMovement): Promise<StockMovement> {
  const supabase = getSupabaseBrowserClient();
  const row = movementToRow(movement);
  const res = await supabase
    .from("stock_movements")
    .upsert(row, { onConflict: "id" })
    .select(MOVEMENTS_SELECT)
    .single();
  if (res.error) throw res.error;
  return mapMovement(res.data as StockMovementRow);
}

export async function upsertLoanOpen(loan: StockLoan): Promise<StockLoan> {
  const supabase = getSupabaseBrowserClient();
  const row = loanToRow(loan);
  const res = await supabase
    .from("stock_loans")
    .upsert(row, { onConflict: "id" })
    .select(LOANS_SELECT)
    .single();
  if (res.error) throw res.error;
  return mapLoan(res.data as StockLoanRow);
}

export async function upsertLoanClose(loanId: string, returnedAt: string): Promise<StockLoan> {
  const supabase = getSupabaseBrowserClient();
  const res = await supabase
    .from("stock_loans")
    .update({ returned_at: returnedAt, updated_at: returnedAt })
    .eq("id", loanId)
    .select(LOANS_SELECT)
    .single();
  if (res.error) throw res.error;
  return mapLoan(res.data as StockLoanRow);
}
