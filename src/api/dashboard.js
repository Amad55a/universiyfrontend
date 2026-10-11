import api from "./client";

export const getDashboardStats = () => api.get("/dashboard/stats").then(({ data }) => data);
export const getRecommendedBooks = () => api.get("/dashboard/recommended-books").then(({ data }) => data);
export const getRecentActivity = () => api.get("/dashboard/recent-activity").then(({ data }) => data);
export const getRecentlyViewedBooks = () => api.get("/dashboard/recently-viewed").then(({ data }) => data);