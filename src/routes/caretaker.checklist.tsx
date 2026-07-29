import { createFileRoute } from "@tanstack/react-router";
import { CARETAKER_PORTAL_USER_ID } from "@/features/users/data";
import { FixedStaffChecklist } from "@/features/portals/fixed-staff-portal";

export const Route = createFileRoute("/caretaker/checklist")({
  component: CaretakerChecklist,
});

function CaretakerChecklist() {
  return <FixedStaffChecklist userId={CARETAKER_PORTAL_USER_ID} basePath="/caretaker" />;
}
