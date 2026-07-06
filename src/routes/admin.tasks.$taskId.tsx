import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { SyncNowButton } from "@/features/sync/SyncIndicator";
import { useTasksStore } from "@/features/tasks/store";
import { TaskDetail } from "@/features/tasks/components/TaskDetail";

export const Route = createFileRoute("/admin/tasks/$taskId")({
  head: () => ({ meta: [{ title: "Task · PMTMS Admin" }] }),
  component: AdminTaskDetail,
  notFoundComponent: () => <AdminShell title="Task not found">Not found.</AdminShell>,
});

function AdminTaskDetail() {
  const { taskId } = Route.useParams();
  const task = useTasksStore((s) => s.tasks.find((t) => t.id === taskId));
  if (!task) throw notFound();
  return (
    <AdminShell title={task.title} subtitle="Admin task review" actions={<SyncNowButton />} backTo="/admin/tasks">
      <TaskDetail task={task} actorId="u_admin" actorRole="MASTER_ADMIN" backHref="/admin/tasks" isAdmin />
    </AdminShell>
  );
}
