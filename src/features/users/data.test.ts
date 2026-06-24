import { describe, expect, it } from "vitest";
import {
  RESIDENT_PORTAL_USER_ID,
  canCommentOnTasks,
  canCompleteAssignedTasks,
  canCreateTask,
  canCreateTaskFromStaffPortal,
  canSeeCreatedTasks,
  canStartAssignedTasks,
  isFieldStaffRole,
  visibleUsers,
} from "./data";

describe("user role capabilities", () => {
  it("exposes only real team members in visible users", () => {
    const users = visibleUsers();
    expect(users.some((user) => user.id === RESIDENT_PORTAL_USER_ID)).toBe(false);
    expect(users).toHaveLength(3);
  });

  it("allows task creation only in approved contexts", () => {
    expect(canCreateTask("MASTER_ADMIN")).toBe(true);
    expect(canCreateTask("CARETAKER")).toBe(true);
    expect(canCreateTask("RESIDENT")).toBe(true);
    expect(canCreateTask("CLEANER")).toBe(false);

    expect(canCreateTaskFromStaffPortal("CARETAKER")).toBe(true);
    expect(canCreateTaskFromStaffPortal("MASTER_ADMIN")).toBe(false);
    expect(canCreateTaskFromStaffPortal("CLEANER")).toBe(false);
    expect(canCreateTaskFromStaffPortal("RESIDENT")).toBe(false);
  });

  it("restricts created-task visibility and workflow actions by role", () => {
    expect(canSeeCreatedTasks("MASTER_ADMIN")).toBe(true);
    expect(canSeeCreatedTasks("CARETAKER")).toBe(true);
    expect(canSeeCreatedTasks("CLEANER")).toBe(false);

    expect(canStartAssignedTasks("MASTER_ADMIN")).toBe(true);
    expect(canStartAssignedTasks("CARETAKER")).toBe(true);
    expect(canStartAssignedTasks("CLEANER")).toBe(false);

    expect(canCompleteAssignedTasks("MASTER_ADMIN")).toBe(true);
    expect(canCompleteAssignedTasks("CARETAKER")).toBe(true);
    expect(canCompleteAssignedTasks("CLEANER")).toBe(true);

    expect(canCommentOnTasks("MASTER_ADMIN")).toBe(true);
    expect(canCommentOnTasks("CARETAKER")).toBe(true);
    expect(canCommentOnTasks("CLEANER")).toBe(false);

    expect(isFieldStaffRole("CARETAKER")).toBe(true);
    expect(isFieldStaffRole("CLEANER")).toBe(true);
    expect(isFieldStaffRole("MASTER_ADMIN")).toBe(false);
    expect(isFieldStaffRole("RESIDENT")).toBe(false);
  });
});
