import { createFileRoute } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffNew } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/new")({
  component: CaretakerNewTask,
});

function CaretakerNewTask() {
  return <FixedStaffNew userId={CARETAKER_PORTAL_USER_ID} basePath="/caretaker" />;
}
