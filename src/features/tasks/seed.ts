import { nanoid } from "@/lib/id";
import { BLOCKS } from "@/features/blocks/data";
import { USERS } from "@/features/users/data";
import type { ActivityEntry, Comment, Task } from "./types";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();

export function seedTasks(): {
  tasks: Task[];
  comments: Comment[];
  activity: ActivityEntry[];
} {
  const admin = USERS.find((u) => u.role === "MASTER_ADMIN")!;
  const caretakers = USERS.filter((u) => u.role === "CARETAKER");
  const cleaners = USERS.filter((u) => u.role === "CLEANER");
  const blocks = BLOCKS;

  const tasks: Task[] = [
    {
      id: nanoid(),
      title: "Leak under kitchen sink",
      description: "Slow drip from the P-trap. Resident placed a bucket. Needs replacement gasket.",
      blockId: blocks[0].id,
      flatId: blocks[0].flats[3].id,
      problemCategory: "Plumbing",
      status: "DOING",
      priority: "P1",
      createdById: caretakers[0].id,
      assigneeId: caretakers[0].id,
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(4),
      synced: true,
      syncedAt: daysAgo(2),
    },
    {
      id: nanoid(),
      title: "Lobby light flickering",
      description: "Two ceiling fixtures flickering in main lobby. Driver likely failing.",
      blockId: blocks[2].id,
      flatId: blocks[2].flats[0].id,
      problemCategory: "Electrical",
      status: "NEW",
      priority: null,
      createdById: caretakers[0].id,
      assigneeId: null,
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
      synced: true,
      syncedAt: hoursAgo(6),
    },
    {
      id: nanoid(),
      title: "Spilled paint on stairwell",
      description: "Floor 3 east stairwell — small paint spill. Needs solvent cleaning.",
      blockId: blocks[3].id,
      flatId: blocks[3].flats[8].id,
      complaintCategory: "Common Area",
      status: "DOING",
      priority: "P2",
      createdById: cleaners[0].id,
      assigneeId: cleaners[0].id,
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(2),
      synced: true,
      syncedAt: daysAgo(1),
    },
    {
      id: nanoid(),
      title: "Bin store overflow",
      description: "Recycling overflowing. Possible scheduling miss.",
      blockId: blocks[4].id,
      flatId: blocks[4].flats[0].id,
      complaintCategory: "Waste",
      status: "DONE",
      priority: "P3",
      createdById: cleaners[0].id,
      assigneeId: cleaners[0].id,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
      synced: true,
      syncedAt: daysAgo(4),
    },
    {
      id: nanoid(),
      title: "Lift making grinding noise",
      description: "Lift B grinding between floors 4-5. Engineer required.",
      blockId: blocks[1].id,
      flatId: blocks[1].flats[0].id,
      problemCategory: "Structural",
      status: "NEW",
      priority: null,
      createdById: caretakers[0].id,
      assigneeId: null,
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
      synced: true,
      syncedAt: hoursAgo(2),
    },
    {
      id: nanoid(),
      title: "Window seal leaking — heavy rain",
      description: "Water ingress at bedroom window during yesterday's storm.",
      blockId: blocks[0].id,
      flatId: blocks[0].flats[10].id,
      problemCategory: "Structural",
      status: "DOING",
      priority: "P2",
      createdById: caretakers[0].id,
      assigneeId: caretakers[0].id,
      createdAt: daysAgo(3),
      updatedAt: hoursAgo(20),
      synced: true,
      syncedAt: daysAgo(3),
    },
    {
      id: nanoid(),
      title: "Corridor needs deep clean",
      description: "Resident complaint — sticky residue floor 2 corridor.",
      blockId: blocks[2].id,
      flatId: blocks[2].flats[5].id,
      complaintCategory: "Cleaning",
      status: "NEW",
      priority: null,
      createdById: cleaners[0].id,
      assigneeId: null,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
      synced: true,
      syncedAt: hoursAgo(1),
    },
  ];

  const comments: Comment[] = [
    { id: nanoid(), taskId: tasks[0].id, authorId: caretakers[0].id, text: "On site, isolating water now.", createdAt: hoursAgo(4) },
    { id: nanoid(), taskId: tasks[2].id, authorId: cleaners[0].id, text: "Cleared the majority, returning with stronger solvent.", createdAt: hoursAgo(2) },
    { id: nanoid(), taskId: tasks[5].id, authorId: caretakers[0].id, text: "Sealant ordered, ETA tomorrow.", createdAt: hoursAgo(20) },
  ];

  const activity: ActivityEntry[] = tasks.flatMap((t) => {
    const list: ActivityEntry[] = [
      {
        id: nanoid(),
        taskId: t.id,
        actorId: t.createdById,
        type: "created",
        message: `Created task “${t.title}”`,
        createdAt: t.createdAt,
      },
    ];
    if (t.priority) {
      list.push({
        id: nanoid(),
        taskId: t.id,
        actorId: admin.id,
        type: "priority_set",
        message: `Priority set to ${t.priority}`,
        createdAt: t.updatedAt,
      });
    }
    if (t.assigneeId) {
      list.push({
        id: nanoid(),
        taskId: t.id,
        actorId: admin.id,
        type: "assigned",
        message: `Assigned to ${t.assigneeId}`,
        createdAt: t.updatedAt,
      });
    }
    if (t.status !== "NEW") {
      list.push({
        id: nanoid(),
        taskId: t.id,
        actorId: t.assigneeId ?? t.createdById,
        type: "status_changed",
        message: `Status → ${t.status}`,
        createdAt: t.updatedAt,
      });
    }
    return list;
  });

  activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { tasks, comments, activity };
}
