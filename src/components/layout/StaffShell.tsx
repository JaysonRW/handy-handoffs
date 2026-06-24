import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Home, Plus, ListChecks, History, LogOut, CloudOff } from "lucide-react";
import { Avatar } from "@/features/users/Avatar";
import { getUser } from "@/features/users/data";
import { SyncIndicator } from "@/features/sync/SyncIndicator";
import { selectPendingSync, selectVisibleForStaff, useTasksStore } from "@/features/tasks/store";

export function StaffShell({
  userId,
  children,
  title,
  subtitle,
  actions,
}: {
  userId: string;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const user = getUser(userId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pending = useTasksStore(
    (s) => selectPendingSync(s).filter((t) => t.createdById === userId).length,
  );
  const total = useTasksStore((s) => selectVisibleForStaff(userId)(s).length);

  const tabs = [
    { to: `/staff/${userId}`, label: "Home", icon: Home, exact: true },
    { to: `/staff/${userId}/tasks`, label: "Tasks", icon: ListChecks, badge: total },
    { to: `/staff/${userId}/new`, label: "New", icon: Plus, primary: true },
    { to: `/staff/${userId}/sync`, label: "Sync", icon: History, badge: pending || undefined },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/staff" className="flex items-center gap-2 focus-ring rounded-md">
            <Avatar userId={userId} size={36} />
            <div className="min-w-0 leading-tight hidden sm:block">
              <div className="text-sm font-bold truncate">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {user?.role.replace("_", " ").toLowerCase()}
              </div>
            </div>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg sm:text-xl font-bold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SyncIndicator />
            {actions}
            <Link
              to="/staff"
              className="grid place-items-center size-9 rounded-md border border-border text-muted-foreground hover:bg-surface-2 focus-ring"
              title="Switch user"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl grid grid-cols-4">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium focus-ring",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  t.primary && "text-primary-foreground",
                )}
              >
                {t.primary ? (
                  <span className="-mt-6 grid place-items-center size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <Icon className="size-5" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                <span className={cn(t.primary && "text-foreground")}>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="absolute top-2 right-1/4 chip border-accent/40 bg-accent/20 text-accent-foreground">
                    {t.to.endsWith("/sync") ? <CloudOff className="size-3" /> : null}
                    {t.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
