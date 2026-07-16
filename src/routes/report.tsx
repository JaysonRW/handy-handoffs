import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Resident report · PMTMS" }] }),
  component: () => <Outlet />,
});
