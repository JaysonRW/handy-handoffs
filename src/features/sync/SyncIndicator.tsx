import { cn } from "@/lib/utils";
import { CloudOff, Cloud, Loader2 } from "lucide-react";
import { useSyncStore } from "./store";

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
