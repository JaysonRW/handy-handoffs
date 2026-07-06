import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { StaffShell } from "@/components/layout/StaffShell";
import { SyncNowButton } from "@/features/sync/SyncIndicator";
import { TaskDetail } from "@/features/tasks/components/TaskDetail";
import { selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";
import { getUser } from "@/features/users/data";

export const Route = createFileRoute("/staff/$userId/tasks/$taskId")({
  head: () => ({ meta: [{ title: "Task · PMTMS" }] }),
  component: StaffTaskDetail,
});

function StaffTaskDetail() {
  const { userId, taskId } = Route.useParams();
  const user = getUser(userId)!;
  const allTasks = useTasksStore((s) => s.tasks);
  const visibleTasks = useMemo(
    () => selectVisibleForStaff(userId)({ tasks: allTasks } as any),
    [allTasks, userId],
  );
  const task = visibleTasks.find((item) => item.id === taskId);
  if (!task) throw notFound();
  return (
    <StaffShell
      userId={userId}
      title={task.title}
      subtitle="Task detail"
      actions={<SyncNowButton taskIds={visibleTasks.map((item) => item.id)} />}
      backTo={`/staff/${userId}/tasks`}
    >
      <TaskDetail task={task} actorId={userId} actorRole={user.role} backHref={`/staff/${userId}/tasks`} isAdmin={false} />
    </StaffShell>
  );
}
