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

export const searchChatUsers = (query) =>
  api.get("/chat/users/search", { params: { q: query } }).then((r) => r.data);

export const sendMessage = (conversationId, text, idempotencyKey = globalThis.crypto.randomUUID()) =>
  api.post(
    `/chat/${conversationId}/messages`,
    { text },
    { headers: { "Idempotency-Key": idempotencyKey } }
  ).then((r) => r.data);

export const uploadChatAttachment = (conversationId, file, text, idempotencyKey, onUploadProgress) => {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("text", text);
  return api.post(`/chat/${conversationId}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data", "Idempotency-Key": idempotencyKey },
    onUploadProgress,
  }).then((r) => r.data);
};

export const markConversationRead = (conversationId) =>
  api.post(`/chat/${conversationId}/read`).then((r) => r.data);

export const deleteChatMessage = (conversationId, messageId) =>
  api.delete(`/chat/${conversationId}/messages/${messageId}`).then((r) => r.data);

export const chatAttachmentUrl = (conversationId, messageId, index) =>
  `${api.defaults.baseURL}/chat/${conversationId}/messages/${messageId}/attachments/${index}`;

export const setChatTyping = (isTyping) => socket.emit("chat:typing", Boolean(isTyping));

export const joinChatRoom = (conversationId) => {
  if (!conversationId) return () => {};
  const join = () => socket.emit("chat:join", conversationId);
  if (socket.connected) join();
  socket.on("connect", join);
  return () => {
    socket.off("connect", join);
    socket.emit("chat:leave", conversationId);
  };
};

export const onChatMessage = (handler) => {
  socket.on("chat:message", handler);
  return () => socket.off("chat:message", handler);
};

export const onConversationUpdated = (handler) => {
  socket.on("chat:conversation_updated", handler);
  return () => socket.off("chat:conversation_updated", handler);
};

export const onChatRead = (handler) => {
  socket.on("chat:read", handler);
  return () => socket.off("chat:read", handler);
};

export const onChatTyping = (handler) => {
  socket.on("chat:typing", handler);
  return () => socket.off("chat:typing", handler);
};

export const onChatMessageDeleted = (handler) => {
  socket.on("chat:message_deleted", handler);
  return () => socket.off("chat:message_deleted", handler);
};