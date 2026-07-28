// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TaskForm } from "./TaskForm";

const mockedNavigate = vi.fn();
const mockedCreateTask = vi.fn();
const mockedPatchDebug = vi.fn();
const mockedPushDebugEvent = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockedNavigate,
}));

vi.mock("@/features/blocks/data", () => ({
  BLOCKS: [
    {
      id: "falcon",
      name: "Falcon",
      flats: [{ id: "falcon-101", label: "101" }],
    },
  ],
}));

vi.mock("@/features/tasks/store", () => ({
  useTasksStore: (selector: (state: any) => unknown) =>
    selector({
      createTask: mockedCreateTask,
      tasks: [],
    }),
}));

vi.mock("@/features/sync/store", () => ({
  useSyncStore: (selector: (state: any) => unknown) =>
    selector({
      online: true,
      patchDebug: mockedPatchDebug,
      pushDebugEvent: mockedPushDebugEvent,
    }),
}));

vi.mock("@/features/sync/runtime", () => ({
  triggerManualSync: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
}));

vi.mock("@/features/users/data", () => ({
  getUser: () => ({ id: "u_resident_portal", name: "Resident" }),
}));

describe("TaskForm resident request types", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mostra campos completos para Issue report e simplifica para Bins bags", () => {
    render(<TaskForm creatorId="u_resident_portal" mode="resident" />);

    expect(screen.getByText("Issue report")).not.toBeNull();
    expect(screen.getByText("Bins bags")).not.toBeNull();
    expect(screen.getByText("bags requests")).not.toBeNull();
    expect(screen.getByText("Photo")).not.toBeNull();
    expect(screen.getByText("Description")).not.toBeNull();
    expect(screen.queryByText("Quantity")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Bins bags/i }));

    expect(screen.queryByText("Photo")).toBeNull();
    expect(screen.queryByText("Description")).toBeNull();
    expect(screen.getByText("Quantity")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Issue report/i }));

    expect(screen.getByText("Photo")).not.toBeNull();
    expect(screen.getByText("Description")).not.toBeNull();
    expect(screen.queryByText("Quantity")).toBeNull();
  });
});
