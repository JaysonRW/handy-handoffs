import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStockStore } from "../store";
import { nanoid } from "@/lib/id";
import type { ItemDraft } from "../store";
import type { StockCategory } from "../types";
import { DEFAULT_STOCK_UNIT } from "../types";

export function NewItemDialog({
  open,
  onOpenChange,
  actorId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: string;
}) {
  const items = useStockStore((s) => s.items);
  const registerItem = useStockStore((s) => s.registerItem);

  const nextSku = useMemo(() => {
    const nums = items
      .map((i) => i.sku)
      .map((s) => /(\d+)/.exec(s)?.[1])
      .filter((x): x is string => !!x)
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isFinite(n));
    const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
    const prefix = "PMTMS";
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }, [items]);

  const [form, setForm] = useState<ItemDraft>(() => ({
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
  }));
  const [error, setError] = useState<string | null>(null);

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
    try {
      const draft: ItemDraft = {
        ...form,
        sku: form.sku.trim(),
        qtyInStock: Math.max(0, qty),
        minStockLevel:
          form.minStockLevel === undefined || form.minStockLevel === null || form.minStockLevel === ""
            ? undefined
            : Number(form.minStockLevel),
        location: form.location?.trim() || undefined,
        photoUrl: form.photoUrl?.trim() || undefined,
        nfcTagId: form.nfcTagId?.trim() || undefined,
        qrCodeId: (form.qrCodeId ?? `QR-${nanoid(10).toUpperCase()}`).trim(),
      };
      registerItem(draft, actorId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
          <DialogTitle>New stock item</DialogTitle>
          <DialogDescription>
            Add a tool, piece of equipment, or consumable. A unique QR code ID is generated automatically.
          </DialogDescription>
        </DialogHeader>

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
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Unit (UN, CX, KG, MT…)</span>
            <input
              className="input mt-1"
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              maxLength={8}
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
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Min stock level (optional)</span>
            <input
              type="number"
              className="input mt-1"
              min={0}
              value={form.minStockLevel ?? ""}
              onChange={(e) =>
                update("minStockLevel", e.target.value === "" ? undefined : Number(e.target.value))
              }
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

          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Photo URL (optional)</span>
            <input
              className="input mt-1"
              value={form.photoUrl ?? ""}
              onChange={(e) => update("photoUrl", e.target.value)}
              placeholder="https://… (public image)"
              maxLength={260}
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

        <DialogFooter className="mt-5">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className={buttonVariants({ variant: "secondary" })}
          >
            Save & another
          </button>
          <Button onClick={() => handleSave(false)}>Save item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
