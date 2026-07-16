import { createFileRoute } from "@tanstack/react-router";
import { CLEANER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffSync } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/cleaner/sync")({
  component: CleanerSync,
});

function CleanerSync() {
  return <FixedStaffSync userId={CLEANER_PORTAL_USER_ID} basePath="/cleaner" />;
}
