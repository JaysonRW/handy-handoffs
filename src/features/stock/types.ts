export type StockCategory = "TOOLS" | "CONSUMABLES" | "OTHER";
export type MovementType = "IN" | "OUT" | "ADJUST";

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: StockCategory;
  unit: string;
  qtyInStock: number;
  minStockLevel?: number;
  location?: string;
  photoUrl?: string;
  qrCodeId: string;
  nfcTagId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  synced: boolean;
}

export interface StockMovement {
  id: string;
  itemId: string;
  movementType: MovementType;
  qty: number;
  runningQty: number;
  reason?: string;
  actorId: string;
  relatedLoanId?: string;
  createdAt: string;
  synced: boolean;
}

export interface StockLoan {
  id: string;
  itemId: string;
  borrowerId: string;
  borrowerName: string;
  loanedAt: string;
  expectedReturnAt?: string;
  returnedAt?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface StockSnapshot {
  items: StockItem[];
  movements: StockMovement[];
  loans: StockLoan[];
}

export type StockPendingKind = "CREATE_ITEM" | "UPDATE_ITEM" | "MOVEMENT" | "LOAN_OPEN" | "LOAN_CLOSE";

export type StockPendingUpsert =
  | { kind: "CREATE_ITEM"; key: string; item: StockItem }
  | { kind: "UPDATE_ITEM"; key: string; item: StockItem }
  | { kind: "MOVEMENT"; key: string; movement: StockMovement }
  | { kind: "LOAN_OPEN"; key: string; loan: StockLoan }
  | { kind: "LOAN_CLOSE"; key: string; loanId: string; returnedAt: string; actorId: string };

export const DEFAULT_STOCK_UNIT = "UN";
