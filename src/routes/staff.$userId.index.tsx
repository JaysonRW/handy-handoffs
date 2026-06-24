import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ArrowRight, Inbox, ListChecks, CheckCircle2, CloudOff } from "lucide-react";
import { StaffShell } from "@/components/layout/StaffShell";
import { canCreateTaskFromStaffPortal, canSeeCreatedTasks, getUser } from "@/features/users/data";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { TaskCard } from "@/features/tasks/components/TaskCard";

export const Route = createFileRoute("/staff/$userId/")({
  head: () => ({ meta: [{ title: "Your dashboard · PMTMS" }] }),
  component: StaffHome,
});

function StaffHome() {
  const { userId } = Route.useParams();
  const user = getUser(userId)!;
  const tasks = useTasksStore((s) => selectVisibleForStaff(userId)(s));
  const canCreate = canCreateTaskFromStaffPortal(user.role);
  const canSeeCreated = canSeeCreatedTasks(user.role);

  const newQ = tasks.filter((t) => t.status === "NEW");
  const doing = tasks.filter((t) => t.status === "DOING");
  const done = tasks.filter((t) => t.status === "DONE");
  const pendingSync = tasks.filter((t) => !t.synced);
  const myActive = [...doing, ...newQ.filter((t) => t.assigneeId === userId)].slice(0, 4);

  return (
    <StaffShell userId={userId} title={`Hi, ${user.name.split(" ")[0]}`} subtitle={user.role === "CARETAKER" ? "Caretaker dashboard" : "Cleaner dashboard"}>
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 flex flex-col gap-4">
        {canCreate && (
          <Link
            to={`/staff/${userId}/new` as any}
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Mini label="My active" value={doing.filter((t) => t.assigneeId === userId).length} icon={ListChecks} />
          <Mini label={canSeeCreated ? "In review" : "New assigned"} value={canSeeCreated ? newQ.filter((t) => t.createdById === userId).length : newQ.length} icon={Inbox} />
          <Mini label="Completed" value={done.length} icon={CheckCircle2} />
          <Mini label="Pending sync" value={pendingSync.length} icon={CloudOff} tone="accent" />
        </div>

        <section>
          <header className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold">My active tasks</h2>
            <Link to={`/staff/${userId}/tasks` as any} className="text-xs font-semibold text-primary">View all →</Link>
          </header>
          {myActive.length === 0 ? (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">No active tasks. Nice work.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {myActive.map((t) => (
                <TaskCard key={t.id} task={t} href={`/staff/${userId}/tasks/${t.id}`} compact />
              ))}
            </div>
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
