import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheckBig } from "lucide-react";
import { TaskForm } from "@/features/tasks/components/TaskForm";
import { RESIDENT_PORTAL_USER_ID } from "@/features/users/data";
import type { Task } from "@/features/tasks/types";

export const Route = createFileRoute("/report/new")({
  head: () => ({ meta: [{ title: "Resident report · PMTMS" }] }),
  component: ResidentReportPage,
});

function ResidentReportPage() {
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  if (createdTask) {
    return (
      <div className="min-h-screen max-w-3xl mx-auto px-4 py-8">
        <div className="surface-card p-8 text-center">
          <div className="mx-auto size-14 grid place-items-center rounded-full bg-success/15 text-success">
            <CircleCheckBig className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Report sent</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you. The master admin will review and assign this task.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setCreatedTask(null)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-ring hover:bg-primary/90"
            >
              Create another report
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold focus-ring hover:bg-surface"
            >
              Back to portals <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-black tracking-tight">Resident report</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use this public form to report a new issue in your block. The admin will
          review it and assign the work team afterwards.
        </p>
      </header>

      <TaskForm
        creatorId={RESIDENT_PORTAL_USER_ID}
        mode="resident"
        onCreated={setCreatedTask}
      />
    </div>
  );
}
