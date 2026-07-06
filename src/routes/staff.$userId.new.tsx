import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { StaffShell } from "@/components/layout/StaffShell";
import { SyncNowButton } from "@/features/sync/SyncIndicator";
import { TaskForm } from "@/features/tasks/components/TaskForm";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { canCreateTaskFromStaffPortal, getUser } from "@/features/users/data";

export const Route = createFileRoute("/staff/$userId/new")({
  head: () => ({ meta: [{ title: "New task · PMTMS" }] }),
  beforeLoad: ({ params }) => {
    const user = getUser(params.userId);
    if (!user || !canCreateTaskFromStaffPortal(user.role)) throw notFound();
  },
  component: NewTask,
});

function NewTask() {
  const { userId } = Route.useParams();
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
      backTo={`/staff/${userId}/tasks`}
    >
      <TaskForm creatorId={userId} redirectTo={`/staff/${userId}/tasks/{id}`} />
    </StaffShell>
  );
}
