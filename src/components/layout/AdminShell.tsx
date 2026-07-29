import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  LayoutDashboard,
  ListChecks,
  Building2,
  CloudOff,
  LogOut,
} from "lucide-react";
import { SyncIndicator } from "@/features/sync/SyncIndicator";
import { useAdminAuth } from "@/features/auth/store";
import { selectPendingSync, useTasksStore } from "@/features/tasks/store";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
  { to: "/admin/blocks", label: "Building & Flats", icon: Building2 },
];

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
  backTo,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backTo?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logout = useAdminAuth((s) => s.logout);
  const pending = useTasksStore((s) => selectPendingSync(s).length);
  const showBack = pathname !== "/admin";

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: backTo ?? "/admin" });
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col gap-1 bg-sidebar border-r border-sidebar-border p-4">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 focus-ring rounded-md">
          <div className="size-8 grid place-items-center rounded-md bg-primary text-primary-foreground font-black">P</div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">PMTMS</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Master admin</div>
          </div>
        </Link>
        <nav className="mt-4 flex flex-col gap-0.5">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition focus-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{it.label}</span>
                {it.to === "/admin/tasks" && pending > 0 && (
                  <span className="chip border-accent/40 bg-accent/15 text-accent-foreground">
                    <CloudOff className="size-3" /> {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-sidebar-border">
          <SyncIndicator />
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-ring"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-8 sm:py-5">
            <div className="min-w-0 flex items-start gap-3">
              {showBack ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:bg-surface focus-ring"
                  title="Back"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-xl sm:text-2xl font-bold">{title}</h1>
                {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          </div>
        </header>
        <div className="p-4 sm:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
