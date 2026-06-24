import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { visibleUsers } from "@/features/users/data";
import { Avatar } from "@/features/users/Avatar";
import { useTasksStore } from "@/features/tasks/store";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Team · PMTMS Admin" }] }),
  component: TeamPage,
});

function TeamPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const users = visibleUsers();
  return (
    <AdminShell title="Team" subtitle={`${users.length} users · 1 admin`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => {
          const open = tasks.filter((t) => t.assigneeId === u.id && t.status !== "DONE").length;
          const created = tasks.filter((t) => t.createdById === u.id).length;
          const portal = u.role === "MASTER_ADMIN" ? "/admin" : `/staff/${u.id}`;
          return (
            <article key={u.id} className="surface-card p-4 flex items-center gap-4">
              <Avatar userId={u.id} size={48} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{u.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{u.role.replace("_", " ").toLowerCase()}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="chip border-primary/40 bg-primary/10 text-primary">{open} open</span>
                  <span className="chip">{created} created</span>
                </div>
              </div>
              <Link to={portal as any} className="text-xs font-semibold text-primary shrink-0">Open →</Link>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
