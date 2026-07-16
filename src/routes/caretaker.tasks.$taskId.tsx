import { createFileRoute } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffTaskDetail } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/tasks/$taskId")({
  component: CaretakerTaskDetail,
});

function CaretakerTaskDetail() {
  const { taskId } = Route.useParams();
  return (
    <FixedStaffTaskDetail
      userId={CARETAKER_PORTAL_USER_ID}
      basePath="/caretaker"
      taskId={taskId}
    />
  );
}
