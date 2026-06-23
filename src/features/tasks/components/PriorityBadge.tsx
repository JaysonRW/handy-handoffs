import { cn } from "@/lib/utils";
import type { Priority } from "@/features/tasks/types";

const COPY: Record<Exclude<Priority, null>, { label: string; tone: string }> = {
  P1: { label: "P1 · Urgent", tone: "bg-[color:var(--color-p1)]/15 text-[color:var(--color-p1)] border-[color:var(--color-p1)]/40" },
  P2: { label: "P2 · High", tone: "bg-[color:var(--color-p2)]/15 text-[color:var(--color-p2)] border-[color:var(--color-p2)]/40" },
  P3: { label: "P3 · Normal", tone: "bg-[color:var(--color-p3)]/15 text-[color:var(--color-p3)] border-[color:var(--color-p3)]/40" },
};

export function PriorityBadge({
  priority,
  className,
  short = false,
}: {
  priority: Priority;
  className?: string;
  short?: boolean;
}) {
  if (!priority) {
    return (
      <span className={cn("chip text-muted-foreground", className)}>
        <span className="size-1.5 rounded-full bg-muted-foreground/60" />
        Triage
      </span>
    );
  }
  const c = COPY[priority];
  return (
    <span className={cn("chip border", c.tone, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {short ? priority : c.label}
    </span>
  );
}
