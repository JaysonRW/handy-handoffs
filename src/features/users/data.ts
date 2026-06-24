import type { Role } from "@/features/tasks/types";

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
  hue: number;
  hidden?: boolean;
}

export const RESIDENT_PORTAL_USER_ID = "u_resident_portal";

export const USERS: User[] = [
  { id: "u_admin", name: "Helena Pires", role: "MASTER_ADMIN", initials: "HP", hue: 256 },
  { id: "u_care_1", name: "Bruno Silva", role: "CARETAKER", initials: "BS", hue: 200 },
  { id: "u_clean_1", name: "Melba Costa", role: "CLEANER", initials: "MC", hue: 320 },
  { id: RESIDENT_PORTAL_USER_ID, name: "Portal do morador", role: "RESIDENT", initials: "MR", hue: 38, hidden: true },
];

export const getUser = (id: string | null | undefined) =>
  USERS.find((u) => u.id === id);

export const usersByRole = (role: Role) => USERS.filter((u) => u.role === role);
export const visibleUsers = () => USERS.filter((u) => !u.hidden);
export const canCreateTask = (role: Role) =>
  role === "MASTER_ADMIN" || role === "CARETAKER" || role === "RESIDENT";
export const canCreateTaskFromStaffPortal = (role: Role) => role === "CARETAKER";
export const canSeeCreatedTasks = (role: Role) => role === "MASTER_ADMIN" || role === "CARETAKER";
export const canCompleteAssignedTasks = (role: Role) =>
  role === "MASTER_ADMIN" || role === "CARETAKER" || role === "CLEANER";
export const canStartAssignedTasks = (role: Role) =>
  role === "MASTER_ADMIN" || role === "CARETAKER";
export const canCommentOnTasks = (role: Role) =>
  role === "MASTER_ADMIN" || role === "CARETAKER";
export const isFieldStaffRole = (role: Role) =>
  role === "CARETAKER" || role === "CLEANER";

export const ADMIN_CREDENTIALS = { username: "admin", password: "admin" };
