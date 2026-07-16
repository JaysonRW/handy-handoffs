import { createFileRoute } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffHome } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/")({
  component: CaretakerHome,
});

function CaretakerHome() {
  return <FixedStaffHome userId={CARETAKER_PORTAL_USER_ID} basePath="/caretaker" />;
}
