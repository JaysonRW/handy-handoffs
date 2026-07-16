import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffTasks } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/tasks")({
  component: CaretakerTasks,
});

function CaretakerTasks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/caretaker/tasks") {
    return <Outlet />;
  }

  return <FixedStaffTasks userId={CARETAKER_PORTAL_USER_ID} basePath="/caretaker" />;
}
