import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_SERVER_URL) return import.meta.env.VITE_API_SERVER_URL;

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.API_BASE_URL : "");
  if (rawApiUrl && /^https?:\/\//i.test(rawApiUrl)) {
    try {
      return new URL(rawApiUrl).origin;
    } catch {
      // ignore
    }
  }
  return undefined;
};

const SOCKET_URL = resolveSocketUrl();

const socketOptions = {
  path:            "/socket.io",
  withCredentials: true,
  transports:      ["websocket", "polling"],
  autoConnect:     false,
};

const socket = SOCKET_URL ? io(SOCKET_URL, socketOptions) : io(socketOptions);

export default socket;
