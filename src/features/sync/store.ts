import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";

export interface SyncEvent {
  id: string;
  at: string;
  count: number;
  trigger: "auto" | "manual";
}

export interface SyncDebugEvent {
  id: string;
  at: string;
  scope: "runtime" | "submit" | "supabase" | "ui";
  status: "info" | "success" | "error" | "skipped";
  message: string;
}

export interface SyncDebugState {
  updatedAt?: string;
  supabaseConfigured?: boolean;
  hasSupabaseUrl?: boolean;
  hasSupabasePublishableKey?: boolean;
  lastHydrate?: {
    at: string;
    status: "started" | "success" | "error" | "skipped";
    taskCount?: number;
    commentCount?: number;
    activityCount?: number;
    message?: string;
  };
  lastPush?: {
    at: string;
    trigger: "auto" | "manual" | "submit";
    status: "started" | "success" | "error" | "skipped";
    pendingCount?: number;
    syncedCount?: number;
    message?: string;
  };
  events: SyncDebugEvent[];
}

interface SyncState {
  online: boolean;
  syncing: boolean;
  history: SyncEvent[];
  debug: SyncDebugState;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  recordSync: (count: number, trigger: SyncEvent["trigger"]) => void;
  patchDebug: (patch: Partial<Omit<SyncDebugState, "events">>) => void;
  pushDebugEvent: (event: Omit<SyncDebugEvent, "id" | "at">) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      online: true,
      syncing: false,
      history: [],
      debug: {
        events: [],
      },
      setOnline: (online) => set({ online }),
      setSyncing: (syncing) => set({ syncing }),
      recordSync: (count, trigger) =>
        set((s) => ({
          history: [
            { id: nanoid(), at: new Date().toISOString(), count, trigger },
            ...s.history,
          ].slice(0, 50),
        })),
      patchDebug: (patch) =>
        set((s) => ({
          debug: {
            ...s.debug,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })),
      pushDebugEvent: (event) =>
        set((s) => ({
          debug: {
            ...s.debug,
            updatedAt: new Date().toISOString(),
            events: [
              {
                ...event,
                id: nanoid(),
                at: new Date().toISOString(),
              },
              ...s.debug.events,
            ].slice(0, 20),
          },
        })),
    }),
    {
      name: "pmtms.sync.v1",
      partialize: (s) => ({ history: s.history }),
    },
  ),
);
