import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  searchChatUsers: vi.fn(),
  getOrCreatePrivateChat: vi.fn(),
  markConversationRead: vi.fn(),
  callbacks: {},
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { _id: "user-1", name: "Me" } }),
}));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ t: {} }) }));
vi.mock("@/api/chatApi", () => ({
  listConversations: mocks.listConversations,
  getMessages: mocks.getMessages,
  sendMessage: mocks.sendMessage,
  markConversationRead: mocks.markConversationRead,
  joinChatRoom: vi.fn(() => vi.fn()),
  getOrCreatePrivateChat: mocks.getOrCreatePrivateChat,
  searchChatUsers: mocks.searchChatUsers,
  uploadChatAttachment: vi.fn(),
  deleteChatMessage: vi.fn(),
  chatAttachmentUrl: vi.fn(() => "/attachment"),
  setChatTyping: vi.fn(),
  onChatMessage: (handler) => { mocks.callbacks.message = handler; return vi.fn(); },
  onConversationUpdated: () => vi.fn(),
  onChatRead: () => vi.fn(),
  onChatTyping: () => vi.fn(),
  onChatMessageDeleted: () => vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("lucide-react", () => {
  const Icon = (props) => <svg aria-label={props["aria-label"]} />;
  return {
    ArrowLeft: Icon,
    Check: Icon,
    CheckCheck: Icon,
    Copy: Icon,
    FileText: Icon,
    MessageCircle: Icon,
    Paperclip: Icon,
    Search: Icon,
    Send: Icon,
    Smile: Icon,
    Trash2: Icon,
    X: Icon,
  };
});
vi.mock("./ui", () => ({
  Avatar: ({ name }) => <span aria-label={`${name} avatar`}>{name}</span>,
}));

const { default: Chats } = await import("./Chats.jsx");

const conversation = {
  _id: "conversation-1",
  displayName: "Kai",
  displayPhoto: null,
  lastMessage: "See you soon",
  lastMessageAt: "2026-03-01T10:00:00.000Z",
  unreadCount: 2,
  otherUser: { _id: "user-2", isOnline: true },
};

const renderChats = (path = "/community/chat") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/community/chat" element={<Chats />} />
    </Routes>
  </MemoryRouter>
);

describe("private chat interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConversations.mockResolvedValue({ success: true, conversations: [conversation] });
    mocks.getMessages.mockResolvedValue({ success: true, messages: [] });
    mocks.markConversationRead.mockResolvedValue({ success: true, messageIds: [] });
    mocks.searchChatUsers.mockResolvedValue({ users: [] });
    mocks.sendMessage.mockResolvedValue({
      success: true,
      message: { _id: "message-1", text: "Hello", sender: { _id: "user-1" }, createdAt: new Date().toISOString(), readBy: ["user-1"] },
    });
  });

  it("shows conversation previews and unread counts", async () => {
    renderChats();
    expect(await screen.findByText("See you soon")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("supports mobile conversation selection and Enter/Shift+Enter sending", async () => {
    renderChats();
    fireEvent.click(await screen.findByRole("button", { name: /Kai/ }));
    const composer = await screen.findByRole("textbox", { name: "Message" });
    const composerForm = composer.closest("form");
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(composerForm).toHaveClass("sticky", "bottom-0");
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
    expect(sendButton).toHaveClass("sm:px-4");
    expect(sendButton.querySelector("span")).toHaveClass("hidden", "sm:inline");
    fireEvent.change(composer, { target: { value: "Hello" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(composer).toHaveValue("Hello");
    fireEvent.keyDown(composer, { key: "Enter" });
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledWith(
      "conversation-1",
      "Hello",
      expect.any(String)
    ));
    expect(await screen.findByText("Hello")).toBeInTheDocument();
  });

  it("searches existing conversations by the other user's full name", async () => {
    mocks.listConversations.mockResolvedValue({
      success: true,
      conversations: [{
        ...conversation,
        otherUser: { ...conversation.otherUser, fullName: "Kai Andersson" },
      }],
    });
    renderChats();

    fireEvent.change(screen.getByRole("textbox", { name: "Search conversations" }), {
      target: { value: "Andersson" },
    });

    expect(await screen.findByRole("button", { name: /Kai/ })).toBeInTheDocument();
  });

  it("opens a private chat selected from current people search results", async () => {
    const newConversation = {
      _id: "conversation-2",
      displayName: "Nora Smith",
      displayPhoto: null,
      otherUser: { _id: "user-3", fullName: "Nora Smith" },
    };
    mocks.searchChatUsers.mockResolvedValue({
      users: [{
        _id: "user-3",
        name: "Nora Smith",
        username: "nora",
        photo: "nora.png",
        canMessage: true,
      }],
    });
    mocks.getOrCreatePrivateChat.mockResolvedValue({
      success: true,
      conversation: newConversation,
    });
    renderChats();

    fireEvent.change(screen.getByRole("textbox", { name: "Search people to message" }), {
      target: { value: "Nora" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Nora Smith/ }));

    await waitFor(() => {
      expect(mocks.getOrCreatePrivateChat).toHaveBeenCalledWith("user-3");
      expect(mocks.getMessages).toHaveBeenCalledWith("conversation-2");
    });
    expect(await screen.findAllByText("Nora Smith")).not.toHaveLength(0);
  });

  it("opens a profile handoff immediately before the conversation list finishes loading", async () => {
    const profileConversation = {
      _id: "conversation-profile",
      displayName: "Riley",
      displayPhoto: null,
      otherUser: { _id: "user-4", name: "Riley" },
    };
    let resolveConversationList;
    mocks.listConversations.mockReturnValue(new Promise((resolve) => {
      resolveConversationList = resolve;
    }));

    render(
      <MemoryRouter initialEntries={[{
        pathname: "/community/chat",
        search: "?id=conversation-profile",
        state: { conversation: profileConversation },
      }]}>
        <Routes>
          <Route path="/community/chat" element={<Chats />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findAllByText("Riley")).not.toHaveLength(0);
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith("conversation-profile"));
    resolveConversationList({ success: true, conversations: [] });
    await waitFor(() => expect(screen.queryAllByText("Riley")).not.toHaveLength(0));
  });
});
