import axios from "axios";
import { resolveApiBaseUrl } from "./baseUrl.js";

const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "/api/v1";
const normalizedBaseUrl = resolveApiBaseUrl(explicitBaseUrl);

axios.defaults.baseURL = normalizedBaseUrl;
axios.defaults.withCredentials = true;
window.API_BASE_URL = normalizedBaseUrl;

const normalizeRequestUrl = (url = "", base = "") => {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  const cleanedBase = String(base || normalizedBaseUrl || "").trim().replace(/\/+$/u, "");
  const cleanedUrl = String(url).replace(/^\/+/, "");

  if (!cleanedBase) {
    return `/${cleanedUrl}`;
  }

  if (cleanedUrl.startsWith("api/v1/") && cleanedBase.endsWith("/api/v1")) {
    return `${cleanedBase}/${cleanedUrl.replace(/^api\/v1\/?/u, "")}`;
  }

  if (cleanedUrl.startsWith("api/") && cleanedBase.endsWith("/api/v1")) {
    return `${cleanedBase}/${cleanedUrl.replace(/^api\/?/u, "")}`;
  }

  return `${cleanedBase}/${cleanedUrl}`;
};

const api = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
});

let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const getAccessToken = () => inMemoryAccessToken;

api.interceptors.request.use((config) => {
  if (inMemoryAccessToken && !config.headers["Authorization"]) {
    config.headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  if (config.url) {
    config.url = normalizeRequestUrl(config.url, config.baseURL || api.defaults.baseURL);
    config.baseURL = "";
  }

  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (resolve, reject) => {
  refreshSubscribers.push({ resolve, reject });
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => {
    // Capture access token if returned on login or refresh
    const newAccessToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (newAccessToken && typeof newAccessToken === "string") {
      setAccessToken(newAccessToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || "";
    const isRefreshRequest = /\/auth\/(refresh|refresh-token)/i.test(url);
    // Do not try to refresh login/logout/register failures
    const isAuthMutation =
      /\/auth\/(login|logout|register|google|forgot-password|reset-password)/i.test(url);

    if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest && !isAuthMutation) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(resolve, reject);
        }).then((token) => {
          if (token) originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post("/auth/refresh-token", {}, { withCredentials: true });
        const newToken = data?.data?.accessToken || data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        }
        onRefreshed(newToken);
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onRefreshFailed(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
