import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { role: "student" },
  getMyGroups: vi.fn(),
  searchGroups: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: {} }),
}));
vi.mock("@/api/groupApi", () => ({
  getMyGroups: mocks.getMyGroups,
  searchGroups: mocks.searchGroups,
}));

const { default: Groups } = await import("./Groups.jsx");
const renderGroups = () => render(
  <MemoryRouter>
    <Groups />
  </MemoryRouter>
);

describe("community Groups role visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyGroups.mockResolvedValue({
      success: true,
      groups: {
        university: [],
        department: [],
        semester: [],
        courses: [],
        classes: [],
        teacherGroups: [{
          _id: "staff-group",
          type: "teacher_group",
          name: "Engineering Teachers",
          memberCount: 3,
        }],
      },
    });
  });

  it("does not expose teacher-only groups or categories to students", async () => {
    mocks.user = { role: "student" };
    renderGroups();

    await screen.findByText("Nothing here yet");
    expect(screen.queryByRole("button", { name: "Teacher Groups" })).toBeNull();
    expect(screen.queryByText("Engineering Teachers")).toBeNull();
  });

  it("shows teacher-only groups to teachers", async () => {
    mocks.user = { role: "teacher" };
    renderGroups();

    fireEvent.click(await screen.findByRole("button", { name: "Teacher Groups" }));
    expect(await screen.findByText("Engineering Teachers")).toBeTruthy();
  });
});
