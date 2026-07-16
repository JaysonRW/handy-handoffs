import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/cleaner")({
  head: () => ({ meta: [{ title: "Cleaner portal · PMTMS" }] }),
  component: () => <Outlet />,
});
