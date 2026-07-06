import { useEffect } from "react";
import { useSyncStore } from "./store";
import { selectPendingSync, useTasksStore } from "@/features/tasks/store";
import { fetchTaskSnapshotFromSupabase } from "@/features/tasks/supabase";
import { isSupabaseConfigured, supabaseEnvStatus } from "@/lib/supabase/client";

/**
 * Watches navigator online/offline and runs a fake "sync" that flips
 * locally-created tasks to synced. Real backends would POST here.
 */
export function useSyncRuntime() {
  const setOnline = useSyncStore((s) => s.setOnline);
  const setSyncing = useSyncStore((s) => s.setSyncing);
  const recordSync = useSyncStore((s) => s.recordSync);
  const patchDebug = useSyncStore((s) => s.patchDebug);
  const pushDebugEvent = useSyncStore((s) => s.pushDebugEvent);
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
    // #region debug-point B:runtime-config
    patchDebug({
      supabaseConfigured: isSupabaseConfigured,
      hasSupabaseUrl: supabaseEnvStatus.hasSupabaseUrl,
      hasSupabasePublishableKey: supabaseEnvStatus.hasSupabasePublishableKey,
    });
    pushDebugEvent({
      scope: "runtime",
      status: "info",
      message: `[DEBUG] Sync runtime booted; online=${online}; configured=${isSupabaseConfigured}`,
    });
    // #endregion
  }, [online, patchDebug, pushDebugEvent]);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    async function hydrateFromServer() {
      try {
        const snapshot = await fetchTaskSnapshotFromSupabase();
        if (!snapshot || cancelled) return;
        // #region debug-point A:hydrate-apply
        pushDebugEvent({
          scope: "runtime",
          status: "success",
          message: `[DEBUG] Applying server snapshot with ${snapshot.tasks.length} tasks`,
        });
        // #endregion
        useTasksStore.getState().hydrateFromServer(snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // #region debug-point C:hydrate-error
        pushDebugEvent({
          scope: "runtime",
          status: "error",
          message: `[DEBUG] Runtime hydrate failed: ${message}`,
        });
        // #endregion
        throw error;
      }
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
    // #region debug-point E:fake-auto-sync
    patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger: "auto",
        status: "started",
        pendingCount: pending.length,
        message: "[DEBUG] Auto sync entered fake local markSynced path",
      },
    });
    pushDebugEvent({
      scope: "runtime",
      status: "info",
      message: `[DEBUG] Auto sync started with ${pending.length} pending task(s); configured=${isSupabaseConfigured}`,
    });
    // #endregion
    setSyncing(true);
    const ids = pending.map((p) => p.id);
    const t = setTimeout(() => {
      useTasksStore.getState().markSynced(ids);
      recordSync(ids.length, "auto");
      // #region debug-point E:fake-auto-sync-success
      patchDebug({
        lastPush: {
          at: new Date().toISOString(),
          trigger: "auto",
          status: "success",
          pendingCount: pending.length,
          syncedCount: ids.length,
          message: "[DEBUG] Auto sync only marked local tasks as synced",
        },
      });
      pushDebugEvent({
        scope: "runtime",
        status: "success",
        message: `[DEBUG] Auto sync completed via local-only markSynced for ${ids.length} task(s)`,
      });
      // #endregion
      setSyncing(false);
    }, 900);
    return () => {
      clearTimeout(t);
      setSyncing(false);
    };
  }, [online, patchDebug, pushDebugEvent, recordSync, setSyncing]);
}

export function triggerManualSync() {
  const pending = selectPendingSync(useTasksStore.getState());
  if (!useSyncStore.getState().online || pending.length === 0) return;
  // #region debug-point A:manual-sync-click
  useSyncStore.getState().patchDebug({
    lastPush: {
      at: new Date().toISOString(),
      trigger: "manual",
      status: "started",
      pendingCount: pending.length,
      message: "[DEBUG] Manual sync button triggered fake local markSynced path",
    },
  });
  useSyncStore.getState().pushDebugEvent({
    scope: "ui",
    status: "info",
    message: `[DEBUG] Manual sync clicked with ${pending.length} pending task(s); configured=${isSupabaseConfigured}`,
  });
  // #endregion
  useSyncStore.getState().setSyncing(true);
  setTimeout(() => {
    const ids = pending.map((p) => p.id);
    useTasksStore.getState().markSynced(ids);
    useSyncStore.getState().recordSync(ids.length, "manual");
    // #region debug-point A:manual-sync-complete
    useSyncStore.getState().patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger: "manual",
        status: "success",
        pendingCount: pending.length,
        syncedCount: ids.length,
        message: "[DEBUG] Manual sync finished without calling Supabase write",
      },
    });
    useSyncStore.getState().pushDebugEvent({
      scope: "ui",
      status: "success",
      message: `[DEBUG] Manual sync completed via local-only markSynced for ${ids.length} task(s)`,
    });
    // #endregion
    useSyncStore.getState().setSyncing(false);
  }, 700);
}

/** Dev/demo helper: force-toggle a fake offline mode (overrides navigator). */
export function simulateOffline(off: boolean) {
  useSyncStore.getState().setOnline(!off);
}
