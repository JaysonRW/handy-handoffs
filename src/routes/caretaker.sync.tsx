import { createFileRoute } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffSync } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/sync")({
  component: CaretakerSync,
});

function CaretakerSync() {
  return <FixedStaffSync userId={CARETAKER_PORTAL_USER_ID} basePath="/caretaker" />;
}
