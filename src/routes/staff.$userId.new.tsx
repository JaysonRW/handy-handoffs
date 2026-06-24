import { createFileRoute, notFound } from "@tanstack/react-router";
import { StaffShell } from "@/components/layout/StaffShell";
import { TaskForm } from "@/features/tasks/components/TaskForm";
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
  return (
    <StaffShell userId={userId} title="New task" subtitle="Capture an issue from the field">
      <TaskForm creatorId={userId} redirectTo={`/staff/${userId}/tasks/{id}`} />
    </StaffShell>
  );
}
