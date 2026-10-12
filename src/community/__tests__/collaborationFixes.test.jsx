import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import InfoTab from "../components/infoTab";
import GroupDetailPage from "../GroupDetailPage";
import { AIAssistant } from "../meetings/AIAssistant";
import CommunitySettings from "../communcitySettings";

// Mock API clients and context
vi.mock("@/api/groupApi", () => ({
  getGroup: vi.fn(),
  updateGroupInfo: vi.fn(),
  getGroupMessages: vi.fn().mockResolvedValue({ success: true, messages: [] }),
  getGroupMembers: vi.fn().mockResolvedValue({ success: true, members: [] }),
}));

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

vi.mock("@/api/communcitysettingapi", () => ({
  getMySettings: vi.fn().mockResolvedValue({
    success: true,
    settings: {
      bio: "Test bio",
      skills: ["React"],
      notifications: { groupPosts: true, commentsReplies: true },
      privacy: { showOnlineStatus: true, allowMessagesFrom: "groups" },
    },
  }),
  updateProfile: vi.fn().mockResolvedValue({ success: true, user: {} }),
  updateNotificationPrefs: vi.fn().mockResolvedValue({ success: true }),
  updatePrivacyPrefs: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  getActiveSessions: vi.fn().mockResolvedValue({ success: true, sessions: [] }),
  logoutOtherDevices: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  default: () => ({ language: "en", t: (key) => key }),
  useLanguage: () => ({ language: "en", t: (key) => key }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockAuthUser = {
  _id: "user-123",
  id: "user-123",
  name: "Jane Student",
  email: "jane@uniso.edu",
  role: "student",
  displayName: "Jane S.",
  bio: "CS student",
  skills: ["JavaScript", "Python"],
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    setUser: vi.fn(),
    loading: false,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe("Collaboration Module Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Runtime Crash Fix: Cannot read properties of null (reading 'name')", () => {
    it("handles null member user records without throwing a TypeError", () => {
      const groupWithNullUser = {
        _id: "group-1",
        name: "Software Engineering 101",
        description: "Official class group",
        members: [
          { adminLevel: "group_admin", user: null }, // Orphaned/deleted user reference
          { adminLevel: "group_admin", user: { _id: "admin-1", name: "Prof. Ahmed" } },
        ],
        memberCount: 2,
      };

      const { container } = render(
        <InfoTab group={groupWithNullUser} canManage={false} />
      );

      // Verify page renders successfully without crash
      expect(screen.getByText("Software Engineering 101")).toBeInTheDocument();
      expect(screen.getByText("Prof. Ahmed")).toBeInTheDocument();
      expect(container).toBeDefined();
    });

    it("handles missing user name property with sensible fallback", () => {
      const groupWithMissingName = {
        _id: "group-2",
        name: "Computer Networks",
        members: [
          { adminLevel: "group_admin", user: { _id: "admin-2" } }, // user exists but name is null/missing
        ],
        memberCount: 1,
      };

      render(<InfoTab group={groupWithMissingName} canManage={false} />);

      expect(screen.getByText("Computer Networks")).toBeInTheDocument();
      expect(screen.getByText("Group Administrator")).toBeInTheDocument();
    });

    it("handles empty member collection gracefully", () => {
      const emptyGroup = {
        _id: "group-3",
        name: "Database Systems",
        members: [],
        memberCount: 0,
      };

      render(<InfoTab group={emptyGroup} canManage={false} />);

      expect(screen.getByText("Database Systems")).toBeInTheDocument();
      expect(screen.getByText("No group administrator assigned yet")).toBeInTheDocument();
    });

    it("handles completely null group safely", () => {
      render(<InfoTab group={null} canManage={false} />);
      expect(screen.getByText("No group information available.")).toBeInTheDocument();
    });
  });

  describe("2. Group Info button and view", () => {
    it("displays group info including department, purpose, and rules", () => {
      const groupData = {
        _id: "group-4",
        name: "AI & Robotics",
        description: "Robotics lab group",
        purpose: "Research collaboration",
        rules: "Be respectful and professional",
        department: { name: "Computer Science" },
        memberCount: 42,
        createdAt: "2026-01-15T00:00:00.000Z",
        members: [
          { adminLevel: "group_admin", user: { _id: "u-1", name: "Dr. Ali" } },
        ],
      };

      render(<InfoTab group={groupData} canManage={true} />);

      expect(screen.getByText("AI & Robotics")).toBeInTheDocument();
      expect(screen.getByText("Robotics lab group")).toBeInTheDocument();
      expect(screen.getByText("Research collaboration")).toBeInTheDocument();
      expect(screen.getByText("Be respectful and professional")).toBeInTheDocument();
      expect(screen.getByText("Computer Science")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("Dr. Ali")).toBeInTheDocument();
    });

    it("switches to Info tab when Info button is clicked in GroupDetailPage", async () => {
      const { getGroup } = await import("@/api/groupApi");
      getGroup.mockResolvedValue({
        success: true,
        group: {
          _id: "group-100",
          name: "Operating Systems",
          description: "OS group discussion",
          members: [{ adminLevel: "group_admin", user: { _id: "u-1", name: "Lecturer" } }],
          memberCount: 25,
        },
        membership: { adminLevel: "group_admin" },
      });

      render(
        <MemoryRouter initialEntries={["/community/groups/group-100"]}>
          <Routes>
            <Route path="/community/groups/:id" element={<GroupDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Operating Systems")).toBeInTheDocument();
      });

      // Find and click the Info tab button
      const infoButtons = screen.getAllByRole("button", { name: /info/i });
      fireEvent.click(infoButtons[0]);

      // Verify InfoTab is rendered with group details
      await waitFor(() => {
        expect(screen.getByText("GROUP NAME")).toBeInTheDocument();
        expect(screen.getByText("OS group discussion")).toBeInTheDocument();
      });
    });

    it("shows error state when group cannot be loaded", async () => {
      const { getGroup } = await import("@/api/groupApi");
      getGroup.mockRejectedValue(new Error("Group not found"));

      render(
        <MemoryRouter initialEntries={["/community/groups/invalid-id"]}>
          <Routes>
            <Route path="/community/groups/:id" element={<GroupDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Group Unavailable")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /back to groups/i })).toBeInTheDocument();
      });
    });
  });

  describe("3. AI Assistant input visibility and styling", () => {
    it("renders input with accessible dark background and white text for contrast", () => {
      render(<AIAssistant meetingTitle="Intro to Algorithms" course="CS201" />);

      const input = screen.getByPlaceholderText("Ask anything about this class…");
      expect(input).toBeInTheDocument();

      // Check contrast classes: bg-gray-900, text-white, caret-white
      expect(input.className).toContain("bg-gray-900");
      expect(input.className).toContain("text-white");
      expect(input.className).toContain("caret-white");
      expect(input.className).not.toContain("bg-white");
    });

    it("disables the send button when the input is empty", () => {
      render(<AIAssistant meetingTitle="Intro to Algorithms" course="CS201" />);

      const input = screen.getByPlaceholderText("Ask anything about this class…");
      const sendButton = input.nextElementSibling;

      expect(sendButton).toBeDisabled();

      fireEvent.change(input, { target: { value: "Can you explain Dijkstra?" } });
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe("4. Collaboration Settings page", () => {
    it("renders profile settings with authenticated user data populated", async () => {
      render(
        <MemoryRouter initialEntries={["/community/settings"]}>
          <CommunitySettings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Community Settings")).toBeInTheDocument();
      });

      // Check full name is displayed from user
      expect(screen.getByText("Jane Student")).toBeInTheDocument();
      // Check display name input is populated
      const displayNameInput = screen.getByPlaceholderText(/how your name appears to the community/i);
      expect(displayNameInput).toHaveValue("Jane S.");
    });
  });
});
