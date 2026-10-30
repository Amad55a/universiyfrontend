import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCommunityUser: vi.fn(),
  getUserProfileStats: vi.fn(),
  getUserPosts: vi.fn(),
  getOrCreatePrivateChat: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/api/Communityapi", () => ({
  getCommunityUser: mocks.getCommunityUser,
  getUserProfileStats: mocks.getUserProfileStats,
  getUserPosts: mocks.getUserPosts,
}));
vi.mock("@/api/communcitysettingapi", () => ({
  updateProfile: vi.fn(),
}));
vi.mock("@/api/chatApi", () => ({
  getOrCreatePrivateChat: mocks.getOrCreatePrivateChat,
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { _id: "viewer-1" }, setUser: vi.fn() }),
}));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: {} }),
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: vi.fn() },
}));

const { default: UserProfile } = await import("./userspagesss.jsx");

const ChatDestination = () => {
  const location = useLocation();
  return (
    <div data-testid="chat-destination" data-conversation-id={location.state?.conversation?._id}>
      {location.pathname}{location.search}
    </div>
  );
};

describe("community profile messaging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCommunityUser.mockResolvedValue({
      success: true,
      user: { _id: "person-1", name: "Nora Smith", role: "student" },
    });
    mocks.getUserProfileStats.mockResolvedValue({ success: true, stats: {} });
    mocks.getUserPosts.mockResolvedValue({ posts: [] });
    mocks.getOrCreatePrivateChat.mockResolvedValue({
      success: true,
      conversation: { _id: "conversation-1", displayName: "Nora Smith" },
    });
  });

  it("opens the chat route with the conversation returned by the API", async () => {
    render(
      <MemoryRouter initialEntries={["/community/user/person-1"]}>
        <Routes>
          <Route path="/community/user/:id" element={<UserProfile />} />
          <Route path="/community/chat" element={<ChatDestination />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Send message/i }));

    expect(await screen.findByTestId("chat-destination")).toHaveTextContent(
      "/community/chat?id=conversation-1"
    );
    expect(screen.getByTestId("chat-destination")).toHaveAttribute(
      "data-conversation-id",
      "conversation-1"
    );
    expect(mocks.getOrCreatePrivateChat).toHaveBeenCalledWith("person-1");
  });

  it("shows the backend reason when a private conversation cannot be started", async () => {
    mocks.getOrCreatePrivateChat.mockRejectedValue({
      response: { data: { message: "Messaging is restricted by this user's privacy settings." } },
    });
    render(
      <MemoryRouter initialEntries={["/community/user/person-1"]}>
        <Routes>
          <Route path="/community/user/:id" element={<UserProfile />} />
          <Route path="/community/chat" element={<ChatDestination />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Send message/i }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      "Messaging is restricted by this user's privacy settings."
    ));
    expect(screen.queryByTestId("chat-destination")).not.toBeInTheDocument();
  });
});
