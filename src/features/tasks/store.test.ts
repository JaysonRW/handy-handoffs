// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { Task } from "./types";
import { selectVisibleForStaff, useTasksStore } from "./store";
import { RESIDENT_PORTAL_USER_ID } from "@/features/users/data";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Issue",
    description: overrides.description ?? "Desc",
    blockId: overrides.blockId ?? "block-1",
    flatId: overrides.flatId ?? "flat-1",
    status: overrides.status ?? "NEW",
    priority: overrides.priority ?? null,
    createdById: overrides.createdById ?? "u_care_1",
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
  };
}

describe("task visibility selectors", () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: [], comments: [], activity: [] });
  });

  it("shows cleaners only the tasks assigned to them", () => {
    const tasks = [
      makeTask({ id: "assigned-to-cleaner", assigneeId: "u_clean_1", createdById: "u_admin" }),
      makeTask({ id: "created-by-cleaner", assigneeId: null, createdById: "u_clean_1" }),
      makeTask({ id: "resident-to-caretaker", assigneeId: "u_care_1", createdById: RESIDENT_PORTAL_USER_ID }),
    ];

    const visible = selectVisibleForStaff("u_clean_1")({ tasks } as never);

    expect(visible.map((task) => task.id)).toEqual(["assigned-to-cleaner"]);
  });

  it("shows caretakers both created and assigned tasks", () => {
    const tasks = [
      makeTask({ id: "created-by-caretaker", createdById: "u_care_1", assigneeId: null }),
      makeTask({ id: "assigned-to-caretaker", createdById: RESIDENT_PORTAL_USER_ID, assigneeId: "u_care_1" }),
      makeTask({ id: "assigned-to-cleaner", createdById: "u_admin", assigneeId: "u_clean_1" }),
    ];

    const visible = selectVisibleForStaff("u_care_1")({ tasks } as never);

    expect(visible.map((task) => task.id)).toEqual([
      "created-by-caretaker",
      "assigned-to-caretaker",
    ]);
  });
});
