import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAdminAuth } from "@/features/auth/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    // Client-only gate; persisted store is hydrated client-side.
    if (typeof window !== "undefined" && !useAdminAuth.getState().isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
