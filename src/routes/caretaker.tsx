import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/caretaker")({
  head: () => ({ meta: [{ title: "Caretaker portal · PMTMS" }] }),
  component: () => <Outlet />,
});
