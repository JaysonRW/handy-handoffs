import { createFileRoute } from "@tanstack/react-router";
import { StaffShell } from "@/components/layout/StaffShell";
import { TaskForm } from "@/features/tasks/components/TaskForm";

export const Route = createFileRoute("/staff/$userId/new")({
  head: () => ({ meta: [{ title: "New task · PMTMS" }] }),
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
