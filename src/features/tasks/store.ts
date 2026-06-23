import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/id";
import type {
  ActivityEntry,
  Comment,
  Priority,
  Task,
  TaskStatus,
} from "./types";
import { seedTasks } from "./seed";

interface TasksState {
  tasks: Task[];
  comments: Comment[];
  activity: ActivityEntry[];
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
  markSynced: (taskIds: string[]) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();

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

      createTask: (input, actorId) => {
        const task: Task = {
          ...input,
          id: nanoid(),
          status: "NEW",
          priority: null,
          assigneeId: null,
          createdAt: now(),
          updatedAt: now(),
          synced: navigator.onLine,
          syncedAt: navigator.onLine ? now() : undefined,
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
            t.id === taskId ? { ...t, priority, updatedAt: now() } : t,
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
              t.id === taskId ? { ...t, assigneeId, updatedAt: now() } : t,
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
            t.id === taskId ? { ...t, status, updatedAt: now() } : t,
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
            t.id === taskId ? { ...t, status: "DONE", updatedAt: now() } : t,
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
            t.id === taskId ? { ...t, status: "DOING", updatedAt: now() } : t,
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
              ? { ...t, extraPhotos: [...(t.extraPhotos ?? []), dataUrl], updatedAt: now() }
              : t,
          ),
          activity: logActivity(s, {
            taskId,
            actorId,
            type: "photo_added",
            message: "Photo added",
          }),
        })),

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

      reset: () => {
        const seeded = seedTasks();
        set({ tasks: seeded.tasks, comments: seeded.comments, activity: seeded.activity });
      },
    }),
    {
      name: "pmtms.tasks.v2",
      onRehydrateStorage: () => (state) => {
        if (state && state.tasks.length === 0) {
          const seeded = seedTasks();
          state.tasks = seeded.tasks;
          state.comments = seeded.comments;
          state.activity = seeded.activity;
        }
      },
    },
  ),
);

// Selectors
export const selectPendingSync = (s: TasksState) => s.tasks.filter((t) => !t.synced);
export const selectByAssignee = (uid: string) => (s: TasksState) =>
  s.tasks.filter((t) => t.assigneeId === uid);
export const selectByCreator = (uid: string) => (s: TasksState) =>
  s.tasks.filter((t) => t.createdById === uid);
export const selectVisibleForStaff = (uid: string) => (s: TasksState) =>
  s.tasks.filter((t) => t.assigneeId === uid || t.createdById === uid);
export const selectCommentsForTask = (taskId: string) => (s: TasksState) =>
  s.comments.filter((c) => c.taskId === taskId);
export const selectActivityForTask = (taskId: string) => (s: TasksState) =>
  s.activity.filter((a) => a.taskId === taskId);
