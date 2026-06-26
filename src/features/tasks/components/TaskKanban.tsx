import { useState } from "react";
import type { Priority, Task } from "@/features/tasks/types";
import { useTasksStore } from "@/features/tasks/store";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";

export function TaskKanban({
  tasks,
  buildHref,
  actorId,
}: {
  tasks: Task[];
  buildHref: (t: Task) => string;
  actorId?: string;
}) {
  const setPriority = useTasksStore((s) => s.setPriority);
  const addComment = useTasksStore((s) => s.addComment);

  const [quick, setQuick] = useState<{ taskId: string | null; text: string }>({
    taskId: null,
    text: "",
  });

  const cols = [
    { key: "NEW", title: "New · Awaiting triage", tone: "border-primary/40" },
    { key: "DOING", title: "Doing · In progress", tone: "border-accent/40" },
    { key: "DONE", title: "Done · Awaiting review", tone: "border-success/40" },
  ] as const;

  const priorities = ["P1", "P2", "P3"] as Exclude<Priority, null>[];
  const canQuick = !!actorId;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cols.map((c) => {
        const list = tasks.filter((t) => t.status === c.key);
        return (
          <section key={c.key} className={`surface-card border-t-2 ${c.tone} p-3 flex flex-col gap-3 min-h-[300px]`}>
            <header className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <span className="chip">{list.length}</span>
            </header>
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No tasks here.</p>
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
