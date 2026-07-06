import { cn } from "@/lib/utils";
import { CloudOff, Cloud, Loader2, RefreshCw } from "lucide-react";
import { useSyncStore } from "./store";
import { selectPendingSync, useTasksStore } from "@/features/tasks/store";
import { triggerManualSync } from "./runtime";

export function SyncIndicator({ className }: { className?: string }) {
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);

  if (syncing) {
    return (
      <span className={cn("chip border-primary/40 bg-primary/10 text-primary", className)}>
        <Loader2 className="size-3 animate-spin" />
        Syncing
      </span>
    );
  }
  if (!online) {
    return (
      <span className={cn("chip border-accent/40 bg-accent/10 text-accent-foreground", className)}>
        <CloudOff className="size-3" />
        Offline
      </span>
    );
  }
  return (
    <span className={cn("chip border-success/40 bg-success/10 text-success", className)}>
      <Cloud className="size-3" />
      Online
    </span>
  );
}

export function SyncNowButton({ className, taskIds }: { className?: string; taskIds?: string[] }) {
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const pendingCount = useTasksStore((s) =>
    selectPendingSync(s).filter((task) => !taskIds || taskIds.includes(task.id)).length,
  );

  return (
    <button
      type="button"
      onClick={() => triggerManualSync(taskIds)}
      disabled={!online || syncing || pendingCount === 0}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground focus-ring hover:bg-primary/90 disabled:opacity-40",
        className,
      )}
      title={
        !online
          ? "Sync unavailable while offline"
          : pendingCount === 0
            ? "No pending tasks to sync"
            : "Sync pending tasks now"
      }
    >
      <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
      Sync now
    </button>
  );
}
