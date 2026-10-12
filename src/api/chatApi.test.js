import { beforeEach, describe, expect, it, vi } from "vitest";

const { socketMock, handlers, apiMock } = vi.hoisted(() => {
  const handlers = new Map();
  return {
    handlers,
    apiMock: {
      get: vi.fn(),
      post: vi.fn(),
    },
    socketMock: {
      connected: true,
      emit: vi.fn(),
      on: vi.fn((event, handler) => handlers.set(event, handler)),
      off: vi.fn((event, handler) => {
        if (handlers.get(event) === handler) handlers.delete(event);
      }),
    },
  };
});

vi.mock("@/socket.js", () => ({ default: socketMock }));
vi.mock("@/api/client", () => ({ default: apiMock }));

import { joinChatRoom, sendMessage } from "./chatApi";

describe("chat room socket lifecycle", () => {
  beforeEach(() => {
    socketMock.emit.mockClear();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    apiMock.post.mockReset();
    handlers.clear();
    socketMock.connected = true;
  });

  it("rejoins the active chat room after a socket reconnect", () => {
    const cleanup = joinChatRoom("conversation-1");
    expect(socketMock.emit).toHaveBeenCalledWith("chat:join", "conversation-1");

    handlers.get("connect")();

    expect(socketMock.emit).toHaveBeenCalledTimes(2);
    expect(socketMock.emit).toHaveBeenLastCalledWith("chat:join", "conversation-1");
    cleanup();
    expect(handlers.has("connect")).toBe(false);
  });

  it("sends the expected message body with a stable idempotency key", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    await sendMessage("conversation-1", "hello", "retry-key-1");

    expect(apiMock.post).toHaveBeenCalledWith(
      "/chat/conversation-1/messages",
      { text: "hello" },
      { headers: { "Idempotency-Key": "retry-key-1" } }
    );
  });
});
