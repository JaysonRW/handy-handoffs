import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CloudOff } from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "@/features/users/Avatar";
import { getBlock, getFlat } from "@/features/blocks/data";
import { getUser } from "@/features/users/data";

export function TaskTable({ tasks, buildHref }: { tasks: Task[]; buildHref: (t: Task) => string }) {
  if (tasks.length === 0) {
    return <div className="surface-card p-12 text-center text-muted-foreground text-sm">No tasks match these filters.</div>;
  }
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-4 py-3">Task</th>
              <th className="text-left font-medium px-4 py-3">Location</th>
              <th className="text-left font-medium px-4 py-3">Priority</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Assignee</th>
              <th className="text-left font-medium px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const block = getBlock(t.blockId);
              const flat = getFlat(t.blockId, t.flatId);
              const a = getUser(t.assigneeId);
              return (
                <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link to={buildHref(t) as any} className="font-medium hover:text-primary inline-flex items-center gap-2">
                      {!t.synced && <CloudOff className="size-3 text-primary" />}
                      <span className="line-clamp-1">{t.title}</span>
                    </Link>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{block?.name} · {flat?.label}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} short /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    {a ? (
                      <span className="inline-flex items-center gap-2"><Avatar userId={a.id} size={22} /> <span className="truncate">{a.name}</span></span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
