import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminAuthState {
  isAdmin: boolean;
  login: (u: string, p: string) => boolean;
  logout: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAdmin: false,
      login: (u, p) => {
        if (u === "admin" && p === "admin") {
          set({ isAdmin: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAdmin: false }),
    }),
    { name: "pmtms.admin.v1" },
  ),
);
