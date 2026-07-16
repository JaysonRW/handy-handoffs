import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { CLEANER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffTasks } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/cleaner/tasks")({
  component: CleanerTasks,
});

function CleanerTasks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/cleaner/tasks") {
    return <Outlet />;
  }

  return <FixedStaffTasks userId={CLEANER_PORTAL_USER_ID} basePath="/cleaner" />;
}
