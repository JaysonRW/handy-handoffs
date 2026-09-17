import { useState } from "react";
import type { Priority, Task } from "@/features/tasks/types";
import { useTasksStore } from "@/features/tasks/store";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { TaskSyncNowButton } from "@/features/sync/SyncIndicator";
import { getUser } from "@/features/users/data";

export function getAdminAssigneeBucket(task: Task) {
  const assigneeRole = getUser(task.assigneeId)?.role;

  if (assigneeRole === "CARETAKER") return "caretaker";
  if (assigneeRole === "CLEANER") return "cleaner";
  return "new";
}

export function countTasksOlderThanSevenDays(tasks: Task[], now = Date.now()) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return tasks.filter((task) => {
    if (task.status === "DONE") return false;
    const createdAtMs = new Date(task.createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    return now - createdAtMs > sevenDaysMs;
  }).length;
}

export function TaskKanban({
  tasks,
  buildHref,
  actorId,
  layout = "status",
}: {
  tasks: Task[];
  buildHref: (t: Task) => string;
  actorId?: string;
  layout?: "status" | "admin_assignee_role";
}) {
  const setPriority = useTasksStore((s) => s.setPriority);
  const addComment = useTasksStore((s) => s.addComment);

  const [quick, setQuick] = useState<{ taskId: string | null; text: string }>({
    taskId: null,
    text: "",
  });

  const cols =
    layout === "admin_assignee_role"
      ? [
          {
            key: "new",
            title: "New · Awaiting triage",
            tone: "border-primary/40",
            emptyText: "No new tasks here.",
            list: tasks.filter((task) => getAdminAssigneeBucket(task) === "new"),
          },
          {
            key: "caretaker",
            title: "Caretaker · Assigned tasks",
            tone: "border-accent/40",
            emptyText: "No tasks assigned to Caretaker.",
            list: tasks.filter((task) => getAdminAssigneeBucket(task) === "caretaker"),
          },
        ]
      : [
          {
            key: "NEW",
            title: "New · Awaiting triage",
            tone: "border-primary/40",
            emptyText: "No tasks here.",
            list: tasks.filter((task) => task.status === "NEW"),
          },
          {
            key: "DOING",
            title: "Doing · In progress",
            tone: "border-accent/40",
            emptyText: "No tasks here.",
            list: tasks.filter((task) => task.status === "DOING"),
          },
          {
            key: "DONE",
            title: "Done · Awaiting review",
            tone: "border-success/40",
            emptyText: "No tasks here.",
            list: tasks.filter((task) => task.status === "DONE"),
          },
        ];

  const priorities = ["P1", "P2", "P3"] as Exclude<Priority, null>[];
  const canQuick = !!actorId;

  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "admin_assignee_role" ? "md:grid-cols-2" : "md:grid-cols-3",
      )}
    >  {cols.map((c) => {
        const list = c.list;
        const agingCount = countTasksOlderThanSevenDays(list);
        return (
          <section key={c.key} className={`surface-card border-t-2 ${c.tone} p-3 flex flex-col gap-3 min-h-[300px]`}>
            <header className="flex items-start justify-between gap-3 px-1">
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <div className="flex items-center gap-2">
                <MetricChip label="Total" value={list.length} />
                <MetricChip label="+7 days" value={agingCount} tone="warning" />
              </div>
            </header>
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">{c.emptyText}</p>
              ) : (
                list.map((t) => {
                  const open = canQuick && quick.taskId === t.id;
                  const draft = open ? quick.text : "";

                  return (
                    <TaskCard
                      key={t.id}
                      task={t}
                      href={buildHref(t)}
                      compact
                      actions={
                        canQuick ? (
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="grid grid-cols-3 gap-1">
                                {priorities.map((p) => (
                                  <button
                                    key={p}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPriority(t.id, p, actorId!);
                                    }}
                                    className={cn(
                                      "rounded-md px-2 py-1.5 text-xs font-semibold border focus-ring",
                                      t.priority === p
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-surface-2 border-border hover:border-primary/50",
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setQuick((prev) => ({
                                    taskId: prev.taskId === t.id ? null : t.id,
                                    text: prev.taskId === t.id ? "" : "",
                                  }));
                                }}
                                className={cn(
                                  "rounded-md px-2.5 py-1.5 text-xs font-semibold border focus-ring whitespace-nowrap",
                                  open
                                    ? "bg-surface-2 border-primary/60"
                                    : "bg-surface-2 border-border hover:border-primary/50",
                                )}
                              >
                                Follow-up
                              </button>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <TaskSyncNowButton taskId={t.id} className="w-full justify-center" />
                            </div>

                            {open && (
                              <div className="grid gap-2">
                                <textarea
                                  value={draft}
                                  onChange={(e) => setQuick({ taskId: t.id, text: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  rows={2}
                                  placeholder="Internal note…"
                                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-ring"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setQuick({ taskId: null, text: "" });
                                    }}
                                    className="rounded-md px-3 py-2 text-xs font-semibold border border-border bg-surface-2 hover:bg-surface focus-ring"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    disabled={!draft.trim()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const text = draft.trim();
                                      if (!text) return;
                                      addComment(t.id, text, actorId!);
                                      setQuick({ taskId: null, text: "" });
                                    }}
                                    className="rounded-md px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus-ring disabled:opacity-40"
                                  >
                                    Send
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : undefined
                      }
                    />
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex min-w-[58px] flex-col items-center rounded-full border px-2.5 py-1 text-center",
        tone === "warning"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border bg-surface-2 text-foreground",
      )}
    >
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", tone === "warning" ? "text-warning/90" : "text-muted-foreground")}>
        {label}
      </span>
      <span className="text-sm font-semibold leading-tight">{value}</span>
    </div>
  );
}
