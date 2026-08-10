import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Repeat2, ArrowLeft, Check, PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStockStore } from "../store";
import { nanoid } from "@/lib/id";
import type { ItemDraft } from "../store";
import type { StockCategory, StockItem } from "../types";
import { DEFAULT_STOCK_UNIT } from "../types";
import { StockQrCodeView } from "./StockQrCodeView";

export function NewItemDialog({
  open,
  onOpenChange,
  actorId,
  editTarget,
  onEditSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: string;
  editTarget?: StockItem | null;
  onEditSaved?: () => void;
}) {
  const items = useStockStore((s) => s.items);
  const registerItem = useStockStore((s) => s.registerItem);
  const editItem = useStockStore((s) => s.editItem);
  const isEdit = !!editTarget;

  type DialogMode = "form" | "qrcode";
  const [mode, setMode] = useState<DialogMode>("form");
  const [savedItem, setSavedItem] = useState<StockItem | null>(null);

  const nextSku = useMemo(() => {
    if (isEdit) return editTarget.sku;
    const nums = items
      .map((i) => i.sku)
      .map((s) => /(\d+)/.exec(s)?.[1])
      .filter((x): x is string => !!x)
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isFinite(n));
    const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
    const prefix = "PMTMS";
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }, [items, isEdit, editTarget]);

  function buildInitialForm(): ItemDraft {
    if (isEdit) {
      return {
        sku: editTarget.sku,
        name: editTarget.name,
        description: editTarget.description ?? "",
        category: editTarget.category,
        unit: editTarget.unit,
        qtyInStock: editTarget.qtyInStock,
        minStockLevel: editTarget.minStockLevel,
        location: editTarget.location ?? "",
        photoUrl: editTarget.photoUrl ?? "",
        nfcTagId: editTarget.nfcTagId ?? "",
        qrCodeId: editTarget.qrCodeId,
      };
    }
    return {
      sku: nextSku,
      name: "",
      description: "",
      category: "TOOLS",
      unit: DEFAULT_STOCK_UNIT,
      qtyInStock: 1,
      minStockLevel: undefined,
      location: "",
      photoUrl: "",
      nfcTagId: "",
      qrCodeId: `QR-${nextSku}`,
    };
  }

  const [form, setForm] = useState<ItemDraft>(() => buildInitialForm());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm());
      setError(null);
      setMode("form");
      setSavedItem(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editTarget?.id]);

  function update<K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForNext() {
    const suffix = nanoid(4).toUpperCase();
    setForm({
      sku: nextSku,
      name: "",
      description: "",
      category: "TOOLS",
      unit: DEFAULT_STOCK_UNIT,
      qtyInStock: 1,
      minStockLevel: undefined,
      location: "",
      photoUrl: "",
      nfcTagId: "",
      qrCodeId: `QR-${nextSku}-${suffix}`,
    });
    setError(null);
  }

  function handleSave(andAnother: boolean) {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }
    const qty = Number(form.qtyInStock);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Qty in stock must be a positive number or zero.");
      return;
    }
    const skuLowerCase = form.sku.trim().toLowerCase();
    const skuClash = items.some(
      (i) => i.id !== (editTarget?.id ?? "") && i.sku.toLowerCase() === skuLowerCase,
    );
    if (skuClash) {
      setError("This SKU already exists on another item.");
      return;
    }
    try {
      const draft: ItemDraft = {
        ...form,
        sku: form.sku.trim(),
        unit: DEFAULT_STOCK_UNIT,
        qtyInStock: Math.max(0, qty),
        minStockLevel: undefined,
        location: form.location?.trim() || undefined,
        photoUrl: form.photoUrl?.trim() || undefined,
        nfcTagId: form.nfcTagId?.trim() || undefined,
        qrCodeId: (form.qrCodeId ?? `QR-${nanoid(10).toUpperCase()}`).trim(),
      };
      if (isEdit) {
        const res = editItem(editTarget.id, draft, actorId);
        if (!res) {
          setError("Could not update item. SKU clash or item is inactive.");
          return;
        }
      } else {
        const created = registerItem(draft, actorId);
        if (!andAnother) {
          setSavedItem(created.item);
          setMode("qrcode");
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    if (isEdit) {
      onOpenChange(false);
      onEditSaved?.();
      return;
    }
    if (andAnother) {
      resetForNext();
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          {mode === "form" ? (
            <>
              <DialogTitle>
                {isEdit ? (
                  <span className="inline-flex items-center gap-2">
                    <Edit2 className="size-5" /> Edit stock item
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-5" /> New stock item
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update item metadata, quantity, location or IDs."
                  : "Add a tool, piece of equipment, or consumable. A unique QR code ID is generated automatically."}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>
                <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-5" /> Item saved · Step 2/2
                </span>
              </DialogTitle>
              <DialogDescription>
                Print the QR sticker now and glue it to the physical item. You can also print it later from the item detail page.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <div className="max-h-[calc(92dvh-160px)] overflow-y-auto -mx-6 px-6">
          {mode === "form" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                <label className="sm:col-span-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">SKU</span>
                  <input
                    className="input mt-1"
                    value={form.sku}
                    onChange={(e) => update("sku", e.target.value)}
                    maxLength={64}
                  />
                </label>
                <label className="sm:col-span-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Category</span>
                  <select
                    className="input mt-1"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value as StockCategory)}
                  >
                    <option value="TOOLS">Tools / Equipment</option>
                    <option value="CONSUMABLES">Consumables (lamp, bags…)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label className="sm:col-span-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Name</span>
                  <input
                    className="input mt-1"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Hammer 23mm claw"
                    maxLength={140}
                    autoFocus
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Description (optional)</span>
                  <input
                    className="input mt-1"
                    value={form.description ?? ""}
                    onChange={(e) => update("description", e.target.value)}
                    maxLength={240}
                  />
                </label>

                <label>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Qty in stock</span>
                  <input
                    type="number"
                    className="input mt-1"
                    min={0}
                    value={form.qtyInStock}
                    onChange={(e) => update("qtyInStock", Number(e.target.value))}
                  />
                </label>

                <label>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Location</span>
                  <input
                    className="input mt-1"
                    value={form.location ?? ""}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="Cabinet A · Drawer 1"
                    maxLength={140}
                  />
                </label>

                <label className="sm:col-span-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">QR code ID (auto)</span>
                  <input
                    className="input mt-1 font-mono"
                    value={form.qrCodeId ?? ""}
                    onChange={(e) => update("qrCodeId", e.target.value)}
                    maxLength={64}
                  />
                </label>
                <label className="sm:col-span-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">NFC tag ID (optional / future)</span>
                  <input
                    className="input mt-1 font-mono"
                    value={form.nfcTagId ?? ""}
                    onChange={(e) => update("nfcTagId", e.target.value)}
                    placeholder="Leave blank for now"
                    maxLength={64}
                  />
                </label>
              </div>

              {error ? (
                <p className="mt-3 text-xs text-[color:var(--color-p1)]">{error}</p>
              ) : null}
            </>
          ) : savedItem ? (
            <div className="mt-2">
              <StockQrCodeView item={savedItem} mode="inlineCard" />
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-5">
          {mode === "form" ? (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={buttonVariants({ variant: "ghost" })}
              >
                Cancel
              </button>
              {!isEdit ? (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  <Repeat2 className="size-4" /> Save &amp; another
                </button>
              ) : null}
              <Button onClick={() => handleSave(false)}>
                {isEdit ? <><Edit2 className="size-4" /> Save changes</> : <><Plus className="size-4" /> Save item</>}
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  resetForNext();
                  setMode("form");
                  setSavedItem(null);
                }}
                className={buttonVariants({ variant: "secondary" })}
              >
                <PackagePlus className="size-4" /> Register another
              </button>
              <Button onClick={() => onOpenChange(false)}>
                <Check className="size-4" /> Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
