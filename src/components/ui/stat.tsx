import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatTone = "primary" | "accent" | "success" | "danger";

export function Stat({
  label,
  value,
  icon: Icon,
  tone,
  to,
  search,
  subtitle,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
  to: string;
  search?: Record<string, unknown>;
  subtitle?: string;
}) {
  const toneCls = {
    primary: "text-primary bg-primary/15 border-primary/30",
    accent: "text-accent-foreground bg-accent/15 border-accent/30",
    success: "text-success bg-success/15 border-success/30",
    danger: "text-[color:var(--color-p1)] bg-[color:var(--color-p1)]/15 border-[color:var(--color-p1)]/30",
  }[tone];

  return (
    <Link
      to={to}
      search={search as any}
      className="surface-card p-5 group transition hover:border-primary/40 hover:bg-surface-2 focus-ring min-w-0 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`size-10 grid place-items-center rounded-md border ${toneCls}`}>
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <div className="mt-4 text-3xl font-black tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
      {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
    </Link>
  );
}
