import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  joinChatRoom: vi.fn(() => vi.fn()),
  onChatMessage: vi.fn(() => vi.fn()),
  onConversationUpdated: vi.fn(() => vi.fn()),
  getMyGroups: vi.fn(),
  searchGroups: vi.fn(),
  authUser: { _id: "student-1", name: "Student", role: "student" },
}));

vi.mock("@/api/chatApi", () => ({
  listConversations: mocks.listConversations,
  getMessages: mocks.getMessages,
  sendMessage: mocks.sendMessage,
  joinChatRoom: mocks.joinChatRoom,
  onChatMessage: mocks.onChatMessage,
  onConversationUpdated: mocks.onConversationUpdated,
}));
vi.mock("@/api/groupApi", () => ({
  getMyGroups: mocks.getMyGroups,
  searchGroups: mocks.searchGroups,
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: {} }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import Chats from "../Chats";
import Groups from "../Groups";

describe("Collaboration mobile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConversations.mockResolvedValue({
      success: true,
      conversations: [{
        _id: "conversation-1",
        displayName: "Taylor",
        displayPhoto: null,
        lastMessage: "Hello",
      }],
    });
    mocks.getMessages.mockResolvedValue({ success: true, messages: [] });
    mocks.getMyGroups.mockResolvedValue({
      success: true,
      groups: { university: [], department: [], classes: [], courses: [] },
    });
  });

  it("switches from the conversation list to a full-width mobile conversation and back", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/community/chat?id=conversation-1"]}>
        <Chats />
      </MemoryRouter>
    );

    const backButton = await screen.findByRole("button", { name: "Back to conversations" });
    expect(backButton.closest("div").parentElement.className).toContain("sm:flex");
    expect(container.querySelector("aside").className).toContain("hidden sm:flex");

    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Back to conversations" })).not.toBeInTheDocument();
    });
    expect(container.querySelector("aside").className).toContain("flex-col");
    expect(screen.getByText("Private messages")).toBeInTheDocument();
  });

  it("keeps category navigation available as a horizontally scrollable mobile menu", async () => {
    const { container } = render(<Groups />);

    const categoryNav = screen.getByRole("navigation", { name: "Group categories" });
    await waitFor(() => expect(mocks.getMyGroups).toHaveBeenCalledOnce());

    expect(categoryNav.className).toContain("overflow-x-auto");
    expect(categoryNav.className).toContain("sm:block");
    expect(container.querySelector("aside")).not.toHaveClass("hidden");
  });
});
