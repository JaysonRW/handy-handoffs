import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CloudOff, MessageSquare, Camera } from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "@/features/users/Avatar";
import { getBlock, getFlat } from "@/features/blocks/data";
import { useTasksStore } from "@/features/tasks/store";
import { cn } from "@/lib/utils";
import { TaskSyncNowButton } from "@/features/sync/SyncIndicator";

export function TaskCard({
  task,
  href,
  compact = false,
  actions,
  hideStatusBadge = false,
}: {
  task: Task;
  href: string;
  compact?: boolean;
  actions?: React.ReactNode;
  hideStatusBadge?: boolean;
}) {
  const navigate = useNavigate();
  const block = getBlock(task.blockId);
  const flat = getFlat(task.blockId, task.flatId);
  const comments = useTasksStore((s) => s.comments.filter((comment) => comment.taskId === task.id).length);
  const photos = (task.photo ? 1 : 0) + (task.extraPhotos?.length ?? 0);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate({ to: href as any })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ to: href as any });
        }
      }}
      className={cn(
        "surface-card group relative block p-4 transition hover:border-primary/50 hover:bg-surface-2 focus-ring",
      )}
    >
      {!task.synced && (
        <span className="absolute -top-2 -right-2 chip border-accent/50 bg-accent text-accent-foreground shadow-md">
          <CloudOff className="size-3" />
          Pending sync
        </span>
      )}
      <div className="flex items-start gap-3">
        {task.photo ? (
          <img
            src={task.photo}
            alt=""
            className="size-16 rounded-md object-cover border border-border shrink-0"
          />
        ) : (
          <div className="size-16 rounded-md border border-dashed border-border grid place-items-center text-muted-foreground shrink-0">
            <Camera className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} short />
            {!hideStatusBadge && <StatusBadge status={task.status} />}
            <span className="chip">{block?.name} · {flat?.label}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug line-clamp-2">{task.title}</h3>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar userId={task.assigneeId} size={20} />
              <span className="truncate">
                {task.assigneeId ? "Assigned" : "Unassigned"} ·{" "}
                {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {comments > 0 && (
                <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />{comments}</span>
              )}
              {photos > 0 && (
                <span className="inline-flex items-center gap-1"><Camera className="size-3" />{photos}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/60 grid gap-2">
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TaskSyncNowButton taskId={task.id} className="w-full justify-center" />
        </div>
        {actions}
      </div>
    </div>
  );
}
