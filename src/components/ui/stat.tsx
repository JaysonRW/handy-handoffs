import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ToOptions } from "@tanstack/router-core";

export type StatTone = "primary" | "accent" | "success" | "danger";

export function Stat<TTo extends string = string>({
  label,
  value,
  icon: Icon,
  tone,
  to,
  search,
  params,
  subtitle,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
  to: TTo;
  search?: ToOptions<TTo>["search"] | Record<string, unknown>;
  params?: Record<string, unknown>;
  subtitle?: string;
}) {
  const navigate = useNavigate({ from: "." as any });

  const toneCls = {
    primary: "text-primary bg-primary/15 border-primary/30",
    accent: "text-accent-foreground bg-accent/15 border-accent/30",
    success: "text-success bg-success/15 border-success/30",
    danger: "text-[color:var(--color-p1)] bg-[color:var(--color-p1)]/15 border-[color:var(--color-p1)]/30",
  }[tone];

  async function handleClick() {
    const opts: Record<string, unknown> = { to } as any;
    if (search !== undefined) opts.search = search as any;
    if (params !== undefined) opts.params = params as any;
    try {
      await navigate(opts as any);
    } catch {
      if (typeof window !== "undefined") {
        const q = search && typeof search === "object" ? Object.entries(search as Record<string, string | number>).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&") : "";
        const base = to as string;
        window.location.assign(base + (q ? `?${q}` : ""));
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full surface-card p-5 group transition hover:border-primary/40 hover:bg-surface-2 focus-ring min-w-0 overflow-hidden text-left"
      aria-label={`${value} ${label} — open filtered list`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`size-10 grid place-items-center rounded-md border ${toneCls}`}>
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <div className="mt-4 text-3xl font-black tabular-nums text-left">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 text-left">{label}</div>
      {subtitle ? <div className="mt-1 text-xs text-muted-foreground text-left">{subtitle}</div> : null}
    </button>
  );
}
