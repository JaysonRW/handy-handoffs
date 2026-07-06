import { useEffect } from "react";
import { useSyncStore } from "./store";
import { selectPendingSync, useTasksStore } from "@/features/tasks/store";
import { fetchTaskSnapshotFromSupabase } from "@/features/tasks/supabase";

/**
 * Watches navigator online/offline and runs a fake "sync" that flips
 * locally-created tasks to synced. Real backends would POST here.
 */
export function useSyncRuntime() {
  const setOnline = useSyncStore((s) => s.setOnline);
  const setSyncing = useSyncStore((s) => s.setSyncing);
  const recordSync = useSyncStore((s) => s.recordSync);
  const online = useSyncStore((s) => s.online);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline]);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    async function hydrateFromServer() {
      const snapshot = await fetchTaskSnapshotFromSupabase();
      if (!snapshot || cancelled) return;
      useTasksStore.getState().hydrateFromServer(snapshot);
    }

    void hydrateFromServer();

    return () => {
      cancelled = true;
    };
  }, [online]);

  useEffect(() => {
    if (!online) return;
    const pending = selectPendingSync(useTasksStore.getState());
    if (pending.length === 0) return;
    setSyncing(true);
    const ids = pending.map((p) => p.id);
    const t = setTimeout(() => {
      useTasksStore.getState().markSynced(ids);
      recordSync(ids.length, "auto");
      setSyncing(false);
    }, 900);
    return () => {
      clearTimeout(t);
      setSyncing(false);
    };
  }, [online, setSyncing, recordSync]);
}

export function triggerManualSync() {
  const pending = selectPendingSync(useTasksStore.getState());
  if (!useSyncStore.getState().online || pending.length === 0) return;
  useSyncStore.getState().setSyncing(true);
  setTimeout(() => {
    const ids = pending.map((p) => p.id);
    useTasksStore.getState().markSynced(ids);
    useSyncStore.getState().recordSync(ids.length, "manual");
    useSyncStore.getState().setSyncing(false);
  }, 700);
}

/** Dev/demo helper: force-toggle a fake offline mode (overrides navigator). */
export function simulateOffline(off: boolean) {
  useSyncStore.getState().setOnline(!off);
}
