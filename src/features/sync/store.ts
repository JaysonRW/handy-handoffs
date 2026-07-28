import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";

export interface SyncEvent {
  id: string;
  at: string;
  count: number;
  trigger: "auto" | "manual" | "submit" | "task";
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
    trigger: "auto" | "manual" | "submit" | "task";
    status: "started" | "success" | "error" | "skipped";
    pendingCount?: number;
    syncedCount?: number;
    message?: string;
  };
  events: SyncDebugEvent[];
}

export interface TaskSyncState {
  status: "idle" | "syncing" | "success" | "error";
  updatedAt: string;
  message?: string;
}

interface SyncState {
  online: boolean;
  syncing: boolean;
  history: SyncEvent[];
  debug: SyncDebugState;
  taskStates: Record<string, TaskSyncState>;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  recordSync: (count: number, trigger: SyncEvent["trigger"]) => void;
  patchDebug: (patch: Partial<Omit<SyncDebugState, "events">>) => void;
  pushDebugEvent: (event: Omit<SyncDebugEvent, "id" | "at">) => void;
  setTaskState: (taskId: string, state: Omit<TaskSyncState, "updatedAt">) => void;
  clearTaskState: (taskId: string) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      online: true,
      syncing: false,
      history: [],
      taskStates: {},
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
      setTaskState: (taskId, state) =>
        set((s) => ({
          taskStates: {
            ...s.taskStates,
            [taskId]: {
              ...state,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      clearTaskState: (taskId) =>
        set((s) => {
          const next = { ...s.taskStates };
          delete next[taskId];
          return { taskStates: next };
        }),
      reset: () =>
        set({
          syncing: false,
          history: [],
          taskStates: {},
          debug: { events: [] },
        }),
    }),
    {
      name: "pmtms.sync.v1",
      partialize: (s) => ({ history: s.history }),
    },
  ),
);
