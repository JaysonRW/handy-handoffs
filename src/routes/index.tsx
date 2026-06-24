import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ShieldCheck, Wrench, CloudOff, House } from "lucide-react";
import { usersByRole } from "@/features/users/data";
import { Avatar } from "@/features/users/Avatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PMTMS · Choose your portal" },
      { name: "description", content: "Property Maintenance Task Management for caretakers, cleaners, and admins." },
    ],
  }),
  component: Index,
});

function Index() {
  const caretakers = usersByRole("CARETAKER");
  const cleaners = usersByRole("CLEANER");

  return (
    <div className="min-h-screen">
      <header className="px-6 py-6 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="size-9 grid place-items-center rounded-md bg-primary text-primary-foreground font-black">P</div>
          <div className="leading-tight">
            <div className="text-sm font-bold">PMTMS</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Operations</div>
          </div>
        </div>
        <span className="chip border-accent/40 bg-accent/10 text-accent-foreground"><CloudOff className="size-3" /> Works offline</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24">
        <section className="py-10 sm:py-16 text-center">
          <span className="chip mx-auto"><ShieldCheck className="size-3" /> Field-ops console v1</span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight">
            Catch issues fast.<br />
            <span className="text-primary">Fix them faster.</span>
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            One workflow for caretakers, cleaners and the master admin —
            with offline-first task capture across Falcon, Martlett, Merlin, Oak and Northwood.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <Link
            to="/admin/login"
            className="surface-card group relative overflow-hidden p-6 transition hover:border-primary/50 hover:bg-surface-2 focus-ring"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="size-12 grid place-items-center rounded-lg bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div>
              <div>
                <h2 className="text-lg font-bold">Master Admin</h2>
                <p className="text-xs text-muted-foreground">Triage, prioritize and assign every task</p>
              </div>
            </div>
            <ul className="mt-5 text-sm text-muted-foreground space-y-1">
              <li>· Review new task queue</li>
              <li>· Set P1/P2/P3 and assign owners</li>
              <li>· Kanban + table + filters</li>
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Sign in <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">demo: <span className="font-mono">admin / admin</span></p>
          </Link>

          <Link
            to="/staff"
            className="surface-card group relative overflow-hidden p-6 transition hover:border-primary/50 hover:bg-surface-2 focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 grid place-items-center rounded-lg bg-accent/15 text-accent-foreground"><Wrench className="size-6" /></div>
              <div>
                <h2 className="text-lg font-bold">Field staff portal</h2>
                <p className="text-xs text-muted-foreground">Caretakers & cleaners — no login required</p>
              </div>
            </div>
            <div className="mt-5 flex -space-x-2">
              {[...caretakers, ...cleaners].slice(0, 6).map((u) => (
                <Avatar key={u.id} userId={u.id} size={32} className="ring-2 ring-card" />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{caretakers.length} caretakers · {cleaners.length} cleaners</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Pick your profile <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to="/report/new"
            className="surface-card group relative overflow-hidden p-6 transition hover:border-primary/50 hover:bg-surface-2 focus-ring"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-accent/25 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="size-12 grid place-items-center rounded-lg bg-primary/12 text-primary"><House className="size-6" /></div>
              <div>
                <h2 className="text-lg font-bold">Resident report</h2>
                <p className="text-xs text-muted-foreground">Public access for residents to log a new issue</p>
              </div>
            </div>
            <ul className="mt-5 text-sm text-muted-foreground space-y-1">
              <li>· No login required</li>
              <li>· Share the block and your name</li>
              <li>· Admin triages and assigns later</li>
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Create report <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3 text-sm">
          <Feature title="Offline-first" body="Capture tasks anywhere in the building. They sync automatically when you're back online." />
          <Feature title="Role-aware" body="Caretakers and cleaners only see their own tasks. Admin sees everything." />
          <Feature title="Audit trail" body="Every status change, comment and reassignment is logged on the task." />
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
          <Building2 className="size-3.5" /> 5 residential blocks · field-tested workflow
        </footer>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
