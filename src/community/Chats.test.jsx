import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
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
  getOrCreatePrivateChat: vi.fn(),
  searchChatUsers: vi.fn().mockResolvedValue({ users: [] }),
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
});
