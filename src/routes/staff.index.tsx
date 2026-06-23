import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { USERS, usersByRole } from "@/features/users/data";
import { Avatar } from "@/features/users/Avatar";
import { useTasksStore, selectVisibleForStaff } from "@/features/tasks/store";

export const Route = createFileRoute("/staff/")({
  head: () => ({ meta: [{ title: "Staff portal · PMTMS" }] }),
  component: StaffPicker,
});

function StaffPicker() {
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back</Link>
      <header className="mt-6">
        <h1 className="text-3xl font-black tracking-tight">Pick your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tap your name to open your dashboard. No password needed for field staff.</p>
      </header>

      <Group title="Caretakers" users={usersByRole("CARETAKER")} />
      <Group title="Cleaners" users={usersByRole("CLEANER")} />
    </div>
  );
}

function Group({ title, users }: { title: string; users: typeof USERS }) {
  const allTasks = useTasksStore((s) => s.tasks);
  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {users.map((u) => {
          const count = selectVisibleForStaff(u.id)({ tasks: allTasks } as any).filter((t) => t.status !== "DONE").length;
          return (
            <Link
              key={u.id}
              to={`/staff/${u.id}` as any}
              className="surface-card p-4 flex items-center gap-3 group hover:border-primary/50 hover:bg-surface-2 focus-ring"
            >
              <Avatar userId={u.id} size={48} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground">{count} open task{count !== 1 && "s"}</div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
