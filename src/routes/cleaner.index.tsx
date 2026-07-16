import { createFileRoute } from "@tanstack/react-router";
import { CLEANER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffHome } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/cleaner/")({
  component: CleanerHome,
});

function CleanerHome() {
  return <FixedStaffHome userId={CLEANER_PORTAL_USER_ID} basePath="/cleaner" />;
}
