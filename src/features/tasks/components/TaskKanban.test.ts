// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { Task } from "@/features/tasks/types";
import { countTasksOlderThanSevenDays, getAdminAssigneeBucket } from "./TaskKanban";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Issue",
    description: overrides.description ?? "Desc",
    blockId: overrides.blockId ?? "block-1",
    flatId: overrides.flatId ?? "flat-1",
    status: overrides.status ?? "NEW",
    priority: overrides.priority ?? null,
    createdById: overrides.createdById ?? "u_admin",
    assigneeId: overrides.assigneeId ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    synced: overrides.synced ?? true,
    photo: overrides.photo,
    extraPhotos: overrides.extraPhotos,
    problemCategory: overrides.problemCategory,
    complaintCategory: overrides.complaintCategory,
    reporterType: overrides.reporterType,
    reporterName: overrides.reporterName,
    syncedAt: overrides.syncedAt,
    photoPath: overrides.photoPath,
  };
}

describe("getAdminAssigneeBucket", () => {
  it("prioritizes tasks assigned to Caretaker over the NEW status column", () => {
    const task = makeTask({ status: "NEW", assigneeId: "u_care_1" });

    expect(getAdminAssigneeBucket(task)).toBe("caretaker");
  });

  it("routes tasks assigned to Cleaner to the Cleaner column", () => {
    const task = makeTask({ status: "DONE", assigneeId: "u_clean_1" });

    expect(getAdminAssigneeBucket(task)).toBe("cleaner");
  });

  it("keeps unassigned tasks in the first column", () => {
    const task = makeTask({ status: "DOING", assigneeId: null });

    expect(getAdminAssigneeBucket(task)).toBe("new");
  });
});

describe("countTasksOlderThanSevenDays", () => {
  it("counts tasks older than seven days by creation date and ignores DONE", () => {
    const now = new Date("2026-07-06T12:00:00.000Z").getTime();
    const tasks = [
      makeTask({
        id: "old-new",
        status: "NEW",
        createdAt: "2026-06-20T12:00:00.000Z",
      }),
      makeTask({
        id: "old-doing",
        status: "DOING",
        createdAt: "2026-06-22T12:00:00.000Z",
      }),
      makeTask({
        id: "old-done",
        status: "DONE",
        createdAt: "2026-06-15T12:00:00.000Z",
      }),
      makeTask({
        id: "recent-task",
        status: "DOING",
        createdAt: "2026-07-03T12:00:00.000Z",
      }),
    ];

    expect(countTasksOlderThanSevenDays(tasks, now)).toBe(2);
  });
});
