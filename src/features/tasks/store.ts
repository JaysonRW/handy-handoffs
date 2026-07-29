import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";
import { getUser } from "@/features/users/data";
import type {
  ActivityEntry,
  Comment,
  Priority,
  Role,
  Task,
  TaskAttachmentKind,
  TaskStatus,
} from "./types";
import { seedTasks } from "./seed";

interface TasksState {
  tasks: Task[];
  comments: Comment[];
  activity: ActivityEntry[];
  hydratedFromServerAt?: string;
  /** Local IDs queued for sync (not yet "synced") */
  // derived from tasks.synced flag; no separate queue needed

  createTask: (
    input: Omit<Task, "id" | "status" | "priority" | "assigneeId" | "createdAt" | "updatedAt" | "synced">,
    actorId: string,
  ) => Task;
  setPriority: (taskId: string, priority: Priority, actorId: string) => void;
  assign: (taskId: string, assigneeId: string | null, actorId: string) => void;
  setStatus: (taskId: string, status: TaskStatus, actorId: string) => void;
  acceptCompletion: (taskId: string, actorId: string) => void;
  reopen: (taskId: string, actorId: string) => void;
  addComment: (taskId: string, text: string, actorId: string) => void;
  addPhoto: (taskId: string, dataUrl: string, actorId: string) => void;
  setBeforeAfterPhoto: (
    taskId: string,
    kind: Extract<TaskAttachmentKind, "BEFORE" | "AFTER">,
    dataUrl: string | null,
    actorId: string,
  ) => void;
  markSynced: (taskIds: string[]) => void;
  hydrateFromServer: (snapshot: {
    tasks: Task[];
    comments: Comment[];
    activity: ActivityEntry[];
  }) => boolean;
  reset: () => void;
  wipeLocal: () => void;
}

const now = () => new Date().toISOString();

const markTaskPending = <T extends Task>(task: T, patch: Partial<Task> = {}): T => ({
  ...task,
  ...patch,
  updatedAt: now(),
  synced: false,
  syncedAt: undefined,
});

const logActivity = (
  state: TasksState,
  entry: Omit<ActivityEntry, "id" | "createdAt">,
): ActivityEntry[] => [
  { ...entry, id: nanoid(), createdAt: now() },
  ...state.activity,
].slice(0, 500);

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      comments: [],
      activity: [],
      hydratedFromServerAt: undefined,

      createTask: (input, actorId) => {
        const ts = now();
        const task: Task = {
          ...input,
          id: nanoid(),
          status: "NEW",
          priority: null,
          assigneeId: null,
          createdAt: ts,
          updatedAt: ts,
          synced: false,
          syncedAt: undefined,
        };
        set((s) => ({
          tasks: [task, ...s.tasks],
          activity: logActivity(s, {
            taskId: task.id,
            actorId,
            type: "created",
            message: `Created task “${task.title}”`,
          }),
        }));
        return task;
      },

      setPriority: (taskId, priority, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? markTaskPending(t, { priority }) : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "priority_set",
            message: `Priority set to ${priority ?? "—"}`,
          }),
        })),

      assign: (taskId, assigneeId, actorId) =>
        set((s) => {
          const prev = s.tasks.find((t) => t.id === taskId);
          const reassigning = !!prev?.assigneeId && prev.assigneeId !== assigneeId;
          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId ? markTaskPending(t, { assigneeId }) : t,
            ),
            activity: logActivity(s, {
              taskId,
              actorId,
              type: reassigning ? "reassigned" : "assigned",
              message: assigneeId
                ? `${reassigning ? "Reassigned" : "Assigned"} to ${assigneeId}`
                : "Unassigned",
            }),
          };
        }),

      setStatus: (taskId, status, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? markTaskPending(t, { status }) : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "status_changed",
            message: `Status → ${status}`,
          }),
        })),

      acceptCompletion: (taskId, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? markTaskPending(t, { status: "DONE" }) : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "accepted",
            message: "Completion accepted",
          }),
        })),

      reopen: (taskId, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? markTaskPending(t, { status: "DOING" }) : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "reopened",
            message: "Task reopened",
          }),
        })),

      addComment: (taskId, text, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? markTaskPending(t) : t,
          ),
          comments: [
            { id: nanoid(), taskId, authorId: actorId, text, createdAt: now() },
            ...s.comments,
          ],
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "comment",
            message: text.length > 80 ? text.slice(0, 80) + "…" : text,
          }),
        })),

      addPhoto: (taskId, dataUrl, actorId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? markTaskPending(t, {
                  extraPhotos: [...(t.extraPhotos ?? []), dataUrl],
                })
              : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "photo_added",
            message: "Photo added",
          }),
        })),

      setBeforeAfterPhoto: (taskId, kind, dataUrl, actorId) =>
        set((s) => {
          const prop = kind === "BEFORE" ? "beforePhoto" : "afterPhoto";
          const pathProp = kind === "BEFORE" ? "beforePhotoPath" : "afterPhotoPath";
          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? markTaskPending(t, {
                    [prop]: dataUrl,
                    [pathProp]: dataUrl == null ? undefined : (t as any)[pathProp],
                  } as any)
                : t,
            ),
            activity: logActivity(s, {
              taskId,
              actorId,
              type: "photo_added",
              message: dataUrl
                ? `${kind === "BEFORE" ? "Before" : "After"} photo uploaded`
                : `${kind === "BEFORE" ? "Before" : "After"} photo removed`,
              meta: { kind },
            }),
          };
        }),

      markSynced: (taskIds) =>
        set((s) => {
          const ts = now();
          const set = new Set(taskIds);
          const newActivity: ActivityEntry[] = taskIds.map((id) => ({
            id: nanoid(),
            taskId: id,
            actorId: "system",
            type: "synced",
            message: "Synced to server",
            createdAt: ts,
          }));
          return {
            tasks: s.tasks.map((t) =>
              set.has(t.id) ? { ...t, synced: true, syncedAt: ts } : t,
            ),
            activity: [...newActivity, ...s.activity].slice(0, 500),
          };
        }),

      hydrateFromServer: (snapshot) => {
        const state = get();

        const mergedTasks = new Map(state.tasks.map((t) => [t.id, t] as const));
        for (const serverTask of snapshot.tasks) {
          const local = mergedTasks.get(serverTask.id);
          if (!local) {
            mergedTasks.set(serverTask.id, serverTask);
            continue;
          }

          const localUpdatedAt = Date.parse(local.updatedAt);
          const serverUpdatedAt = Date.parse(serverTask.updatedAt);
          const canTrustServer = local.synced && Number.isFinite(localUpdatedAt) && Number.isFinite(serverUpdatedAt);

          if (canTrustServer && serverUpdatedAt > localUpdatedAt) {
            mergedTasks.set(serverTask.id, serverTask);
          }
        }

        const mergedComments = new Map(state.comments.map((c) => [c.id, c] as const));
        for (const c of snapshot.comments) mergedComments.set(c.id, c);

        const mergedActivity = new Map(state.activity.map((a) => [a.id, a] as const));
        for (const a of snapshot.activity) mergedActivity.set(a.id, a);

        set({
          tasks: Array.from(mergedTasks.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          comments: Array.from(mergedComments.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          activity: Array.from(mergedActivity.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          hydratedFromServerAt: now(),
        });

        return true;
      },

      reset: () => {
        const seeded = seedTasks();
        set({
          tasks: seeded.tasks,
          comments: seeded.comments,
          activity: seeded.activity,
          hydratedFromServerAt: undefined,
        });
      },

      wipeLocal: () => {
        set({
          tasks: [],
          comments: [],
          activity: [],
          hydratedFromServerAt: undefined,
        });
      },
    }),
    {
      name: "pmtms.tasks.v2",
    },
  ),
);

// Selectors
export const selectPendingSync = (s: TasksState) => s.tasks.filter((t) => !t.synced);
export const selectByAssignee = (uid: string) => (s: TasksState) =>
  s.tasks.filter((t) => t.assigneeId === uid);
export const selectByCreator = (uid: string) => (s: TasksState) =>
  s.tasks.filter((t) => t.createdById === uid);
const getVisibleRole = (uid: string): Role | undefined => getUser(uid)?.role;
export const selectVisibleForStaff = (uid: string) => (s: TasksState) => {
  const role = getVisibleRole(uid);
  if (role === "CLEANER") return s.tasks.filter((t) => t.assigneeId === uid);
  return s.tasks.filter((t) => t.assigneeId === uid || t.createdById === uid);
};
export const selectCommentsForTask = (taskId: string) => (s: TasksState) =>
  s.comments.filter((c) => c.taskId === taskId);
export const selectActivityForTask = (taskId: string) => (s: TasksState) =>
  s.activity.filter((a) => a.taskId === taskId);
