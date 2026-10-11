import { getToken, onMessage } from "firebase/messaging";
import { getMessagingSafe } from "./firebase";
import { toast } from "sonner";
import api from "@/api/client";

const todayKey = () => {
  const d = new Date();
  return `push_prompt_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const shouldPromptToday = () => {
  try {
    return !localStorage.getItem(todayKey());
  } catch {
    return true;
  }
};

export const markPromptedToday = () => {
  try {
    localStorage.setItem(todayKey(), "1");
  } catch { /* ignore */ }
};

let foregroundListenerAttached = false;

export const attachForegroundMessageListener = async () => {
  if (foregroundListenerAttached) return;
  try {
    const messaging = await getMessagingSafe();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("[FCM Foreground Message Received]:", payload);
      const title = payload?.notification?.title || payload?.data?.title || "UniCore Notification";
      const body = payload?.notification?.body || payload?.data?.body || "";
      const url = payload?.data?.url || "/notifications";

      toast.info(title, {
        description: body,
        action: url ? {
          label: "View",
          onClick: () => { window.location.href = url; },
        } : undefined,
      });

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          data: { url },
        });
      }
    });
    foregroundListenerAttached = true;
  } catch (err) {
    console.error("[FCM Foreground Listener Error]:", err);
  }
};

export const requestPushPermission = async () => {
  markPromptedToday();

  try {
    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications not supported in this browser environment.");
      return { ok: false, reason: "unsupported" };
    }
    if (!("serviceWorker" in navigator)) {
      console.warn("[FCM] Service Worker not supported in this browser environment.");
      return { ok: false, reason: "no_sw" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn(`[FCM] Notification permission result: ${permission}`);
      return { ok: false, reason: permission };
    }

    const messaging = await getMessagingSafe();
    if (!messaging) {
      console.warn("[FCM] Messaging safe check failed or unsupported.");
      return { ok: false, reason: "messaging_unsupported" };
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[FCM] Missing VAPID key (VITE_FIREBASE_VAPID_KEY env variable).");
      return { ok: false, reason: "missing_vapid" };
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("[FCM] Failed to generate FCM registration token.");
      return { ok: false, reason: "no_token" };
    }

    console.log("[FCM Token Generated Successfully]:", token.substring(0, 15) + "...");
    await api.post("/auth/fcm-token", { token }, { withCredentials: true });

    await attachForegroundMessageListener();

    return { ok: true, token };
  } catch (err) {
    console.error("[FCM Request Push Permission Failure]:", err);
    return { ok: false, reason: err.message || "unknown_error" };
  }
};
