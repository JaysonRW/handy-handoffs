import { createFileRoute } from "@tanstack/react-router";
import { CLEANER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffTaskDetail } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/cleaner/tasks/$taskId")({
  component: CleanerTaskDetail,
});

function CleanerTaskDetail() {
  const { taskId } = Route.useParams();
  return (
    <FixedStaffTaskDetail
      userId={CLEANER_PORTAL_USER_ID}
      basePath="/cleaner"
      taskId={taskId}
    />
  );
}
