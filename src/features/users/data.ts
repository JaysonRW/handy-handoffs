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
  { id: "u_care_1", name: "Marcus Reed", role: "CARETAKER", initials: "MR", hue: 200 },
  { id: "u_care_2", name: "Tariq Hossain", role: "CARETAKER", initials: "TH", hue: 160 },
  { id: "u_care_3", name: "Sofia Alvarez", role: "CARETAKER", initials: "SA", hue: 30 },
  { id: "u_clean_1", name: "Joana Ribeiro", role: "CLEANER", initials: "JR", hue: 320 },
  { id: "u_clean_2", name: "Amir Khan", role: "CLEANER", initials: "AK", hue: 100 },
  { id: "u_clean_3", name: "Lin Wei", role: "CLEANER", initials: "LW", hue: 60 },
];

export const getUser = (id: string | null | undefined) =>
  USERS.find((u) => u.id === id);

export const usersByRole = (role: Role) => USERS.filter((u) => u.role === role);

export const ADMIN_CREDENTIALS = { username: "admin", password: "admin" };
