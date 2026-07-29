import { useEffect } from "react";
import { useSyncStore } from "./store";
import { selectPendingSync, useTasksStore } from "@/features/tasks/store";
import {
  fetchTaskSnapshotFromSupabase,
  upsertTaskBundleToSupabase,
} from "@/features/tasks/supabase";
import { useChecklistStore } from "@/features/checklist/store";
import {
  fetchChecklistSnapshot,
  upsertChecklistCompletion,
} from "@/features/checklist/supabase";
import { isSupabaseConfigured, supabaseEnvStatus } from "@/lib/supabase/client";

type SyncRunResult = {
  syncedIds: string[];
  failed: Array<{ taskId: string; message: string }>;
  skippedReason?: string;
  checklistSynced: number;
  checklistFailed: number;
};

async function hydrateTasksFromServer(reason: "boot" | "poll" | "after-sync") {
  const { pushDebugEvent } = useSyncStore.getState();

  try {
    const snapshot = await fetchTaskSnapshotFromSupabase();
    if (!snapshot) return false;

    pushDebugEvent({
      scope: "runtime",
      status: "success",
      message: `[DEBUG] Applied ${reason} snapshot with ${snapshot.tasks.length} task(s)`,
    });
    useTasksStore.getState().hydrateFromServer(snapshot);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushDebugEvent({
      scope: "runtime",
      status: "error",
      message: `[DEBUG] ${reason} hydrate tasks failed: ${message}`,
    });
    return false;
  }
}

async function hydrateChecklistFromServer(reason: "boot" | "poll" | "after-sync") {
  const { pushDebugEvent } = useSyncStore.getState();
  const checklistStore = useChecklistStore.getState();
  try {
    const snapshot = await fetchChecklistSnapshot();
    if (!snapshot) {
      if (reason === "boot") {
        checklistStore.setLastError(
          "No checklist items returned. Apply the SQL seed and check RLS policies on checklist_items / checklist_completions.",
        );
      }
      return false;
    }
    pushDebugEvent({
      scope: "runtime",
      status: "success",
      message: `[DEBUG] Applied ${reason} checklist snapshot with ${snapshot.items.length} item(s)`,
    });
    checklistStore.hydrateFromServer(snapshot);
    checklistStore.setLastError(undefined);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushDebugEvent({
      scope: "runtime",
      status: "error",
      message: `[DEBUG] ${reason} hydrate checklist failed: ${message}`,
    });
    checklistStore.setLastError(message);
    return false;
  }
}

async function hydrateFromServer(reason: "boot" | "poll" | "after-sync") {
  const [tasksOk, checklistOk] = await Promise.all([
    hydrateTasksFromServer(reason),
    hydrateChecklistFromServer(reason),
  ]);
  return tasksOk || checklistOk;
}

export async function hydrateFromSupabase(): Promise<boolean> {
  return hydrateFromServer("manual");
}

export async function hydrateChecklistFromSupabase(): Promise<boolean> {
  return hydrateChecklistFromServer("manual");
}

function getTasksForSync(taskIds?: string[]) {
  const state = useTasksStore.getState();
  if (!taskIds || taskIds.length === 0) {
    return selectPendingSync(state);
  }

  const ids = new Set(taskIds);
  return state.tasks.filter((task) => ids.has(task.id));
}

async function syncChecklist(trigger: "auto" | "manual") {
  const checklistStore = useChecklistStore.getState();
  const pending = checklistStore.getPendingUpserts();
  if (pending.length === 0) return { synced: 0, failed: 0 };
  if (!isSupabaseConfigured) return { synced: 0, failed: pending.length };

  let synced = 0;
  let failed = 0;
  for (const p of pending) {
    try {
      const completion = await upsertChecklistCompletion(p.completion);
      checklistStore.markUpsertDone(p.key, completion);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checklistStore.markUpsertFailed(p.key, message);
      failed += 1;
    }
  }
  return { synced, failed };
}

export async function syncTasks(taskIds?: string[], trigger: "auto" | "manual" | "submit" | "task" = "manual"): Promise<SyncRunResult> {
  const syncStore = useSyncStore.getState();
  const tasks = getTasksForSync(taskIds);

  if (syncStore.syncing) {
    const skippedReason = "Ja existe uma sincronizacao em andamento.";
    return { syncedIds: [], failed: [], skippedReason, checklistSynced: 0, checklistFailed: 0 };
  }

  if (!syncStore.online) {
    const skippedReason = "Sem conexao com a internet.";
    syncStore.patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger,
        status: "skipped",
        pendingCount: tasks.length,
        message: skippedReason,
      },
    });
    return { syncedIds: [], failed: [], skippedReason, checklistSynced: 0, checklistFailed: 0 };
  }

  if (!isSupabaseConfigured) {
    const skippedReason = "Supabase nao esta configurado neste build.";
    syncStore.patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger,
        status: "error",
        pendingCount: tasks.length,
        message: skippedReason,
      },
    });
    syncStore.pushDebugEvent({
      scope: "runtime",
      status: "error",
      message: `[DEBUG] Sync blocked: ${skippedReason}`,
    });
    for (const task of tasks) {
      syncStore.setTaskState(task.id, { status: "error", message: skippedReason });
    }
    return {
      syncedIds: [],
      failed: tasks.map((task) => ({ taskId: task.id, message: skippedReason })),
      skippedReason,
      checklistSynced: 0,
      checklistFailed: 0,
    };
  }

  if (tasks.length === 0 && !(!taskIds || taskIds.length === 0 ? useChecklistStore.getState().getPendingUpserts().length : false)) {
    const skippedReason = "Nenhuma task elegivel para sincronizacao.";
    syncStore.patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger,
        status: "skipped",
        pendingCount: 0,
        message: skippedReason,
      },
    });
    const { synced, failed } = await syncChecklist(trigger === "task" ? "manual" : (trigger === "auto" ? "auto" : "manual"));
    return { syncedIds: [], failed: [], skippedReason, checklistSynced: synced, checklistFailed: failed };
  }

  syncStore.setSyncing(true);
  syncStore.patchDebug({
    lastPush: {
      at: new Date().toISOString(),
      trigger,
      status: "started",
      pendingCount: tasks.length,
      message: `[DEBUG] Starting real Supabase sync for ${tasks.length} task(s)`,
    },
  });
  syncStore.pushDebugEvent({
    scope: "runtime",
    status: "info",
    message: `[DEBUG] Starting ${trigger} sync for ${tasks.length} task(s)`,
  });

  const syncedIds: string[] = [];
  const failed: Array<{ taskId: string; message: string }> = [];
  const state = useTasksStore.getState();
  let checklistSynced = 0;
  let checklistFailed = 0;

  try {
    for (const task of tasks) {
      syncStore.setTaskState(task.id, { status: "syncing", message: "Sincronizando task..." });

      try {
        await upsertTaskBundleToSupabase({
          task,
          comments: state.comments.filter((comment) => comment.taskId === task.id),
          activity: state.activity.filter((entry) => entry.taskId === task.id),
        });

        syncedIds.push(task.id);
        syncStore.setTaskState(task.id, { status: "success", message: "Task sincronizada." });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ taskId: task.id, message });
        syncStore.setTaskState(task.id, { status: "error", message });
        syncStore.pushDebugEvent({
          scope: "runtime",
          status: "error",
          message: `[DEBUG] Task ${task.id} failed to sync: ${message}`,
        });
      }
    }

    const { synced, failed: cFailed } = await syncChecklist(trigger === "task" ? "manual" : (trigger === "auto" ? "auto" : "manual"));
    checklistSynced = synced;
    checklistFailed = cFailed;

    if (syncedIds.length > 0) {
      useTasksStore.getState().markSynced(syncedIds);
      syncStore.recordSync(syncedIds.length, trigger);
      await hydrateFromServer("after-sync");
    } else if (checklistSynced > 0) {
      await hydrateFromServer("after-sync");
    }

    syncStore.patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger,
        status: failed.length > 0 || checklistFailed > 0 ? "error" : "success",
        pendingCount: tasks.length,
        syncedCount: syncedIds.length,
        message:
          failed.length > 0 || checklistFailed > 0
            ? `${syncedIds.length} task(s) sincronizadas e ${failed.length} falharam. Checklist: +${checklistSynced}/-${checklistFailed}`
            : `${syncedIds.length} task(s) + ${checklistSynced} checklist sincronizadas com sucesso.`,
      },
    });
    syncStore.pushDebugEvent({
      scope: "runtime",
      status: failed.length > 0 || checklistFailed > 0 ? "error" : "success",
      message:
        failed.length > 0 || checklistFailed > 0
          ? `[DEBUG] Sync finished with tasks ${syncedIds.length}s/${failed.length}f and checklist ${checklistSynced}s/${checklistFailed}f`
          : `[DEBUG] Sync finished successfully for ${syncedIds.length} task(s) + ${checklistSynced} checklist item(s)`,
    });

    return { syncedIds, failed, checklistSynced, checklistFailed };
  } finally {
    syncStore.setSyncing(false);
  }
}

export function useSyncRuntime() {
  const setOnline = useSyncStore((s) => s.setOnline);
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
  }, [online, patchDebug, pushDebugEvent]);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    void hydrateFromServer("boot");
    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      void hydrateFromServer("poll");
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [online]);

  useEffect(() => {
    if (!online) return;
    const pendingTasks = selectPendingSync(useTasksStore.getState()).length;
    const pendingChecklist = useChecklistStore.getState().getPendingUpserts().length;
    if (pendingTasks === 0 && pendingChecklist === 0) return;
    void syncTasks(undefined, "auto");
  }, [online]);
}

export function triggerManualSync(taskIds?: string[]) {
  return syncTasks(taskIds, taskIds && taskIds.length > 0 ? "task" : "manual");
}

/** Dev/demo helper: force-toggle a fake offline mode (overrides navigator). */
export function simulateOffline(off: boolean) {
  useSyncStore.getState().setOnline(!off);
}
