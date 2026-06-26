import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { StaffShell } from "@/components/layout/StaffShell";
import { getUser } from "@/features/users/data";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { TaskFiltersBar, useFilteredTasks, useTaskFiltersState } from "@/features/tasks/components/TaskFilters";
import { TaskCard } from "@/features/tasks/components/TaskCard";

export const Route = createFileRoute("/staff/$userId/tasks")({
  head: () => ({ meta: [{ title: "My tasks · PMTMS" }] }),
  component: StaffTasks,
});

function StaffTasks() {
  const { userId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = getUser(userId)!;
  const allTasks = useTasksStore((s) => s.tasks);
  const tasks = useMemo(() => selectVisibleForStaff(userId)({ tasks: allTasks } as any), [allTasks, userId]);
  const [filters, setFilters] = useTaskFiltersState();
  const filtered = useFilteredTasks(tasks, filters);
  const basePath = `/staff/${userId}/tasks`;

  if (pathname !== basePath) {
    return <Outlet />;
  }

  return (
    <StaffShell userId={userId} title="My tasks" subtitle={`${filtered.length} of ${tasks.length} · ${user.role.toLowerCase()}`}>
      <div className="max-w-3xl mx-auto px-4 pt-4 flex flex-col gap-3">
        <TaskFiltersBar value={filters} onChange={setFilters} hideAssignee={user.role === "CLEANER"} />
        {filtered.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">No tasks match these filters.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((t) => (
              <TaskCard key={t.id} task={t} href={`/staff/${userId}/tasks/${t.id}`} />
            ))}
          </div>
        )}
      </div>
    </StaffShell>
  );
}
