import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { BLOCKS } from "@/features/blocks/data";
import { useTasksStore } from "@/features/tasks/store";
import { TaskFiltersBar, defaultFilters, useFilteredTasks, useTaskFiltersState } from "@/features/tasks/components/TaskFilters";
import { TaskKanban } from "@/features/tasks/components/TaskKanban";
import { TaskTable } from "@/features/tasks/components/TaskTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tasks")({
  validateSearch: (search: Record<string, unknown>) => sanitizeTaskSearch(search),
  head: () => ({ meta: [{ title: "Tasks · PMTMS Admin" }] }),
  component: AdminTasks,
});

function AdminTasks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate({ from: "/admin/tasks" });
  const search = Route.useSearch();
  const tasks = useTasksStore((s) => s.tasks);
  const initialFilters = useMemo(() => ({
    ...defaultFilters,
    blockId: search.blockId ?? "ALL",
    flatId: search.flatId ?? "ALL",
  }), [search.blockId, search.flatId]);
  const [filters, setFilters] = useTaskFiltersState(initialFilters);
  const filtered = useFilteredTasks(tasks, filters);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  useEffect(() => {
    const nextBlockId = search.blockId ?? "ALL";
    const nextFlatId = search.flatId ?? "ALL";

    setFilters((current) =>
      current.blockId === nextBlockId && current.flatId === nextFlatId
        ? current
        : { ...current, blockId: nextBlockId, flatId: nextFlatId },
    );
  }, [search.blockId, search.flatId, setFilters]);

  if (pathname !== "/admin/tasks") {
    return <Outlet />;
  }

  function handleFiltersChange(nextFilters: typeof filters) {
    setFilters(nextFilters);

    const nextSearch = buildTaskSearch(nextFilters.blockId, nextFilters.flatId);
    if (search.blockId === nextSearch.blockId && search.flatId === nextSearch.flatId) {
      return;
    }

    navigate({
      to: "/admin/tasks",
      search: nextSearch,
      replace: true,
    });
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
        <TaskFiltersBar value={filters} onChange={handleFiltersChange} />
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

function sanitizeTaskSearch(search: Record<string, unknown>) {
  const rawBlockId = typeof search.blockId === "string" ? search.blockId : undefined;
  const block = rawBlockId ? BLOCKS.find((item) => item.id === rawBlockId) : undefined;
  const rawFlatId = typeof search.flatId === "string" ? search.flatId : undefined;
  const flat = rawFlatId ? block?.flats.find((item) => item.id === rawFlatId) : undefined;

  return {
    blockId: block?.id,
    flatId: flat?.id,
  };
}

function buildTaskSearch(blockId: string, flatId: string) {
  return {
    blockId: blockId !== "ALL" ? blockId : undefined,
    flatId: blockId !== "ALL" && flatId !== "ALL" ? flatId : undefined,
  };
}
