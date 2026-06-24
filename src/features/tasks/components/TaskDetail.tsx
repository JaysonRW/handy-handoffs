import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, MessageSquarePlus, RotateCcw, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Task, Priority } from "@/features/tasks/types";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "@/features/users/Avatar";
import { getBlock, getFlat } from "@/features/blocks/data";
import { USERS, getUser, usersByRole } from "@/features/users/data";
import { useTasksStore } from "@/features/tasks/store";

export function TaskDetail({
  task,
  actorId,
  backHref,
  isAdmin,
}: {
  task: Task;
  actorId: string;
  backHref: string;
  isAdmin: boolean;
}) {
  const setPriority = useTasksStore((s) => s.setPriority);
  const assign = useTasksStore((s) => s.assign);
  const setStatus = useTasksStore((s) => s.setStatus);
  const reopen = useTasksStore((s) => s.reopen);
  const acceptCompletion = useTasksStore((s) => s.acceptCompletion);
  const addComment = useTasksStore((s) => s.addComment);
  const addPhoto = useTasksStore((s) => s.addPhoto);

  const allComments = useTasksStore((s) => s.comments);
  const allActivity = useTasksStore((s) => s.activity);
  const comments = allComments.filter((comment) => comment.taskId === task.id);
  const activity = allActivity.filter((entry) => entry.taskId === task.id);

  const block = getBlock(task.blockId);
  const flat = getFlat(task.blockId, task.flatId);
  const creator = getUser(task.createdById);
  const assignable = [...usersByRole("CARETAKER"), ...usersByRole("CLEANER")];

  const [text, setText] = useState("");
  const canEdit = isAdmin || task.assigneeId === actorId || task.createdById === actorId;
  const canTransition = task.assigneeId === actorId || isAdmin;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <Link to={backHref as any} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <header className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            <span className="chip">{block?.name} · Flat {flat?.label}</span>
            {task.problemCategory && <span className="chip">{task.problemCategory}</span>}
            {task.complaintCategory && <span className="chip">{task.complaintCategory}</span>}
            {!task.synced && <span className="chip border-accent/40 bg-accent/15 text-accent-foreground">Pending sync</span>}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{task.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Avatar userId={task.createdById} size={24} />
            <span>Reported by <span className="text-foreground font-medium">{creator?.name}</span> · {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
          </div>

          {(task.photo || (task.extraPhotos?.length ?? 0) > 0) && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {task.photo && <img src={task.photo} className="rounded-md border border-border aspect-square object-cover" alt="" />}
              {task.extraPhotos?.map((p, i) => (
                <img key={i} src={p} className="rounded-md border border-border aspect-square object-cover" alt="" />
              ))}
            </div>
          )}
        </div>

        <aside className="surface-card p-4 flex flex-col gap-3 h-fit">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Triage</h3>
          {isAdmin ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Priority</label>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {(["P1", "P2", "P3"] as Exclude<Priority, null>[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(task.id, p, actorId)}
                      className={`rounded-md px-2 py-2 text-xs font-semibold border focus-ring ${task.priority === p ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:border-primary/50"}`}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Assignee</label>
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => assign(task.id, e.target.value || null, actorId)}
                  className="mt-1 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus-ring"
                >
                  <option value="">Unassigned</option>
                  <optgroup label="Caretakers">
                    {usersByRole("CARETAKER").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </optgroup>
                  <optgroup label="Cleaners">
                    {usersByRole("CLEANER").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </optgroup>
                </select>
              </div>
              {task.status === "DONE" && (
                <button
                  onClick={() => reopen(task.id, actorId)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-2 hover:bg-surface px-3 py-2 text-sm focus-ring"
                >
                  <RotateCcw className="size-4" /> Reopen task
                </button>
              )}
              {task.status === "DONE" && (
                <button
                  onClick={() => acceptCompletion(task.id, actorId)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-success/15 text-success border border-success/40 hover:bg-success/25 px-3 py-2 text-sm font-semibold focus-ring"
                >
                  <CheckCircle2 className="size-4" /> Accept completion
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">
              {task.priority ? `Priority ${task.priority}` : "Awaiting admin triage"}
              <div className="mt-2 flex items-center gap-2">
                <Avatar userId={task.assigneeId} size={22} />
                <span>{task.assigneeId ? getUser(task.assigneeId)?.name : "Unassigned"}</span>
              </div>
            </div>
          )}

          {canTransition && task.status !== "NEW" && (
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Update status</span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setStatus(task.id, "DOING", actorId)}
                  disabled={task.status === "DOING"}
                  className="rounded-md border border-border bg-surface-2 hover:bg-surface px-2 py-2 text-xs font-semibold focus-ring disabled:opacity-40"
                >Doing</button>
                <button
                  onClick={() => setStatus(task.id, "DONE", actorId)}
                  disabled={task.status === "DONE"}
                  className="rounded-md border border-success/40 bg-success/15 text-success hover:bg-success/25 px-2 py-2 text-xs font-semibold focus-ring disabled:opacity-40"
                >Done</button>
              </div>
            </div>
          )}
          {canTransition && task.status === "NEW" && task.assigneeId === actorId && (
            <button
              onClick={() => setStatus(task.id, "DOING", actorId)}
              className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold focus-ring hover:bg-primary/90"
            >Start work</button>
          )}
        </aside>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Comments</h3>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <Camera className="size-3.5" /> Add photo
              <input
                type="file" accept="image/*" capture="environment" className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => addPhoto(task.id, r.result as string, actorId);
                  r.readAsDataURL(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Add an update for the team…"
                className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus-ring resize-none"
              />
              <button
                onClick={() => { if (text.trim()) { addComment(task.id, text.trim(), actorId); setText(""); } }}
                disabled={!text.trim()}
                className="self-end rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-40 focus-ring hover:bg-primary/90 inline-flex items-center gap-1.5"
              >
                <Send className="size-3.5" /> Send
              </button>
            </div>
          )}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 inline-flex items-center gap-2"><MessageSquarePlus className="size-4" /> No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((c) => {
                const u = getUser(c.authorId);
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar userId={c.authorId} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold truncate">{u?.name ?? "Unknown"}</span>
                        <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3">Activity</h3>
          <ol className="relative border-l border-border ml-2 flex flex-col gap-3">
            {activity.map((a) => {
              const u = USERS.find((x) => x.id === a.actorId);
              return (
                <li key={a.id} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="text-xs">{a.message}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {u?.name ?? "System"} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
