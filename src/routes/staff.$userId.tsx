import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getUser } from "@/features/users/data";

export const Route = createFileRoute("/staff/$userId")({
  beforeLoad: ({ params }) => {
    const u = getUser(params.userId);
    if (!u || u.role === "MASTER_ADMIN") throw notFound();
  },
  component: () => <Outlet />,
});
