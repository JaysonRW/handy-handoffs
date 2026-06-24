import { createFileRoute } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useSyncStore } from "@/features/sync/store";
import { useTasksStore } from "@/features/tasks/store";
import { simulateOffline, triggerManualSync } from "@/features/sync/runtime";

export const Route = createFileRoute("/admin/sync")({
  head: () => ({ meta: [{ title: "Sync log · PMTMS Admin" }] }),
  component: SyncPage,
});

function SyncPage() {
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const history = useSyncStore((s) => s.history);
  const tasks = useTasksStore((s) => s.tasks);
  const pending = tasks.filter((task) => !task.synced);

  return (
    <AdminShell
      title="Sync log"
      subtitle={online ? "Connected — auto-sync is on" : "Offline — tasks queue locally"}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => simulateOffline(online)}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 focus-ring hover:bg-surface"
          >
            {online ? <><WifiOff className="size-3.5" />Simulate offline</> : <><Wifi className="size-3.5" />Go online</>}
          </button>
          <button
            onClick={triggerManualSync}
            disabled={!online || pending.length === 0 || syncing}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 focus-ring hover:bg-primary/90 disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync now
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="surface-card p-5">
          <h2 className="text-lg font-bold mb-3">Pending tasks ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">All caught up. No tasks waiting to sync.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((t) => (
                <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
                  <CloudOff className="size-4 text-primary" />
                  <span className="font-medium flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="surface-card p-5">
          <h2 className="text-lg font-bold mb-3">History</h2>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No sync events yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.id} className="text-xs flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span><span className="font-semibold">{h.count}</span> task{h.count !== 1 && "s"} · {h.trigger}</span>
                  <span className="text-muted-foreground">{format(new Date(h.at), "MMM d, HH:mm")}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
