import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getUser, isFieldStaffRole } from "@/features/users/data";

export const Route = createFileRoute("/staff/$userId")({
  beforeLoad: ({ params }) => {
    const u = getUser(params.userId);
    if (!u || !isFieldStaffRole(u.role)) throw notFound();
  },
  component: () => <Outlet />,
});
