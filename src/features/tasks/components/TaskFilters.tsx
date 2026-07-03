import { useMemo, useState } from "react";
import type { Task, Priority, TaskStatus } from "@/features/tasks/types";
import { BLOCKS } from "@/features/blocks/data";
import { USERS, usersByRole } from "@/features/users/data";

export interface TaskFilters {
  q: string;
  blockId: string;
  flatId: string;
  priority: Priority | "ALL";
  status: TaskStatus | "ALL";
  assigneeId: string | "ALL" | "UNASSIGNED";
  range: "ALL" | "TODAY" | "WEEK";
}

export const defaultFilters: TaskFilters = {
  q: "",
  blockId: "ALL",
  flatId: "ALL",
  priority: "ALL",
  status: "ALL",
  assigneeId: "ALL",
  range: "ALL",
};

export function useFilteredTasks(tasks: Task[], filters: TaskFilters) {
  return useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.blockId !== "ALL" && t.blockId !== filters.blockId) return false;
      if (filters.flatId !== "ALL" && t.flatId !== filters.flatId) return false;
      if (filters.priority !== "ALL" && t.priority !== filters.priority) return false;
      if (filters.status !== "ALL" && t.status !== filters.status) return false;
      if (filters.assigneeId === "UNASSIGNED" && t.assigneeId) return false;
      if (filters.assigneeId !== "ALL" && filters.assigneeId !== "UNASSIGNED" && t.assigneeId !== filters.assigneeId) return false;
      if (filters.range !== "ALL") {
        const created = new Date(t.createdAt).getTime();
        const limit = filters.range === "TODAY" ? 24 * 3600_000 : 7 * 24 * 3600_000;
        if (now - created > limit) return false;
      }
      return true;
    });
  }, [tasks, filters]);
}

export function TaskFiltersBar({
  value,
  onChange,
  hideAssignee = false,
}: {
  value: TaskFilters;
  onChange: (v: TaskFilters) => void;
  hideAssignee?: boolean;
}) {
  const block = BLOCKS.find((b) => b.id === value.blockId);
  const assignable = [...usersByRole("CARETAKER"), ...usersByRole("CLEANER")];

  const upd = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="surface-card p-3 flex flex-wrap items-center gap-2">
      <input
        value={value.q}
        onChange={(e) => upd("q", e.target.value)}
        placeholder="Search tasks…"
        className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm min-w-[180px] flex-1 focus-ring"
      />
      <Select value={value.blockId} onChange={(v) => onChange({ ...value, blockId: v, flatId: "ALL" })}>
        <option value="ALL">All blocks</option>
        {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      <Select value={value.flatId} onChange={(v) => upd("flatId", v)} disabled={value.blockId === "ALL"}>
        <option value="ALL">All flats</option>
        {block?.flats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </Select>
      <Select value={value.priority ?? "ALL"} onChange={(v) => upd("priority", v as TaskFilters["priority"])}>
        <option value="ALL">All priority</option>
        <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option>
      </Select>
      <Select value={value.status} onChange={(v) => upd("status", v as TaskFilters["status"])}>
        <option value="ALL">All status</option>
        <option value="NEW">New</option><option value="DOING">Doing</option><option value="DONE">Done</option>
      </Select>
      {!hideAssignee && (
        <Select value={value.assigneeId} onChange={(v) => upd("assigneeId", v as TaskFilters["assigneeId"])}>
          <option value="ALL">Any assignee</option>
          <option value="UNASSIGNED">Unassigned</option>
          {assignable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      )}
      <Select value={value.range} onChange={(v) => upd("range", v as TaskFilters["range"])}>
        <option value="ALL">Any date</option>
        <option value="TODAY">Today</option>
        <option value="WEEK">This week</option>
      </Select>
      <button
        onClick={() => onChange(defaultFilters)}
        className="text-xs text-muted-foreground hover:text-foreground px-2"
      >Clear</button>
    </div>
  );
}

function Select({ value, onChange, children, disabled }: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus-ring disabled:opacity-40"
    >
      {children}
    </select>
  );
}

export function useTaskFiltersState(initialValue: TaskFilters = defaultFilters) {
  return useState<TaskFilters>(initialValue);
}
