import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CloudOff, Inbox, ListChecks, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useTasksStore } from "@/features/tasks/store";
import { SyncIndicator } from "@/features/sync/SyncIndicator";
import { PriorityBadge } from "@/features/tasks/components/PriorityBadge";
import { StatusBadge } from "@/features/tasks/components/StatusBadge";
import { Avatar } from "@/features/users/Avatar";
import { getBlock, getFlat } from "@/features/blocks/data";
import { USERS } from "@/features/users/data";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Overview · PMTMS Admin" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const tasks = useTasksStore((s) => s.tasks);
  const activity = useTasksStore((s) => s.activity);
  const pending = tasks.filter((task) => !task.synced);

  const counts = {
    newQ: tasks.filter((t) => t.status === "NEW").length,
    doing: tasks.filter((t) => t.status === "DOING").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    p1: tasks.filter((t) => t.priority === "P1" && t.status !== "DONE").length,
  };

  const newest = tasks.filter((t) => t.status === "NEW").slice(0, 5);

  return (
    <AdminShell title="Operations overview" subtitle="Live status across all blocks" actions={<SyncIndicator />}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New (awaiting triage)" value={counts.newQ} icon={Inbox} tone="primary" href="/admin/tasks?status=NEW" />
        <Stat label="In progress" value={counts.doing} icon={ListChecks} tone="accent" href="/admin/tasks?status=DOING" />
        <Stat label="Completed" value={counts.done} icon={CheckCircle2} tone="success" href="/admin/tasks?status=DONE" />
        <Stat label="P1 open" value={counts.p1} icon={AlertTriangle} tone="danger" href="/admin/tasks?priority=P1" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="surface-card p-5">
          <header className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">New queue</h2>
              <p className="text-xs text-muted-foreground">Newest unprioritized tasks needing triage.</p>
            </div>
            <Link to="/admin/tasks" className="text-xs font-semibold text-primary inline-flex items-center gap-1">All tasks <ArrowRight className="size-3.5" /></Link>
          </header>
          {newest.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Inbox zero. Nothing to triage.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {newest.map((t) => {
                const block = getBlock(t.blockId);
                const flat = getFlat(t.blockId, t.flatId);
                return (
                  <li key={t.id}>
                    <Link to={`/admin/tasks/${t.id}` as any} className="flex items-center gap-3 py-3 hover:bg-surface-2/40 rounded-md px-2 -mx-2 focus-ring">
                      {t.photo ? (
                        <img src={t.photo} alt="" className="size-12 rounded-md object-cover border border-border" />
                      ) : (
                        <div className="size-12 rounded-md border border-dashed border-border" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PriorityBadge priority={t.priority} short />
                          <StatusBadge status={t.status} />
                          <span className="chip">{block?.name} · {flat?.label}</span>
                          {!t.synced && <span className="chip border-accent/40 bg-accent/15 text-accent-foreground"><CloudOff className="size-3" />Pending</span>}
                        </div>
                        <p className="mt-1 text-sm font-medium line-clamp-1">{t.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="surface-card p-5">
            <h3 className="text-sm font-bold">Pending sync</h3>
            <p className="text-xs text-muted-foreground mt-1">Local tasks waiting for connectivity.</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-3xl font-black tabular-nums">{pending.length}</span>
              <Link to="/admin/sync" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                Sync log <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="surface-card p-5">
            <h3 className="text-sm font-bold">Recent activity</h3>
            <ol className="mt-3 flex flex-col gap-2.5">
              {activity.slice(0, 8).map((a) => {
                const u = USERS.find((x) => x.id === a.actorId);
                return (
                  <li key={a.id} className="flex gap-2.5 items-start">
                    <Avatar userId={a.actorId} size={22} />
                    <div className="min-w-0">
                      <p className="text-xs"><span className="font-semibold">{u?.name ?? "System"}</span> · {a.message}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, icon: Icon, tone, href }: { label: string; value: number; icon: any; tone: "primary" | "accent" | "success" | "danger"; href: string }) {
  const toneCls = {
    primary: "text-primary bg-primary/15 border-primary/30",
    accent: "text-accent-foreground bg-accent/15 border-accent/30",
    success: "text-success bg-success/15 border-success/30",
    danger: "text-[color:var(--color-p1)] bg-[color:var(--color-p1)]/15 border-[color:var(--color-p1)]/30",
  }[tone];
  return (
    <Link to={href as any} className="surface-card p-5 group transition hover:border-primary/40 hover:bg-surface-2 focus-ring">
      <div className="flex items-center justify-between">
        <span className={`size-10 grid place-items-center rounded-md border ${toneCls}`}><Icon className="size-5" /></span>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <div className="mt-4 text-3xl font-black tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </Link>
  );
}
