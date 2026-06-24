import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { StaffShell } from "@/components/layout/StaffShell";
import { canSeeCreatedTasks, getUser } from "@/features/users/data";
import { useSyncStore } from "@/features/sync/store";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { simulateOffline, triggerManualSync } from "@/features/sync/runtime";

export const Route = createFileRoute("/staff/$userId/sync")({
  head: () => ({ meta: [{ title: "Sync · PMTMS" }] }),
  component: StaffSync,
});

function StaffSync() {
  const { userId } = Route.useParams();
  const user = getUser(userId)!;
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const history = useSyncStore((s) => s.history);
  const allTasks = useTasksStore((s) => s.tasks);
  const myTasks = useMemo(() => selectVisibleForStaff(userId)({ tasks: allTasks } as any), [allTasks, userId]);
  const pending = myTasks.filter((t) => !t.synced);

  return (
    <StaffShell userId={userId} title="Sync status" subtitle={online ? "Connected" : "Offline — queueing locally"}>
      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="surface-card p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold inline-flex items-center gap-2">
              {online ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-primary" />}
              {online ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pending.length} {canSeeCreatedTasks(user.role) ? "visible tasks" : "assigned tasks"} waiting to sync
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => simulateOffline(online)}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold focus-ring"
            >
              {online ? "Simulate offline" : "Go online"}
            </button>
            <button
              onClick={triggerManualSync}
              disabled={!online || pending.length === 0 || syncing}
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold focus-ring inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync now
            </button>
          </div>
        </div>

        <section className="surface-card p-4">
          <h2 className="text-sm font-bold mb-2">Pending sync</h2>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">All your tasks are synced.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((t) => (
                <li key={t.id} className="py-2 flex items-center gap-2 text-sm">
                  <CloudOff className="size-4 text-primary" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card p-4">
          <h2 className="text-sm font-bold mb-2">Sync history</h2>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No sync events yet.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {history.slice(0, 20).map((h) => (
                <li key={h.id} className="text-xs flex items-center justify-between border-b border-border pb-1.5 last:border-0">
                  <span><span className="font-semibold">{h.count}</span> task{h.count !== 1 && "s"} synced ({h.trigger})</span>
                  <span className="text-muted-foreground">{format(new Date(h.at), "MMM d, HH:mm")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </StaffShell>
  );
}
