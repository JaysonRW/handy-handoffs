import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/features/tasks/types";

const COPY: Record<TaskStatus, { label: string; tone: string }> = {
  NEW: { label: "New", tone: "bg-primary/15 text-primary border-primary/40" },
  DOING: { label: "Doing", tone: "bg-accent/15 text-accent border-accent/40" },
  DONE: { label: "Done", tone: "bg-success/15 text-success border-success/40" },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const c = COPY[status];
  return <span className={cn("chip border", c.tone, className)}>{c.label}</span>;
}
