import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";

export interface SyncEvent {
  id: string;
  at: string;
  count: number;
  trigger: "auto" | "manual";
}

interface SyncState {
  online: boolean;
  syncing: boolean;
  history: SyncEvent[];
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  recordSync: (count: number, trigger: SyncEvent["trigger"]) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      online: true,
      syncing: false,
      history: [],
      setOnline: (online) => set({ online }),
      setSyncing: (syncing) => set({ syncing }),
      recordSync: (count, trigger) =>
        set((s) => ({
          history: [
            { id: nanoid(), at: new Date().toISOString(), count, trigger },
            ...s.history,
          ].slice(0, 50),
        })),
    }),
    {
      name: "pmtms.sync.v1",
      partialize: (s) => ({ history: s.history }),
    },
  ),
);
