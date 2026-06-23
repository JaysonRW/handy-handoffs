import type { Task } from "@/features/tasks/types";
import { TaskCard } from "./TaskCard";

export function TaskKanban({ tasks, buildHref }: { tasks: Task[]; buildHref: (t: Task) => string }) {
  const cols = [
    { key: "NEW", title: "New · Awaiting triage", tone: "border-primary/40" },
    { key: "DOING", title: "Doing · In progress", tone: "border-accent/40" },
    { key: "DONE", title: "Done · Awaiting review", tone: "border-success/40" },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cols.map((c) => {
        const list = tasks.filter((t) => t.status === c.key);
        return (
          <section key={c.key} className={`surface-card border-t-2 ${c.tone} p-3 flex flex-col gap-3 min-h-[300px]`}>
            <header className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <span className="chip">{list.length}</span>
            </header>
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No tasks here.</p>
              ) : (
                list.map((t) => <TaskCard key={t.id} task={t} href={buildHref(t)} compact />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
