import type { Role } from "@/features/tasks/types";

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
  hue: number;
}

export const USERS: User[] = [
  { id: "u_admin", name: "Helena Pires", role: "MASTER_ADMIN", initials: "HP", hue: 256 },
  { id: "u_care_1", name: "Bruno Silva", role: "CARETAKER", initials: "BS", hue: 200 },
  { id: "u_clean_1", name: "Melba Costa", role: "CLEANER", initials: "MC", hue: 320 },
];

export const getUser = (id: string | null | undefined) =>
  USERS.find((u) => u.id === id);

export const usersByRole = (role: Role) => USERS.filter((u) => u.role === role);

export const ADMIN_CREDENTIALS = { username: "admin", password: "admin" };
