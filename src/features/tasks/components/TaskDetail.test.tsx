// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Task } from "@/features/tasks/types";
import { TaskDetail } from "./TaskDetail";

const mockedStore = vi.hoisted(() => ({
  state: {} as any,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === "string" ? to : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/tasks/store", () => ({
  useTasksStore: (selector: any) => selector(mockedStore.state),
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Leak in corridor",
    description: overrides.description ?? "Water near the stairwell.",
    blockId: overrides.blockId ?? "falcon",
    flatId: overrides.flatId ?? "falcon-101",
    status: overrides.status ?? "DOING",
    priority: overrides.priority ?? "P2",
    createdById: overrides.createdById ?? "u_care_1",
    assigneeId: overrides.assigneeId ?? "u_care_1",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    synced: overrides.synced ?? true,
    syncedAt: overrides.syncedAt,
    photo: overrides.photo,
    extraPhotos: overrides.extraPhotos,
    problemCategory: overrides.problemCategory,
    complaintCategory: overrides.complaintCategory,
    reporterType: overrides.reporterType,
    reporterName: overrides.reporterName,
    residentRequestType: overrides.residentRequestType,
    garbageBagQuantity: overrides.garbageBagQuantity,
  };
}

function setupStore() {
  const actions = {
    setPriority: vi.fn(),
    assign: vi.fn(),
    setStatus: vi.fn(),
    reopen: vi.fn(),
    acceptCompletion: vi.fn(),
    addComment: vi.fn(),
    addPhoto: vi.fn(),
  };

  mockedStore.state = {
    ...actions,
    comments: [],
    activity: [],
  };

  return actions;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TaskDetail permissions", () => {
  it("allows cleaner only to conclude an assigned task", () => {
    const actions = setupStore();
    const task = makeTask({
      assigneeId: "u_clean_1",
      createdById: "u_admin",
      status: "DOING",
    });

    render(
      <TaskDetail
        task={task}
        actorId="u_clean_1"
        actorRole="CLEANER"
        backHref="/staff/u_clean_1/tasks"
        isAdmin={false}
      />,
    );

    expect(screen.queryByPlaceholderText("Add an update for the team…")).toBeNull();
    expect(screen.queryByText("Start work")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect(actions.setStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(actions.setStatus).toHaveBeenCalledWith(task.id, "DONE", "u_clean_1");
  });

  it("allows caretaker to comment and start an assigned new task", () => {
    const actions = setupStore();
    const task = makeTask({
      status: "NEW",
      assigneeId: "u_care_1",
      createdById: "u_care_1",
    });

    render(
      <TaskDetail
        task={task}
        actorId="u_care_1"
        actorRole="CARETAKER"
        backHref="/staff/u_care_1/tasks"
        isAdmin={false}
      />,
    );

    const textarea = screen.getByPlaceholderText("Add an update for the team…");
    fireEvent.change(textarea, { target: { value: "Issue checked on site" } });
    fireEvent.click(screen.getByRole("button", { name: "Start work" }));
    expect(actions.addComment).not.toHaveBeenCalled();
    expect(actions.setStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(actions.addComment).toHaveBeenCalledWith(task.id, "Issue checked on site", "u_care_1");
    expect(actions.setStatus).toHaveBeenCalledWith(task.id, "DOING", "u_care_1");
  });

  it("keeps admin triage controls and shows resident provenance", () => {
    const actions = setupStore();
    const task = makeTask({
      status: "DONE",
      assigneeId: "u_clean_1",
      createdById: "u_resident_portal",
      reporterType: "RESIDENT",
      reporterName: "Joao - Falcon",
      residentRequestType: "GARBAGE_BAG",
      garbageBagQuantity: 4,
    });

    render(
      <TaskDetail
        task={task}
        actorId="u_admin"
        actorRole="MASTER_ADMIN"
        backHref="/admin/tasks"
        isAdmin
      />,
    );

    expect(screen.getByText(/Joao - Falcon/)).not.toBeNull();
    expect(screen.getByText(/via resident portal/)).not.toBeNull();
    expect(screen.getByText("Garbage bag")).not.toBeNull();
    expect(screen.getByText("Requested quantity")).not.toBeNull();
    expect(screen.getByText("4")).not.toBeNull();

    const assigneeSelect = screen.getByRole("combobox") as HTMLSelectElement;
    expect(assigneeSelect.value).toBe("u_clean_1");

    fireEvent.change(assigneeSelect, {
      target: { value: "u_care_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /accept completion/i }));
    expect(actions.assign).not.toHaveBeenCalled();
    expect(actions.acceptCompletion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(actions.assign).toHaveBeenCalledWith(task.id, "u_care_1", "u_admin");
    expect(actions.acceptCompletion).toHaveBeenCalledWith(task.id, "u_admin");
  });
});
