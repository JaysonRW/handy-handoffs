import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useTasksStore } from "@/features/tasks/store";
import { TaskFiltersBar, useFilteredTasks, useTaskFiltersState } from "@/features/tasks/components/TaskFilters";
import { TaskKanban } from "@/features/tasks/components/TaskKanban";
import { TaskTable } from "@/features/tasks/components/TaskTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "Tasks · PMTMS Admin" }] }),
  component: AdminTasks,
});

function AdminTasks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tasks = useTasksStore((s) => s.tasks);
  const [filters, setFilters] = useTaskFiltersState();
  const filtered = useFilteredTasks(tasks, filters);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  if (pathname !== "/admin/tasks") {
    return <Outlet />;
  }

  return (
    <AdminShell
      title="Tasks"
      subtitle={`${filtered.length} of ${tasks.length} tasks`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground focus-ring hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            New task
          </Link>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-1">
            <Toggle active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="size-3.5" />} label="Kanban" />
            <Toggle active={view === "table"} onClick={() => setView("table")} icon={<Rows3 className="size-3.5" />} label="Table" />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TaskFiltersBar value={filters} onChange={setFilters} />
        {view === "kanban" ? (
          <TaskKanban tasks={filtered} buildHref={(t) => `/admin/tasks/${t.id}`} actorId="u_admin" />
        ) : (
          <TaskTable tasks={filtered} buildHref={(t) => `/admin/tasks/${t.id}`} actorId="u_admin" />
        )}
      </div>
    </AdminShell>
  );
}

function Toggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold focus-ring",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >{icon}{label}</button>
  );
}
