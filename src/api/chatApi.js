import api from "@/api/client";
import socket from "@/socket.js";

export const listConversations = (type) =>
  api.get("/chat", { params: type ? { type } : {} }).then((r) => r.data);

export const getOrCreatePrivateChat = (userId) =>
  api.get(`/chat/private/${userId}`).then((r) => r.data);

export const createGroupChat = (body) =>
  api.post("/chat/group", body).then((r) => r.data);

export const getMessages = (conversationId) =>
  api.get(`/chat/${conversationId}/messages`).then((r) => r.data);

export const sendMessage = (conversationId, text, idempotencyKey = globalThis.crypto.randomUUID()) =>
  api.post(
    `/chat/${conversationId}/messages`,
    { text },
    { headers: { "Idempotency-Key": idempotencyKey } }
  ).then((r) => r.data);

export const joinChatRoom = (conversationId) => {
  if (!conversationId) return () => {};
  const join = () => socket.emit("chat:join", conversationId);
  if (socket.connected) join();
  socket.on("connect", join);
  return () => socket.off("connect", join);
};

export const onChatMessage = (handler) => {
  socket.on("chat:message", handler);
  return () => socket.off("chat:message", handler);
};

export const onConversationUpdated = (handler) => {
  socket.on("chat:conversation_updated", handler);
  return () => socket.off("chat:conversation_updated", handler);
};