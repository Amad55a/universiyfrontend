import api from "@/api/client";

const apiFetch = async (path) => (await api.get(path)).data;

export const getDashboardStats = () => apiFetch("/dashboard/stats");
export const getRecommendedBooks = () => apiFetch("/dashboard/recommended-books");
export const getRecentActivity = () => apiFetch("/dashboard/recent-activity");
export const getRecentlyViewedBooks = () => apiFetch("/dashboard/recently-viewed");
