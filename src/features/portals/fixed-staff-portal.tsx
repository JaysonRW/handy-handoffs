import { Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, CloudOff, Inbox, ListChecks, Plus } from "lucide-react";
import { StaffShell } from "@/components/layout/StaffShell";
import {
  canCreateTaskFromStaffPortal,
  canSeeCreatedTasks,
  getUser,
} from "@/features/users/data";
import { SyncNowButton } from "@/features/sync/SyncIndicator";
import { TaskCard } from "@/features/tasks/components/TaskCard";
import { TaskDetail } from "@/features/tasks/components/TaskDetail";
import { TaskFiltersBar, useFilteredTasks, useTaskFiltersState } from "@/features/tasks/components/TaskFilters";
import { TaskForm } from "@/features/tasks/components/TaskForm";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { simulateOffline, triggerManualSync } from "@/features/sync/runtime";
import { useSyncStore } from "@/features/sync/store";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

type FixedPortalProps = {
  userId: string;
  basePath: string;
};

export function FixedStaffHome({ userId, basePath }: FixedPortalProps) {
  const user = getUser(userId)!;
  const allTasks = useTasksStore((s) => s.tasks);
  const tasks = useMemo(
    () => selectVisibleForStaff(userId)({ tasks: allTasks } as any),
    [allTasks, userId],
  );
  const canCreate = canCreateTaskFromStaffPortal(user.role);
  const canSeeCreated = canSeeCreatedTasks(user.role);
  const newQ = tasks.filter((t) => t.status === "NEW");
  const done = tasks.filter((t) => t.status === "DONE");
  const pendingSync = tasks.filter((t) => !t.synced);

  const doing = tasks.filter((t) => t.status === "DOING");
  const myActive = tasks
    .filter((t) => t.assigneeId === userId && t.status !== "DONE")
  const isCleanerPortal = user.role === "CLEANER";

  return (
    <StaffShell
      userId={userId}
      title={`Hi, ${user.name.split(" ")[0]}`}
      subtitle={user.role === "CARETAKER" ? "Caretaker dashboard" : "Cleaner dashboard"}
      portalBasePath={basePath}
    >
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 flex flex-col gap-4">
        {canCreate && (
          <Link
            to={`${basePath}/new` as any}
            className="surface-card relative overflow-hidden p-5 group flex items-center gap-4 hover:border-primary/50 focus-ring"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent opacity-60 pointer-events-none" />
            <span className="size-14 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
              <Plus className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg">Report a new issue</div>
              <div className="text-xs text-muted-foreground">Capture a task for admin triage.</div>
            </div>
            <ArrowRight className="size-5 text-primary transition group-hover:translate-x-1" />
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Mini label="My active" value={doing.filter((t) => t.assigneeId === userId).length} icon={ListChecks} />
          {!isCleanerPortal && (
            <>
              <Mini
                label={canSeeCreated ? "In review" : "New assigned"}
                value={canSeeCreated ? newQ.filter((t) => t.createdById === userId).length : newQ.length}
                icon={Inbox}
              />
              <Mini label="Completed" value={done.length} icon={CheckCircle2} />
              <Mini
                label="Pending sync"
                value={pendingSync.length}
                icon={CloudOff}
                tone="accent"
              />
            </>
          )}
        </div>

        <section>
          <header className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold">My active tasks</h2>
            <Link to={`${basePath}/tasks` as any} className="text-xs font-semibold text-primary">View all →</Link>
          </header>
          {myActive.length === 0 ? (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">No active tasks. Nice work.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {myActive.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  href={`${basePath}/tasks/${t.id}`}
                  compact
                  hideStatusBadge={isCleanerPortal}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </StaffShell>
  );
}

export function FixedStaffTasks({ userId, basePath }: FixedPortalProps) {
  const user = getUser(userId)!;
  const allTasks = useTasksStore((s) => s.tasks);
  const visibleTasks = useMemo(() => selectVisibleForStaff(userId)({ tasks: allTasks } as any), [allTasks, userId]);
  const tasks = useMemo(() => {
    if (user.role === "CLEANER") {
      return visibleTasks.filter((t) => t.status !== "DONE");
    }
    return visibleTasks;
  }, [visibleTasks, user.role]);
  const [filters, setFilters] = useTaskFiltersState();
  const filtered = useFilteredTasks(tasks, filters);

  return (
    <StaffShell
      userId={userId}
      title="My tasks"
      subtitle={`${filtered.length} ${user.role === "CLEANER" ? "pending" : `of ${visibleTasks.length}`} · ${user.role.toLowerCase()}`}
      actions={<SyncNowButton taskIds={visibleTasks.map((task) => task.id)} />}
      portalBasePath={basePath}
    >
      <div className="max-w-3xl mx-auto px-4 pt-4 flex flex-col gap-3">
        {user.role !== "CLEANER" && (
          <TaskFiltersBar value={filters} onChange={setFilters} hideAssignee={false} />
        )}
        {filtered.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            {user.role === "CLEANER" ? "No pending tasks. All caught up." : "No tasks match these filters."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                href={`${basePath}/tasks/${t.id}`}
                hideStatusBadge={user.role === "CLEANER"}
              />
            ))}
          </div>
        )}
      </div>
    </StaffShell>
  );
}

export function FixedStaffNew({ userId, basePath }: FixedPortalProps) {
  const user = getUser(userId);
  if (!user || !canCreateTaskFromStaffPortal(user.role)) throw notFound();

  const allTasks = useTasksStore((s) => s.tasks);
  const visibleTasks = useMemo(
    () => selectVisibleForStaff(userId)({ tasks: allTasks } as any),
    [allTasks, userId],
  );

  return (
    <StaffShell
      userId={userId}
      title="New task"
      subtitle="Capture an issue from the field"
      actions={<SyncNowButton taskIds={visibleTasks.map((task) => task.id)} />}
      backTo={`${basePath}/tasks`}
      portalBasePath={basePath}
    >
      <TaskForm creatorId={userId} redirectTo={`${basePath}/tasks/{id}`} />
    </StaffShell>
  );
}

export function FixedStaffTaskDetail({
  userId,
  basePath,
  taskId,
}: FixedPortalProps & { taskId: string }) {
  const navigate = useNavigate();
  const user = getUser(userId)!;
  const allTasks = useTasksStore((s) => s.tasks);
  const visibleTasks = useMemo(
    () => selectVisibleForStaff(userId)({ tasks: allTasks } as any),
    [allTasks, userId],
  );
  const cleanerActiveTasks = useMemo(() => {
    if (user.role !== "CLEANER") return [];
    return visibleTasks
      .filter((t) => t.assigneeId === userId && t.status !== "DONE")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [visibleTasks, userId, user.role]);

  const task = visibleTasks.find((item) => item.id === taskId);
  if (!task) throw notFound();

  const onCleanerCompleted = user.role === "CLEANER"
    ? () => {
        const remaining = cleanerActiveTasks.filter((t) => t.id !== taskId);
        if (remaining.length > 0) {
          navigate({ to: `${basePath}/tasks/${remaining[0]!.id}` as any });
        } else {
          navigate({ to: `${basePath}/tasks` as any });
        }
      }
    : undefined;

  return (
    <StaffShell
      userId={userId}
      title={task.title}
      subtitle="Task detail"
      actions={<SyncNowButton taskIds={visibleTasks.map((item) => item.id)} />}
      backTo={`${basePath}/tasks`}
      portalBasePath={basePath}
    >
      <TaskDetail
        task={task}
        actorId={userId}
        actorRole={user.role}
        backHref={`${basePath}/tasks`}
        isAdmin={false}
        onCleanerCompleted={onCleanerCompleted}
      />
    </StaffShell>
  );
}

export function FixedStaffSync({ userId, basePath }: FixedPortalProps) {
  const user = getUser(userId)!;
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const history = useSyncStore((s) => s.history);
  const allTasks = useTasksStore((s) => s.tasks);
  const myTasks = useMemo(() => selectVisibleForStaff(userId)({ tasks: allTasks } as any), [allTasks, userId]);
  const pending = myTasks.filter((t) => !t.synced);

  return (
    <StaffShell
      userId={userId}
      title="Sync status"
      subtitle={online ? "Connected" : "Offline — queueing locally"}
      portalBasePath={basePath}
    >
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
              onClick={() => triggerManualSync(pending.map((task) => task.id))}
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

function Mini({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone?: "accent" }) {
  return (
    <div className="surface-card p-3 flex flex-col gap-1">
      <Icon className={`size-4 ${tone === "accent" ? "text-warning" : "text-primary"}`} />
      <div className="text-2xl font-black tabular-nums leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
