import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MobileTabItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number | ReactNode;
  badgeTone?: "accent" | "p1" | "success";
};

export function MobileBottomTabs({
  items,
  maxWidthClass = "max-w-3xl",
  safeArea = true,
}: {
  items: MobileTabItem[];
  maxWidthClass?: string;
  safeArea?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!items.length) return null;

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/92 backdrop-blur-md",
        safeArea && "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Mobile navigation"
      role="navigation"
    >
      <div
        className={cn(
          "mx-auto grid",
          maxWidthClass,
        )}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium focus-ring transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("size-5 shrink-0", active && "stroke-[2.2px]")} />
              <span className="truncate max-w-full leading-tight">{it.label}</span>
              {it.badge !== undefined && it.badge !== null && it.badge !== 0 ? (
                <span
                  className={cn(
                    "absolute top-1.5 right-1/4 translate-x-1/2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none border",
                    it.badgeTone === "p1"
                      ? "border-[color:var(--color-p1)]/50 bg-[color:var(--color-p1)]/15 text-[color:var(--color-p1)]"
                      : it.badgeTone === "success"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-accent/40 bg-accent/15 text-accent-foreground",
                  )}
                >
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
