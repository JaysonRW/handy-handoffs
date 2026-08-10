import { useEffect, useState } from "react";
import { Edit2, Plus, Repeat2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useChecklistStore, type ChecklistItemDraft } from "../store";
import type { ChecklistItem, ChecklistPeriodType, WeekdayRule } from "../types";
import { WEEKDAY_RULES } from "../types";

type ChecklistStatus = "ACTIVE" | "INACTIVE" | "ALL";

type ChecklistFilterState = {
  search: string;
  status: ChecklistStatus;
};

export function ChecklistItemDialog({
  open,
  onOpenChange,
  actorId,
  editTarget,
  onEditSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: string;
  editTarget?: ChecklistItem | null;
  onEditSaved?: () => void;
}) {
  const items = useChecklistStore((s) => s.items);
  const addItem = useChecklistStore((s) => s.addItem);
  const editItem = useChecklistStore((s) => s.editItem);
  const isEdit = !!editTarget;

  function buildInitial(): ChecklistItemDraft {
    if (isEdit) {
      return {
        title: editTarget.title,
        periodType: editTarget.periodType,
        periodRule: editTarget.periodRule,
        buildingId: editTarget.buildingId,
        sortOrder: editTarget.sortOrder,
        active: editTarget.active,
      };
    }
    return {
      title: "",
      periodType: "DAILY",
      periodRule: undefined,
      buildingId: "MASTER",
      active: true,
    };
  }

  const [form, setForm] = useState<ChecklistItemDraft>(() => buildInitial());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitial());
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editTarget?.id]);

  function update<K extends keyof ChecklistItemDraft>(k: K, v: ChecklistItemDraft[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForNext() {
    const nextSort =
      items.length === 0 ? 0 : Math.max(...items.map((it) => it.sortOrder)) + 1;
    setForm({
      title: "",
      periodType: "DAILY",
      periodRule: undefined,
      buildingId: "MASTER",
      sortOrder: nextSort,
      active: true,
    });
    setError(null);
  }

  function handleSave(andAnother: boolean) {
    const title = form.title.trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (title.length > 240) {
      setError("Title too long (max 240 characters).");
      return;
    }
    const periodRule =
      form.periodType === "WEEKLY"
        ? (form.periodRule as WeekdayRule | undefined) ?? undefined
        : undefined;
    const draft: ChecklistItemDraft = {
      title,
      periodType: form.periodType as ChecklistPeriodType,
      periodRule,
      buildingId: form.buildingId ?? "MASTER",
      sortOrder: form.sortOrder,
      active: form.active ?? true,
    };
    try {
      if (isEdit) {
        const res = editItem(editTarget.id, draft, actorId);
        if (!res) {
          setError("Could not update item.");
          return;
        }
      } else {
        addItem(draft, actorId);
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
          <DialogTitle>
            {isEdit ? (
              <span className="inline-flex items-center gap-2">
                <Edit2 className="size-5" /> Edit checklist item
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Plus className="size-5" /> New checklist item
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update title, period, or order. The Caretaker list will reflect changes on next sync."
              : "Create an item that will appear on the Caretaker daily & weekly checklist."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(92dvh-160px)] overflow-y-auto -mx-6 px-6">
          <div className="grid gap-3 sm:grid-cols-2 mt-2">
            <label className="sm:col-span-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Title *</span>
              <input
                className="input mt-1"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Clean ground floor hallway"
                maxLength={240}
                autoFocus
              />
            </label>

            <label className="sm:col-span-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Period *</span>
              <select
                className="input mt-1"
                value={form.periodType}
                onChange={(e) =>
                  update("periodType", e.target.value as ChecklistPeriodType)
                }
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Every 15 days</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </label>

            <label className="sm:col-span-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
              <select
                className="input mt-1"
                value={(form.active ?? true) ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => update("active", e.target.value === "ACTIVE")}
              >
                <option value="ACTIVE">Active (shows for Caretaker)</option>
                <option value="INACTIVE">Archived (hidden)</option>
              </select>
            </label>

            {form.periodType === "WEEKLY" ? (
              <label className="sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Weekday (when WEEKLY)</span>
                <select
                  className="input mt-1"
                  value={form.periodRule ?? "MON"}
                  onChange={(e) => update("periodRule", e.target.value as WeekdayRule)}
                >
                  {WEEKDAY_RULES.map((w) => (
                    <option key={w} value={w}>
                      {labelWeekday(w)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="sm:col-span-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Sort order {isEdit ? "(editable)" : "(auto, editable after create)"}
              </span>
              <input
                type="number"
                className="input mt-1"
                min={0}
                value={form.sortOrder ?? 0}
                onChange={(e) => update("sortOrder", Number(e.target.value))}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-3 text-xs text-[color:var(--color-p1)]">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="mt-5">
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
            {isEdit ? (
              <>
                <Edit2 className="size-4" /> Save changes
              </>
            ) : (
              <>
                <Plus className="size-4" /> Create item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelWeekday(w: WeekdayRule): string {
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

export type { ChecklistFilterState };
