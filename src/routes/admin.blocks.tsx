import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { BLOCKS } from "@/features/blocks/data";
import { useTasksStore } from "@/features/tasks/store";

export const Route = createFileRoute("/admin/blocks")({
  head: () => ({ meta: [{ title: "Blocks · PMTMS Admin" }] }),
  component: BlocksPage,
});

function BlocksPage() {
  const tasks = useTasksStore((s) => s.tasks);
  return (
    <AdminShell title="Blocks & flats" subtitle={`${BLOCKS.length} blocks · ${BLOCKS.reduce((a, b) => a + b.flats.length, 0)} flats`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BLOCKS.map((b) => {
          const open = tasks.filter((t) => t.blockId === b.id && t.status !== "DONE").length;
          return (
            <article key={b.id} className="surface-card p-5">
              <header className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{b.name}</h2>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
                <Link
                  to="/admin/tasks"
                  search={{ blockId: b.id }}
                  className="chip border-primary/40 bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 focus-ring"
                >
                  {open} open
                </Link>
              </header>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Open the full task list filtered to <span className="font-medium text-foreground">{b.name}</span>.
                </p>
                <Link
                  to="/admin/tasks"
                  search={{ blockId: b.id }}
                  className="inline-flex items-center rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold hover:border-primary/50 hover:text-foreground focus-ring"
                >
                  Open
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {b.flats.map((f) => {
                  const has = tasks.some((t) => t.flatId === f.id && t.status !== "DONE");
                  return (
                    <Link
                      key={f.id}
                      to="/admin/tasks"
                      search={{ blockId: b.id, flatId: f.id }}
                      className={`px-1.5 py-1 rounded text-[11px] font-mono border transition-colors hover:border-primary/50 hover:text-foreground focus-ring ${has ? "border-accent/40 bg-accent/10 text-accent-foreground" : "border-border bg-surface-2 text-muted-foreground"}`}
                      title={`Flat ${f.label}${has ? " · has open task" : ""}`}
                    >
                      {f.label}
                    </Link>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
