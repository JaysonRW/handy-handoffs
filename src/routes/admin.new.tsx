import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { TaskForm } from "@/features/tasks/components/TaskForm";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "New task · PMTMS Admin" }] }),
  component: AdminNewTask,
});

function AdminNewTask() {
  return (
    <AdminShell
      title="Create task"
      subtitle="Register a new issue for later triage and assignment"
    >
      <TaskForm creatorId="u_admin" redirectTo="/admin/tasks/{id}" mode="admin" />
    </AdminShell>
  );
}
