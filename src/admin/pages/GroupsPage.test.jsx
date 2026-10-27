import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAdminGroups: vi.fn(),
  synchronizeAdminGroups: vi.fn(),
}));

vi.mock("@/api/admin", () => ({
  fetchAdminGroups: mocks.fetchAdminGroups,
  synchronizeAdminGroups: mocks.synchronizeAdminGroups,
}));
vi.mock("@/admin/components/PageTransition", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/admin/components/PageHeader", () => ({
  default: ({ title, subtitle, actions }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </header>
  ),
}));

const { default: GroupsPage } = await import("./GroupsPage.jsx");
const renderGroupsPage = () => render(
  <MemoryRouter>
    <GroupsPage />
  </MemoryRouter>
);

describe("admin Groups page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAdminGroups.mockResolvedValue({
      data: {
        groups: [{
          _id: "group-1",
          name: "Engineering Teachers",
          type: "teacher_group",
          memberCount: 2,
          members: [
            { user: { _id: "teacher-1", name: "Ada" }, role: "teacher", adminLevel: "group_admin" },
            { user: { _id: "teacher-2", name: "Grace" }, role: "teacher" },
          ],
        }],
        filters: { departments: ["Engineering"], semesters: [2] },
        pagination: { page: 1, pages: 1, total: 1 },
      },
    });
    mocks.synchronizeAdminGroups.mockResolvedValue({
      data: { message: "Membership synchronization completed." },
    });
  });

  it("shows persisted group counts, member roles, and applies group-type filters", async () => {
    renderGroupsPage();

    expect(await screen.findByText("Engineering Teachers")).toBeTruthy();
    expect(screen.getByText("2 members")).toBeTruthy();
    fireEvent.click(screen.getByText("View members and roles"));
    expect(screen.getByText("group admin")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filter by group type"), {
      target: { value: "teacher_group" },
    });
    await waitFor(() => {
      expect(mocks.fetchAdminGroups).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "teacher_group", page: 1, limit: 25 })
      );
    });
  });

  it("runs the membership repair action and reports its result", async () => {
    renderGroupsPage();
    fireEvent.click(screen.getByRole("button", { name: "Sync memberships" }));

    expect(await screen.findByText("Membership synchronization completed.")).toBeTruthy();
    expect(mocks.synchronizeAdminGroups).toHaveBeenCalledOnce();
  });
});
