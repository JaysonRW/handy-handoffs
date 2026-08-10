import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";
import type {
  StockItem,
  StockLoan,
  StockMovement,
  StockPendingUpsert,
  StockSnapshot,
} from "./types";

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
export const stockPendingKey = (kind: StockPendingUpsert["kind"], id: string) => `${kind}::${id}`;

export type LendDraft = { borrowerId: string; borrowerName: string; expectedReturnAt?: string; notes?: string };
export type MovementDraft = { movementType: "IN" | "OUT" | "ADJUST"; qty: number; reason?: string };
export type ItemDraft = Omit<StockItem, "id" | "qrCodeId" | "active" | "createdAt" | "updatedAt" | "synced"> & {
  qrCodeId?: string;
};

type StockState = {
  items: StockItem[];
  movements: StockMovement[];
  loans: StockLoan[];
  hydratedFromServerAt?: string;
  pendingUpserts: string[];
  lastError?: string;

  hydrateFromServer: (snapshot: StockSnapshot) => void;
  setLastError: (error: string | undefined) => void;
  resetLocal: () => void;
  getPendingUpserts: () => StockPendingUpsert[];

  registerItem: (draft: ItemDraft, actorId: string) => { item: StockItem; upsertKey: string };
  editItem: (itemId: string, draft: Partial<ItemDraft>, actorId: string) => { item: StockItem; upsertKey: string } | null;
  markItemInactive: (itemId: string, actorId: string) => string | null;

  recordMovement: (itemId: string, draft: MovementDraft, actorId: string) => { movement: StockMovement; upsertKey: string } | null;

  lendItem: (itemId: string, draft: LendDraft, actorId: string) => { loan: StockLoan; upsertKey: string } | null;
  returnLoan: (loanId: string, actorId: string) => { upsertKey: string } | null;

  markUpsertDone: (key: string, opts?: { replaced?: Partial<StockItem | StockMovement | StockLoan> }) => void;
  markUpsertFailed: (key: string, error: string) => void;
};

function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  base: T[],
  incoming: T[],
): T[] {
  const map = new Map(base.map((x) => [x.id, x] as const));
  for (const srv of incoming) {
    const local = map.get(srv.id);
    if (!local) {
      map.set(srv.id, srv);
      continue;
    }
    const srvDate = new Date((srv as any).updatedAt ?? (srv as any).createdAt ?? 0).getTime();
    const localDate = new Date((local as any).updatedAt ?? (local as any).createdAt ?? 0).getTime();
    map.set(srv.id, srvDate >= localDate ? srv : local);
  }
  return Array.from(map.values());
}

function nextRunningQty(item: StockItem, movements: StockMovement[], movementType: "IN" | "OUT" | "ADJUST", qty: number): number {
  if (movementType === "ADJUST") return qty;
  const delta = movementType === "IN" ? Math.abs(qty) : -Math.abs(qty);
  return item.qtyInStock + delta;
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      items: [],
      movements: [],
      loans: [],
      hydratedFromServerAt: undefined,
      pendingUpserts: [],
      lastError: undefined,

      hydrateFromServer: (snapshot) => {
        const state = get();
        const mergedItems = mergeById(state.items, snapshot.items).sort(
          (a, b) => a.name.localeCompare(b.name),
        );
        const mergedMovements = mergeById(state.movements, snapshot.movements).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const mergedLoans = mergeById(state.loans, snapshot.loans).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        set({
          items: mergedItems,
          movements: mergedMovements,
          loans: mergedLoans,
          hydratedFromServerAt: iso(now()),
          lastError: undefined,
        });
      },

      setLastError: (error) => set({ lastError: error }),

      resetLocal: () =>
        set({
          items: [],
          movements: [],
          loans: [],
          hydratedFromServerAt: undefined,
          pendingUpserts: [],
          lastError: undefined,
        }),

      getPendingUpserts: () => {
        const state = get();
        const out: StockPendingUpsert[] = [];
        for (const key of state.pendingUpserts) {
          const [kind, id] = key.split("::") as [StockPendingUpsert["kind"], string];
          if (kind === "CREATE_ITEM") {
            const item = state.items.find((x) => x.id === id);
            if (item) out.push({ kind, key, item });
          } else if (kind === "MOVEMENT") {
            const movement = state.movements.find((x) => x.id === id);
            if (movement) out.push({ kind, key, movement });
          } else if (kind === "LOAN_OPEN") {
            const loan = state.loans.find((x) => x.id === id);
            if (loan) out.push({ kind, key, loan });
          } else if (kind === "LOAN_CLOSE") {
            const loan = state.loans.find((x) => x.id === id);
            if (loan?.returnedAt) {
              out.push({ kind, key, loanId: id, returnedAt: loan.returnedAt, actorId: loan.createdById });
            }
          }
        }
        return out;
      },

      registerItem: (draft, actorId) => {
        const d = now();
        const id = draft.id ?? `stk_${nanoid(10)}`;
        const qrCodeId = draft.qrCodeId ?? `QR-${id.toUpperCase()}`;
        const item: StockItem = {
          id,
          sku: draft.sku.trim(),
          name: draft.name.trim(),
          description: draft.description,
          category: draft.category,
          unit: draft.unit,
          qtyInStock: Math.max(0, draft.qtyInStock),
          minStockLevel: draft.minStockLevel,
          location: draft.location,
          photoUrl: draft.photoUrl,
          qrCodeId,
          nfcTagId: draft.nfcTagId,
          active: true,
          createdAt: iso(d),
          updatedAt: iso(d),
          createdById: actorId,
          synced: false,
        };
        const key = stockPendingKey("CREATE_ITEM", item.id);
        set((s) => ({
          items: [item, ...s.items.filter((x) => x.id !== item.id)].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
          lastError: undefined,
        }));
        return { item, upsertKey: key };
      },

      editItem: (itemId, patch, actorId) => {
        const state = get();
        const existing = state.items.find((x) => x.id === itemId);
        if (!existing) return null;
        if (!existing.active) return null;

        let nextSku = existing.sku;
        let nextName = existing.name;
        if (patch.sku !== undefined) {
          if (patch.sku.trim().length === 0) return null;
          nextSku = patch.sku.trim();
        }
        if (patch.name !== undefined) {
          if (patch.name.trim().length === 0) return null;
          nextName = patch.name.trim();
        }

        if (nextSku !== existing.sku) {
          const skuClash = state.items.some(
            (i) => i.id !== existing.id && i.sku === nextSku,
          );
          if (skuClash) return null;
        }

        const d = now();
        const updated: StockItem = {
          ...existing,
          sku: nextSku,
          name: nextName,
          description: patch.description !== undefined ? patch.description : existing.description,
          category: patch.category ?? existing.category,
          unit: patch.unit ?? existing.unit,
          qtyInStock: patch.qtyInStock !== undefined ? Math.max(0, patch.qtyInStock) : existing.qtyInStock,
          minStockLevel: patch.minStockLevel !== undefined ? patch.minStockLevel : existing.minStockLevel,
          location: patch.location !== undefined ? patch.location : existing.location,
          photoUrl: patch.photoUrl !== undefined ? patch.photoUrl : existing.photoUrl,
          qrCodeId: patch.qrCodeId !== undefined && patch.qrCodeId.trim().length > 0
            ? patch.qrCodeId.trim()
            : existing.qrCodeId,
          nfcTagId: patch.nfcTagId !== undefined ? patch.nfcTagId : existing.nfcTagId,
          updatedAt: iso(d),
          synced: false,
        };

        const createPending = state.pendingUpserts.includes(stockPendingKey("CREATE_ITEM", existing.id));
        const kind: "CREATE_ITEM" | "UPDATE_ITEM" = createPending ? "CREATE_ITEM" : "UPDATE_ITEM";
        const key = stockPendingKey(kind, existing.id);

        set((s) => ({
          items: s.items
            .map((x) => (x.id === existing.id ? updated : x))
            .sort((a, b) => a.name.localeCompare(b.name)),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
          lastError: undefined,
        }));
        return { item: updated, upsertKey: key };
      },

      markItemInactive: (itemId, _actorId) => {
        const state = get();
        const item = state.items.find((x) => x.id === itemId);
        if (!item) return null;
        const createPending = state.pendingUpserts.includes(stockPendingKey("CREATE_ITEM", item.id));
        const kind: "CREATE_ITEM" | "UPDATE_ITEM" = createPending ? "CREATE_ITEM" : "UPDATE_ITEM";
        const key = stockPendingKey(kind, item.id);
        set((s) => ({
          items: s.items.map((x) =>
            x.id === itemId ? { ...x, active: false, updatedAt: iso(now()), synced: false } : x,
          ),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
        }));
        return key;
      },

      recordMovement: (itemId, draft, actorId) => {
        const state = get();
        const item = state.items.find((x) => x.id === itemId);
        if (!item) return null;
        const qty = draft.movementType === "OUT" ? -Math.abs(draft.qty) : Math.abs(draft.qty);
        const running = nextRunningQty(item, state.movements, draft.movementType, qty);
        if (running < 0) return null;
        const id = `mov_${nanoid(12)}`;
        const movement: StockMovement = {
          id,
          itemId,
          movementType: draft.movementType,
          qty,
          runningQty: running,
          reason: draft.reason,
          actorId,
          createdAt: iso(now()),
          synced: false,
        };
        const key = stockPendingKey("MOVEMENT", id);
        set((s) => ({
          items: s.items.map((x) =>
            x.id === itemId ? { ...x, qtyInStock: running, updatedAt: movement.createdAt, synced: false } : x,
          ),
          movements: [movement, ...s.movements.filter((x) => x.id !== id)],
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key, stockPendingKey("CREATE_ITEM", itemId)])),
          lastError: undefined,
        }));
        return { movement, upsertKey: key };
      },

      lendItem: (itemId, draft, actorId) => {
        const state = get();
        const item = state.items.find((x) => x.id === itemId);
        if (!item) return null;
        if (item.category !== "TOOLS" && item.category !== "OTHER") return null;
        if (item.qtyInStock < 1) return null;
        const openLoans = state.loans.filter((l) => l.itemId === itemId && !l.returnedAt);
        if (openLoans.length >= item.qtyInStock) return null;
        const d = now();
        const id = `loan_${nanoid(12)}`;
        const loan: StockLoan = {
          id,
          itemId,
          borrowerId: draft.borrowerId,
          borrowerName: draft.borrowerName,
          loanedAt: iso(d),
          expectedReturnAt: draft.expectedReturnAt,
          returnedAt: undefined,
          notes: draft.notes,
          createdById: actorId,
          createdAt: iso(d),
          updatedAt: iso(d),
          synced: false,
        };
        const key = stockPendingKey("LOAN_OPEN", id);
        set((s) => ({
          loans: [loan, ...s.loans.filter((x) => x.id !== id)],
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key])),
          lastError: undefined,
        }));
        return { loan, upsertKey: key };
      },

      returnLoan: (loanId, actorId) => {
        const state = get();
        const loan = state.loans.find((x) => x.id === loanId);
        if (!loan || loan.returnedAt) return null;
        const ret = iso(now());
        const key = stockPendingKey("LOAN_CLOSE", loanId);
        set((s) => ({
          loans: s.loans.map((l) =>
            l.id === loanId ? { ...l, returnedAt: ret, updatedAt: ret, synced: false } : l,
          ),
          pendingUpserts: Array.from(new Set([...s.pendingUpserts, key, stockPendingKey("LOAN_OPEN", loanId)])),
          lastError: undefined,
          _actorId: actorId,
        } as any));
        return { upsertKey: key };
      },

      markUpsertDone: (key) => {
        const [kind, id] = key.split("::") as [StockPendingUpsert["kind"], string];
        set((s) => {
          const pendingUpserts = s.pendingUpserts.filter((k) => k !== key);
          if (kind === "CREATE_ITEM") {
            return {
              pendingUpserts,
              items: s.items.map((x) => (x.id === id ? { ...x, synced: true } : x)),
            };
          }
          if (kind === "MOVEMENT") {
            return {
              pendingUpserts,
              movements: s.movements.map((x) => (x.id === id ? { ...x, synced: true } : x)),
            };
          }
          if (kind === "LOAN_OPEN") {
            return {
              pendingUpserts,
              loans: s.loans.map((l) => (l.id === id ? { ...l, synced: true } : l)),
            };
          }
          if (kind === "LOAN_CLOSE") {
            return {
              pendingUpserts,
              loans: s.loans.map((l) => (l.id === id ? { ...l, synced: true } : l)),
            };
          }
          return { pendingUpserts };
        });
      },

      markUpsertFailed: (_key, error) => set({ lastError: error }),
    }),
    { name: "pmtms.stock.v1" },
  ),
);

export function openLoansForItem(loans: StockLoan[], itemId: string): StockLoan[] {
  return loans.filter((l) => l.itemId === itemId && !l.returnedAt);
}

export function isOverdueLoan(loan: StockLoan, nowDate = now()): boolean {
  if (loan.returnedAt) return false;
  const due = loan.expectedReturnAt
    ? new Date(loan.expectedReturnAt).getTime()
    : new Date(loan.loanedAt).getTime() + 48 * 3_600_000;
  return nowDate.getTime() > due;
}

export function overdueLoans(loans: StockLoan[], nowDate = now()): StockLoan[] {
  return loans.filter((l) => isOverdueLoan(l, nowDate));
}

export function lowStockItems(items: StockItem[]): StockItem[] {
  return items.filter(
    (i) =>
      i.active &&
      (i.category === "CONSUMABLES" ? i.qtyInStock : 1) <= (i.minStockLevel ?? 0),
  );
}
