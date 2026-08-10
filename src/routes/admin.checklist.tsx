import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { ShellActionsMenu } from "@/components/layout/ShellActionsMenu";
import { SyncIndicator } from "@/features/sync/SyncIndicator";
import { ChecklistAdminList } from "@/features/checklist/components/ChecklistAdminList";
import { ChecklistItemDialog } from "@/features/checklist/components/ChecklistItemDialog";
import { useState } from "react";
import { useChecklistStore } from "@/features/checklist/store";
import { fetchChecklistSnapshot } from "@/features/checklist/supabase";
import { hydrateChecklistFromSupabase, triggerManualSync } from "@/features/sync/runtime";

const ADMIN_ACTOR_ID = "u_admin";

export const Route = createFileRoute("/admin/checklist")({
  head: () => ({ meta: [{ title: "Checklist · PMTMS Admin" }] }),
  component: AdminChecklistIndex,
});

function AdminChecklistIndex() {
  const [openNew, setOpenNew] = useState(false);
  const lastError = useChecklistStore((s) => s.lastError);
  const hydrate = useChecklistStore((s) => s.hydrateFromServer);

  useEffect(() => {
    void (async () => {
      try {
        const snap = await fetchChecklistSnapshot({ includeInactive: true });
        if (snap) hydrate(snap);
        else await hydrateChecklistFromSupabase();
      } catch {
        await hydrateChecklistFromSupabase();
      }
      void triggerManualSync();
    })();
  }, [hydrate]);

  return (
    <AdminShell
      title="Checklist items"
      subtitle="Manage the Caretaker daily & weekly checklist. Use ↑↓ to reorder, enable/disable to archive or restore."
      actions={
        <ShellActionsMenu
          menuLabel="Checklist actions"
          items={[
            {
              key: "sync",
              label: "Sync status",
              labelOnly: true,
              node: <SyncIndicator />,
            },
            {
              key: "new",
              label: "New item",
              icon: CheckSquare2,
              onClick: () => setOpenNew(true),
              variant: "default",
            },
          ]}
        >
          <SyncIndicator />
          <button
            type="button"
            onClick={() => setOpenNew(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus-ring"
          >
            <CheckSquare2 className="size-4" /> New item
          </button>
        </ShellActionsMenu>
      }
    >
      {lastError ? (
        <div className="mb-4 surface-card border border-[color:var(--color-p1)]/40 bg-[color:var(--color-p1)]/5 p-3 text-sm text-[color:var(--color-p1)] rounded-lg whitespace-pre-wrap">
          {lastError}
        </div>
      ) : null}

      <div className="mt-2">
        <ChecklistAdminList actorId={ADMIN_ACTOR_ID} />
      </div>

      <ChecklistItemDialog
        open={openNew}
        onOpenChange={setOpenNew}
        actorId={ADMIN_ACTOR_ID}
        editTarget={null}
      />
    </AdminShell>
  );
}
