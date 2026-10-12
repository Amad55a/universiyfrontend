// client/components/notifications/NotificationPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//
//   1. NotifItem now renders n.title / n.message directly.
//      These are ALWAYS populated (pre-resolved at creation time by the server).
//      The resolver is still called as a progressive enhancement for apps with
//      full i18n translation files.
//
//   2. onRead and onDismiss now receive n.deliveryId (not n._id directly from
//      the card click handler in NotificationsPage).  Both fields are identical
//      on REST-fetched notifications; this makes the intent explicit.
//
//   3. rel() replaced with the shared relativeTime() utility — single source
//      of truth, no more inconsistency between panel and page.
//
//   4. ToastBanner still renders from socket payloads which now always carry
//      `title` and `message` as pre-resolved text.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Bell, X, CheckCheck, Trash2, ChevronDown,
  Calendar, BookOpen, Settings, AlertTriangle, Megaphone,
  Info, Clock, ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useNotifications } from "@/hooks/useNotifications";
import { buildResolver } from "../context/Notificationcontext";
import socket from "@/socket";
import { relativeTime } from "@/utils/notificationTime";
import { requestPushPermission, shouldPromptToday } from "@/firebase/pushPermission";

// ── Type → icon map ───────────────────────────────────────────────────────────
const TYPE_UI = {
  reservation_created: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_approved: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_rejected: { Icon: Calendar, dot: "bg-black", icon: "text-black dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_cancelled: { Icon: Calendar, dot: "bg-gray-500", icon: "text-gray-600 dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_expired: { Icon: Clock, dot: "bg-gray-500", icon: "text-gray-600 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_noshow: { Icon: Clock, dot: "bg-gray-500", icon: "text-gray-600 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_start_warning: { Icon: Clock, dot: "bg-orange-500", icon: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
  reservation_reminder_15: { Icon: Clock, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_reminder_10: { Icon: Clock, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  checkin_success: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  book_due_soon: { Icon: BookOpen, dot: "bg-black", icon: "text-black dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  book_overdue: { Icon: BookOpen, dot: "bg-black", icon: "text-black dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  book_returned: { Icon: BookOpen, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  book_borrowed: { Icon: BookOpen, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  book_extended: { Icon: BookOpen, dot: "bg-blue-500", icon: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  book_lost: { Icon: BookOpen, dot: "bg-black", icon: "text-black dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  student_verified: { Icon: Settings, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  user_created: { Icon: Settings, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  system: { Icon: Settings, dot: "bg-gray-500", icon: "text-gray-600 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800" },
  warning: { Icon: AlertTriangle, dot: "bg-black", icon: "text-black dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
  announcement: { Icon: Megaphone, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
};

const getUI = (type) =>
  TYPE_UI[type] ?? { Icon: Info, dot: "bg-gray-400", icon: "text-gray-400", bg: "bg-gray-50 dark:bg-gray-800" };

// ─────────────────────────────────────────────────────────────────────────────
// TOAST BANNER
// ─────────────────────────────────────────────────────────────────────────────
const ToastBanner = ({ notif, resolve, onDismiss, onClick }) => {
  const [phase, setPhase] = useState("enter");
  const [progress, setProgress] = useState(100);

  const { Icon, icon, bg } = getUI(notif.type);

  // Pre-resolved text is the first arg to resolve() — it wins immediately
  const title = resolve(notif.titleKey, notif.titleParams ?? {}, notif.title ?? "");
  const message = resolve(notif.messageKey, notif.messageParams ?? {}, notif.message ?? "");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("visible"), 40);
    const DURATION = 6000;
    const STEP = 50;
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += STEP;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
      if (elapsed >= DURATION) {
        clearInterval(iv);
        setPhase("exit");
        setTimeout(onDismiss, 300);
      }
    }, STEP);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, []);

  const isVisible = phase === "visible";

  const handleClick = () => {
    setPhase("exit");
    setTimeout(() => { onDismiss(); onClick?.(); }, 220);
  };

  return createPortal(
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 99999,
        width: "min(420px, calc(100vw - 24px))",
        transform: isVisible ? "translateY(0)" : "translateY(-18px)",
        opacity: isVisible ? 1 : 0,
        transition: "transform 220ms ease, opacity 180ms ease",
        cursor: "pointer",
      }}
    >
      <div style={{
        background: "linear-gradient(180deg, #111827 0%, #0b1020 100%)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 22px 60px rgba(15,23,42,0.38)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 14px 13px" }}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${bg}`}>
            <Icon size={16} className={icon} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3ff", marginBottom: 4 }}>
              New Notification
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.28, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {title}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", marginTop: 4, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {message}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: 2 }}>
            {notif.actionUrl && (
              <div style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
                <ExternalLink size={12} />
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setPhase("exit"); setTimeout(onDismiss, 300); }}
              style={{ width: 28, height: 28, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.62)" }}
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #22c55e)", borderRadius: 99, width: `${progress}%`, transition: "width 50ms linear" }} />
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Toast Manager ─────────────────────────────────────────────────────────────
export const NotificationToastManager = () => {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();
  const resolve = useCallback(buildResolver(t), [t]);

  useEffect(() => {
    const onNew = (payload) => {
      const id = payload._id ?? Date.now().toString();
      setToasts((prev) => {
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
        return [...trimmed, { ...payload, _toastId: id }];
      });
    };
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, []);

  const dismiss = (toastId) =>
    setToasts((prev) => prev.filter((t) => t._toastId !== toastId));

  return (
    <>
      {toasts.map((notif) => (
        <ToastBanner
          key={notif._toastId}
          notif={notif}
          resolve={resolve}
          onDismiss={() => dismiss(notif._toastId)}
          onClick={() => notif.actionUrl && navigate(notif.actionUrl)}
        />
      ))}
    </>
  );
};

// ── Single notification item ──────────────────────────────────────────────────
const NotifItem = ({ n, onRead, onDismiss, resolve }) => {
  const navigate = useNavigate();
  const { Icon, dot, icon, bg } = getUI(n.type);

  // Force re-render every minute so relative times stay current
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  // n.title / n.message are always pre-resolved; resolve() adds i18n on top
  const title = resolve(n.titleKey, n.titleParams ?? {}, n.title ?? "");
  const message = resolve(n.messageKey, n.messageParams ?? {}, n.message ?? "");

  const handleClick = () => {
    if (!n.isRead) onRead(n.deliveryId);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative grid grid-cols-[40px_minmax(0,1fr)_28px] gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${!n.isRead ? "bg-indigo-50/80 dark:bg-indigo-500/[0.08]" : ""
        }`}
    >
      {!n.isRead && (
        <span className={`absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full ${dot}`} />
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${bg}`}>
        <Icon size={15} className={icon} />
      </div>
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <p className={`flex-1 min-w-0 text-[13px] leading-snug break-words ${!n.isRead ? "font-black text-gray-950 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
            {title}
          </p>
          <span className="hidden sm:inline-flex flex-shrink-0 text-[10px] font-semibold text-gray-400 dark:text-white/35 whitespace-nowrap pt-0.5">
            {relativeTime(n.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed break-words">
          {message}
        </p>
        <p className="sm:hidden text-[10px] font-semibold text-gray-400 dark:text-white/35 mt-1.5">
          {relativeTime(n.createdAt)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(n.deliveryId); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTERS = [
  { value: "all", label: "All" },
  { value: "reservation_created", label: "Reservations" },
  { value: "book_due_soon", label: "Books" },
  { value: "system", label: "System" },
  { value: "warning", label: "Warnings" },
  { value: "announcement", label: "Announcements" },
];

// ── Main Panel ────────────────────────────────────────────────────────────────
export const NotificationPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const n = t?.notification ?? {};
  const resolve = useCallback(buildResolver(t), [t]);

  const {
    notifications, unreadCount, loading, loadingMore, hasMore,
    error, refreshNotifications, countLoading, countError, refreshUnreadCount,
    activeFilter, changeFilter,
    markAsRead, markAllAsRead, dismiss, clearAll, loadMore,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const prevCountRef = useRef(unreadCount);
  const [pulse, setPulse] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (open && !panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter((x) => !x.isRead);
  const read = notifications.filter((x) => x.isRead);

  // Badge pulse for 3 seconds when count increases
  useEffect(() => {
    const prev = prevCountRef.current ?? 0;
    if (unreadCount > prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 3000);
      prevCountRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    setPushAvailable(
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    );
  }, []);

  const enablePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const res = await requestPushPermission();
      if (res.ok) {
        setPulse(true);
        setTimeout(() => setPulse(false), 3000);
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="relative">
      {/* Toast manager — always mounted so it catches socket events */}
      <NotificationToastManager />

      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${open
          ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 shadow-sm"
          : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
          }`}
        aria-label={countError
          ? "Notifications, unread count unavailable"
          : countLoading
            ? "Notifications, loading unread count"
            : `Notifications, ${unreadCount} unread`}
      >
        <Bell size={18} className={pulse ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[19px] h-[19px] rounded-full bg-[#2C2DE0] text-white text-[9px] font-black flex items-center justify-center px-1.5 shadow-sm ring-2 ring-white dark:ring-gray-950 tabular-nums ${pulse ? "animate-pulse" : ""}`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {countLoading && unreadCount === 0 && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2C2DE0] border-t-transparent animate-spin"
            role="status"
            aria-label="Loading unread count"
          />
        )}
        {countError && (
          <span
            className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
            title="Unread count unavailable"
            aria-label="Unread count unavailable"
          >
            !
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xl shadow-black/15 dark:shadow-black/60 flex flex-col overflow-hidden z-50"
          style={{ width: "min(440px, calc(100vw - 24px))", maxHeight: "min(680px, 82vh)" }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center flex-shrink-0">
                    <Bell size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-950 dark:text-white truncate">
                      {n.title ?? "Notifications"}
                    </p>
                    <p className="text-[11px] font-medium text-gray-400 dark:text-white/35">
                      {notifications.length} total
                    </p>
                  </div>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[#2C2DE0] text-[10px] font-black border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap flex-shrink-0 tabular-nums">
                  {unreadCount} {n.unread ?? "unread"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
              {pushAvailable && Notification.permission !== "granted" && (
                <button
                  onClick={enablePush}
                  disabled={pushBusy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white bg-[#2C2DE0] hover:bg-[#2425bd] disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap flex-shrink-0"
                  title="Enable push notifications"
                >
                  {pushBusy ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Bell size={12} />
                  )}
                  {pushBusy ? "Enabling..." : "Enable Notifications"}
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white bg-[#2C2DE0] hover:bg-[#2425bd] transition-all whitespace-nowrap"
                >
                  <CheckCheck size={12} />
                  {n.markAllRead ?? "Mark all read"}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0"
                  title={n.clearAll ?? "Clear all"}
                  aria-label={n.clearAll ?? "Clear all"}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {countLoading && unreadCount === 0 && (
              <p className="mt-2 text-[11px] text-gray-500" role="status">
                Loading unread count…
              </p>
            )}
            {countError && (
              <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-600" role="alert">
                <span>Unread count is unavailable.</span>
                <button className="font-bold underline" onClick={() => refreshUnreadCount()}>
                  Retry
                </button>
              </p>
            )}
            {error && (
              <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-600" role="alert">
                <span>Notifications could not be loaded.</span>
                <button className="font-bold underline" onClick={() => refreshNotifications()}>
                  Retry
                </button>
              </p>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-white/5 flex-shrink-0 bg-gray-50/70 dark:bg-white/[0.02]">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => changeFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all flex-shrink-0 ${activeFilter === f.value
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
              >
                {f.label}
                {f.value === "all" && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#2C2DE0] text-white text-[9px] font-black">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-2 pt-0.5">
                      <div className="h-3 w-3/5 rounded bg-gray-100 dark:bg-white/5 animate-pulse" />
                      <div className="h-2.5 w-full rounded bg-gray-100 dark:bg-white/5 animate-pulse" />
                      <div className="h-2 w-1/4 rounded bg-gray-100 dark:bg-white/5 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-red-600" role="alert">
                Notifications could not be loaded.
                <button className="ml-2 font-bold underline" onClick={() => refreshNotifications()}>
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <Bell size={22} className="text-gray-300 dark:text-white/20" />
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  {n.allCaughtUp ?? "All caught up!"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.noNotifications ?? "No notifications right now"}
                </p>
              </div>
            ) : (
              <>
                {unread.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {n.unread ?? "Unread"} · {unread.length}
                    </p>
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                      {unread.map((x) => (
                        <NotifItem key={x.deliveryId} n={x} onRead={markAsRead} onDismiss={dismiss} resolve={resolve} />
                      ))}
                    </div>
                  </div>
                )}
                {read.length > 0 && (
                  <div>
                    {unread.length > 0 && (
                      <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {n.earlier ?? "Earlier"}
                      </p>
                    )}
                    <div className="divide-y divide-gray-50 dark:divide-white/5 opacity-70">
                      {read.map((x) => (
                        <NotifItem key={x.deliveryId} n={x} onRead={markAsRead} onDismiss={dismiss} resolve={resolve} />
                      ))}
                    </div>
                  </div>
                )}
                {hasMore && (
                  <div className="px-4 py-3">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-white/10 disabled:opacity-40 transition-all"
                    >
                      {loadingMore
                        ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        : <><ChevronDown size={13} />{n.loadMore ?? "Load more"}</>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            {notifications.length > 0 && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                {notifications.length} {n.total ?? "total"} • {unreadCount} {n.unread ?? "unread"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
