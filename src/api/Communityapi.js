// src/api/Communityapi.js
// All community-related API calls.
//
// Auth: uses the same cookie session as the rest of the app (relative /api
// paths go through the Vite proxy). Do NOT use an absolute localhost:3000
// baseURL — that is a different origin and the httpOnly token cookie is not sent.

import api from "@/api/client";

// ── Feed ──────────────────────────────────────────────────────────────────────
export const getFeed = async (page = 1, limit = 10) => {
  const { data } = await api.get(`/posts?page=${page}&limit=${limit}`);
  return data;
};

export const getFeedByTag = async (tag, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts?tag=${encodeURIComponent(tag)}&page=${page}&limit=${limit}`);
  return data;
};

export const searchPosts = async (query) => {
  const { data } = await api.get(`/posts/search?q=${encodeURIComponent(query)}`);
  return data;
};

// ── Single post ───────────────────────────────────────────────────────────────
export const getPost = async (id) => {
  const { data } = await api.get(`/posts/${id}`);
  return data;
};

// ── Create post ───────────────────────────────────────────────────────────────
// Sends multipart/form-data so files are handled by multer on the server.
//
// `attachments` is the array WritePostModal already builds:
//   [{ id, type: 'image'|'video'|'pdf', file, name, size, url }, ...]
export const createPost = async ({ title, content, tags, semesterTag, attachments = [] }) => {
  const form = new FormData();
  if (title) form.append("title", title);
  form.append("content", content);
  if (tags?.length) form.append("tags", JSON.stringify(tags));
  if (semesterTag) form.append("semesterTag", semesterTag);

  attachments.forEach((att) => {
    // att.file is the raw File object captured by WritePostModal's addFiles()
    form.append("files", att.file, att.name);
  });

  const { data } = await api.post("/posts", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// ── Delete post ───────────────────────────────────────────────────────────────
export const deletePost = async (id) => {
  const { data } = await api.delete(`/posts/${id}`);
  return data;
};

// ── Update post ───────────────────────────────────────────────────────────────
export const updatePost = async (id, payload) => {
  const { data } = await api.patch(`/posts/${id}`, payload);
  return data;
};

// ── Report post ───────────────────────────────────────────────────────────────
export const reportPost = async (id, reason) => {
  const { data } = await api.post(`/posts/${id}/report`, { reason });
  return data;
};

// ── Like ──────────────────────────────────────────────────────────────────────
export const toggleLike = async (id) => {
  const { data } = await api.put(`/posts/${id}/like`);
  return data;
};

// ── Comments ──────────────────────────────────────────────────────────────────
export const addComment = async (id, text) => {
  const { data } = await api.post(`/posts/${id}/comments`, { text });
  return data;
};

export const deleteComment = async (postId, commentId) => {
  const { data } = await api.delete(`/posts/${postId}/comments/${commentId}`);
  return data;
};

export const replyToComment = async (postId, commentId, text) => {
  const { data } = await api.post(`/posts/${postId}/comments/${commentId}/reply`, { text });
  return data;
};

export const updateComment = async (postId, commentId, text) => {
  const { data } = await api.patch(`/posts/${postId}/comments/${commentId}`, { text });
  return data;
};

// ── Trending ──────────────────────────────────────────────────────────────────
export const getTrendingTags = async () => {
  const { data } = await api.get("/posts/trending/tags");
  return data;
};

export const getTrendingPosts = async (limit = 20) => {
  const { data } = await api.get(`/posts/trending?limit=${limit}`);
  return data;
};

// ── Bookmarks ─────────────────────────────────────────────────────────────────
export const fetchBookmarks = async () => {
  const { data } = await api.get("/bookmarks");
  return data;
};

export const toggleBookmark = async (postId) => {
  const { data } = await api.put(`/posts/${postId}/bookmark`);
  return data;
};

// ── User profile ────────────────────────────────────────────────────────────
export const getCommunityUser = async (userId) => {
  const { data } = await api.get(`/communityusers/${userId}`);
  return data;
};

export const searchCommunityUsers = async (query) => {
  const { data } = await api.get("/chat/users/search", { params: { q: query } });
  return data;
};

// FEATURE 1 (Profile "Posts" tab): fetch a given user's own posts.
export const getUserPosts = async (userId, page = 1, limit = 20) => {
  const { data } = await api.get(`/communityusers/${userId}/posts?page=${page}&limit=${limit}`);
  return data;
};

// NEW — post/like/comment counts for UserDetailsPage.
// This was the missing export causing:
//   "does not provide an export named 'getUserProfileStats'"
// Backend route: GET /communityusers/:id/stats → getUserProfileStats controller.
export const getUserProfileStats = async (userId) => {
  const { data } = await api.get(`/communityusers/${userId}/stats`);
  return data;
};

// FEATURE 3 (post translation), cached client-side in translationApi.js.
export const translatePost = async (postId, targetLang) => {
  const { data } = await api.post(`/posts/${postId}/translate`, { targetLang });
  return data;
};