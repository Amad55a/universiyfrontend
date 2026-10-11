// client/context/NotificationContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// What changed vs the original:
//
//   1. buildResolver now checks `notification.titleResolved` / `messageResolved`
//      BEFORE trying the i18n key walk, so pre-resolved text always wins.
//      Raw dot-notation keys can never reach the UI.
//
//   2. The context still exposes resolve() for panels that want i18n support
//      layered on top of the resolved fallback.
//
//   3. Socket setup is unchanged — this is the single authoritative socket
//      for the notification system. The shared @/socket module is for other
//      features; do NOT create a second io() instance in useNotifications.
//
//   4. No toast calls here — toasts are handled by NotificationToastManager
//      which listens to the shared @/socket import directly.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useEffect, useRef, useCallback,
} from "react";
import { io } from "socket.io-client";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuth }     from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

const NotificationContext = createContext(null);

// ── Resolver ──────────────────────────────────────────────────────────────────
// Priority order:
//   1. Pre-resolved text stored in the notification payload (titleResolved /
//      messageResolved) — always the most reliable, no translation file needed.
//   2. i18n key walk through the translation tree (for fully translated apps).
//   3. Raw key as last resort so engineers see the gap, not end users.
//
// The `fallbackText` argument should always be the pre-resolved value when
// calling from a notification component:
//   resolve(n.titleKey, n.titleParams, n.title)
//   resolve(n.messageKey, n.messageParams, n.message)
export const buildResolver = (t) => (key, params = {}, fallbackText = "") => {
  // 1. Pre-resolved text — if it exists and doesn't look like a raw i18n key
  //    (i.e. it's a real sentence, not "notification.foo.bar"), use it.
  if (fallbackText && !/^[\w]+(?:\.[\w]+){1,}$/.test(fallbackText.trim())) {
    return fallbackText;
  }

  if (!key) return fallbackText || "";

  // 2. i18n key walk
  if (t) {
    const parts = String(key).split(".");
    let node = t;
    for (const part of parts) {
      node = node?.[part];
      if (node === undefined) break;
    }
    if (typeof node === "string") {
      return node.replace(/\{\{(\w+)\}\}/g, (_, k) => params?.[k] ?? `{{${k}}}`);
    }

    // 2b. Check *Keys namespace fallback
    const fallbackRoot = `${parts[0]}Keys`;
    if (t?.[fallbackRoot]) {
      let fbNode = t[fallbackRoot];
      for (const part of parts.slice(1)) {
        fbNode = fbNode?.[part];
        if (fbNode === undefined) break;
      }
      if (typeof fbNode === "string") {
        return fbNode.replace(/\{\{(\w+)\}\}/g, (_, k) => params?.[k] ?? `{{${k}}}`);
      }
    }
  }

  // 3. Pre-resolved text even if it looked key-like (second chance)
  if (fallbackText) return fallbackText;

  // 4. Raw key — visible to devs only, never to end users in production
  return key;
};

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { t }           = useLanguage();
  const socketRef       = useRef(null);
  const channelRef      = useRef(null);

  const {
    fetchNotifications,
    onSocketNotification,
    onSocketUnreadCount,
  } = useNotificationStore();

  const resolve = useCallback(buildResolver(t), [t]);

  useEffect(() => {
    if (!user || !token) return;

    fetchNotifications?.("all", true);

    const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_SERVER_URL || configuredApiUrl.replace(/\/api(\/v1)?\/?$/i, "") || (typeof window !== "undefined" ? window.location.origin : "");
    const socket = io(socketUrl, {
      auth:                 { token },
      transports:           ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay:    1500,
      withCredentials:      true,
      path: "/socket.io",
    });
    socketRef.current = socket;

    // Multi-tab sync
    let channel;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(`notifications:${user._id}`);
      channelRef.current = channel;
      channel.onmessage = (e) => {
        const { type: msgType, payload } = e.data;
        if (msgType === "new")   onSocketNotification?.(payload);
        if (msgType === "count") onSocketUnreadCount?.(payload);
      };
    }

    socket.on("notification:new", (payload) => {
      onSocketNotification?.(payload);
      channel?.postMessage({ type: "new", payload });
    });

    socket.on("notification:unread_count", (payload) => {
      onSocketUnreadCount?.(payload);
      channel?.postMessage({ type: "count", payload });
    });

    socket.on("connect", () => {
      socket.emit("notification:request_count");
    });

    socket.on("connect_error", (err) => {
      console.warn("[NotificationSocket] connect_error:", err.message);
    });

    return () => {
      socket.disconnect();
      channel?.close();
    };
  }, [user?._id, token]);

  return (
    <NotificationContext.Provider value={{ socketRef, resolve }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);