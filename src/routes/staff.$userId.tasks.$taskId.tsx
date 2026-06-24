import { createFileRoute, notFound } from "@tanstack/react-router";
import { StaffShell } from "@/components/layout/StaffShell";
import { TaskDetail } from "@/features/tasks/components/TaskDetail";
import { useTasksStore } from "@/features/tasks/store";
import { getUser } from "@/features/users/data";

export const Route = createFileRoute("/staff/$userId/tasks/$taskId")({
  head: () => ({ meta: [{ title: "Task · PMTMS" }] }),
  component: StaffTaskDetail,
});

function StaffTaskDetail() {
  const { userId, taskId } = Route.useParams();
  const user = getUser(userId)!;
  const task = useTasksStore((s) => s.tasks.find((t) => t.id === taskId));
  if (!task) throw notFound();
  return (
    <StaffShell userId={userId} title={task.title} subtitle="Task detail">
      <TaskDetail task={task} actorId={userId} actorRole={user.role} backHref={`/staff/${userId}/tasks`} isAdmin={false} />
    </StaffShell>
  );
}
