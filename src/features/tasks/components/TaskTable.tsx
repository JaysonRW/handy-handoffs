import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CloudOff } from "lucide-react";
import type { Priority, Task } from "@/features/tasks/types";
import { useTasksStore } from "@/features/tasks/store";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "@/features/users/Avatar";
import { getBlock, getFlat } from "@/features/blocks/data";
import { getUser } from "@/features/users/data";
import { TaskSyncNowButton } from "@/features/sync/SyncIndicator";

export function TaskTable({
  tasks,
  buildHref,
  actorId,
}: {
  tasks: Task[];
  buildHref: (t: Task) => string;
  actorId?: string;
}) {
  if (tasks.length === 0) {
    return <div className="surface-card p-12 text-center text-muted-foreground text-sm">No tasks match these filters.</div>;
  }

  const navigate = useNavigate();
  const setPriority = useTasksStore((s) => s.setPriority);
  const addComment = useTasksStore((s) => s.addComment);

  const canQuick = !!actorId;
  const priorities = ["P1", "P2", "P3"] as Exclude<Priority, null>[];

  const [quick, setQuick] = useState<{ taskId: string | null; text: string }>({
    taskId: null,
    text: "",
  });

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-4 py-3">Task</th>
              <th className="text-left font-medium px-4 py-3">Location</th>
              <th className="text-left font-medium px-4 py-3">Priority</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Assignee</th>
              <th className="text-left font-medium px-4 py-3">Updated</th>
              {canQuick && <th className="text-left font-medium px-4 py-3">Follow-up</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const block = getBlock(t.blockId);
              const flat = getFlat(t.blockId, t.flatId);
              const a = getUser(t.assigneeId);
              const open = canQuick && quick.taskId === t.id;
              const draft = open ? quick.text : "";
              return (
                <Fragment key={t.id}>
                  <tr
                    className="border-b border-border/60 hover:bg-surface-2/60 cursor-pointer"
                    onClick={() => navigate({ to: buildHref(t) as any })}
                  >
                    <td className="px-4 py-3">
                      <Link to={buildHref(t) as any} className="font-medium hover:text-primary inline-flex items-center gap-2">
                        {!t.synced && <CloudOff className="size-3 text-primary" />}
                        <span className="line-clamp-1">{t.title}</span>
                      </Link>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{block?.name} · {flat?.label}</td>
                    <td className="px-4 py-3">
                      {canQuick ? (
                        <div className="grid grid-cols-3 gap-1 min-w-[120px]">
                          {priorities.map((p) => (
                            <button
                              key={p}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPriority(t.id, p, actorId!);
                              }}
                              className={`rounded-md px-2 py-1.5 text-xs font-semibold border focus-ring ${t.priority === p ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:border-primary/50"}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <PriorityBadge priority={t.priority} short />
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="inline-flex items-center gap-2"><Avatar userId={a.id} size={22} /> <span className="truncate">{a.name}</span></span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    </td>
                    {canQuick && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuick((prev) => ({
                                taskId: prev.taskId === t.id ? null : t.id,
                                text: prev.taskId === t.id ? "" : "",
                              }));
                            }}
                            className={`rounded-md px-3 py-2 text-xs font-semibold border focus-ring ${open ? "bg-surface-2 border-primary/60" : "bg-surface-2 border-border hover:border-primary/50"}`}
                          >
                            {open ? "Close" : "Comment"}
                          </button>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TaskSyncNowButton taskId={t.id} />
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>

                  {open && (
                    <tr className="border-b border-border/60 bg-surface-2/40">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid gap-2">
                          <textarea
                            value={draft}
                            onChange={(e) => setQuick({ taskId: t.id, text: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            rows={2}
                            placeholder="Internal note…"
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-ring"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
