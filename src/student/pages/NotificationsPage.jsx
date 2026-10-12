// src/pages/NotificationsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//
//   1. NotifCard renders n.title and n.message directly — always pre-resolved.
//
//   2. onRead(n.deliveryId) — correct ID for the REST endpoint.
//      Previously called onRead(n._id) which sent the wrong ID to PATCH
//      /api/notifications/:id/read when _id !== deliveryId on socket-pushed
//      notifications.
//
//   3. rel() replaced with shared relativeTime() utility.
//
//   4. Role-based header unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import {
  Bell, Calendar, BookOpen, Settings, AlertTriangle,
  Megaphone, Info, CheckCheck, Trash2, ChevronDown, X, Clock,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { sectionWrap } from "@/shared/constants/surfaces";
import { relativeTime } from "@/utils/notificationTime";
import AdminHeader from "../../admin/components/Header/AdminHeader";

// ── Type UI map ────────────────────────────────────────────────────────────────
const TYPE_UI = {
  reservation_created: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_approved: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_rejected: { Icon: Calendar, dot: "bg-red-500", icon: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  reservation_cancelled: { Icon: Calendar, dot: "bg-gray-400", icon: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_expired: { Icon: Clock, dot: "bg-gray-400", icon: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_noshow: { Icon: Clock, dot: "bg-gray-400", icon: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  reservation_start_warning: { Icon: Clock, dot: "bg-orange-500", icon: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
  reservation_reminder_15: { Icon: Clock, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  reservation_reminder_10: { Icon: Clock, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  checkin_success: { Icon: Calendar, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  book_due_soon: { Icon: BookOpen, dot: "bg-orange-500", icon: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
  book_overdue: { Icon: BookOpen, dot: "bg-red-500", icon: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  book_returned: { Icon: BookOpen, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  book_borrowed: { Icon: BookOpen, dot: "bg-blue-500", icon: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  book_extended: { Icon: BookOpen, dot: "bg-blue-500", icon: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  book_lost: { Icon: BookOpen, dot: "bg-red-500", icon: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  student_verified: { Icon: Settings, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  user_created: { Icon: Settings, dot: "bg-[#2C2DE0]", icon: "text-[#2C2DE0]", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  system: { Icon: Settings, dot: "bg-gray-400", icon: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  warning: { Icon: AlertTriangle, dot: "bg-orange-500", icon: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
  announcement: { Icon: Megaphone, dot: "bg-purple-500", icon: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
};

const getUI = (type) =>
  TYPE_UI[type] ?? { Icon: Info, dot: "bg-gray-400", icon: "text-gray-400", bg: "bg-gray-50 dark:bg-gray-800" };

// ── Filter pills ───────────────────────────────────────────────────────────────
const FILTERS = [
  { value: "all", label: "All", Icon: Bell },
  { value: "reservation_created", label: "Reservations", Icon: Calendar },
  { value: "book_due_soon", label: "Books", Icon: BookOpen },
  { value: "system", label: "System", Icon: Settings },
  { value: "warning", label: "Warnings", Icon: AlertTriangle },
  { value: "announcement", label: "Announcements", Icon: Megaphone },
];

// ── Notification card ──────────────────────────────────────────────────────────
const NotifCard = ({ n, onRead, onDismiss }) => {
  const navigate = useNavigate();
  const { Icon, dot, icon, bg } = getUI(n.type);

  const handleClick = () => {
    // FIX: use deliveryId (the NotificationDelivery._id) not the bare _id
    if (!n.isRead) onRead(n.deliveryId);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all cursor-pointer ${!n.isRead
          ? "bg-blue-50/40 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20 hover:border-blue-200 dark:hover:border-blue-500/30"
          : "bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
        }`}
    >
      {!n.isRead && (
        <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${dot}`} />
      )}
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={18} className={icon} />
      </div>
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className={`text-sm leading-snug ${!n.isRead ? "font-black text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
            {/* n.title is always pre-resolved from the server — never a raw key */}
            {n.title}
          </p>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {relativeTime(n.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          {n.message}
        </p>
        {n.actionUrl && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 font-medium">Tap to view →</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(n.deliveryId); }}
        className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ── Footer ────────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="border-t border-gray-100 dark:border-gray-800 mt-16 py-8 text-center">
    <p className="text-xs text-gray-400">
      © {new Date().getFullYear()} Library System · All rights reserved
    </p>
  </footer>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const {
    notifications, unreadCount, loading, loadingMore, hasMore,
    error, refreshNotifications, countError, countLoading, refreshUnreadCount,
    activeFilter, changeFilter,
    markAsRead, markAllAsRead, dismiss, clearAll, loadMore,
  } = useNotifications();

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  const content = (
    <section className={`${sectionWrap} max-w-2xl ${isAdmin ? "mt-6" : "mt-4"} pb-16`}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading
              ? "Loading…"
              : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#2C2DE0] dark:text-[#2C2DE0] bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 hover:bg-[#2C2DE0] transition-all text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            >
              <CheckCheck size={13} />Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 transition-all"
            >
              <Trash2 size={13} />Clear all
            </button>
          )}
        </div>
      </div>

      {!loading && error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300" role="alert">
          <span>Notifications could not be loaded.</span>
          <button className="font-bold underline" onClick={() => refreshNotifications()}>
            Retry
          </button>
        </div>
      )}
      {countLoading && unreadCount === 0 && (
        <p className="mb-3 text-xs text-gray-500" role="status">
          Loading unread count…
        </p>
      )}
      {countError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300" role="alert">
          <span>Unread count is unavailable.</span>
          <button className="font-bold underline" onClick={() => refreshUnreadCount()}>
            Retry
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(({ value, label, Icon: FIcon }) => {
          const active = activeFilter === value;
          return (
            <button
              key={value}
              onClick={() => changeFilter(value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0 ${active
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                  : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
            >
              <FIcon size={11} />
              {label}
              {value === "all" && unreadCount > 0 && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
              <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2.5 pt-0.5">
                <div className="h-3.5 w-2/5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-2.5 w-3/4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
            <Bell size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-bold text-gray-900 dark:text-white">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeFilter !== "all" ? `No ${activeFilter} notifications` : "You're all caught up!"}
          </p>
        </div>
      )}

      {/* Unread section */}
      {!loading && unread.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Unread</p>
            <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 text-[10px] font-black border border-red-100 dark:border-red-500/20">
              {unread.length}
            </span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="flex flex-col gap-2.5">
            {unread.map((n) => (
              <NotifCard key={n.deliveryId} n={n} onRead={markAsRead} onDismiss={dismiss} />
            ))}
          </div>
        </div>
      )}

      {/* Read section */}
      {!loading && read.length > 0 && (
        <div>
          {unread.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Earlier</p>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {read.map((n) => (
              <NotifCard key={n.deliveryId} n={n} onRead={markAsRead} onDismiss={dismiss} />
            ))}
          </div>
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <div className="mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 transition-all"
          >
            {loadingMore
              ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              : <><ChevronDown size={15} />Load more</>
            }
          </button>
        </div>
      )}
    </section>
  );

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <AdminHeader pageTitle="Notifications" breadcrumbs={[
          { label: "Dashboard", path: "/admin/dashboard" },
          { label: "Notifications" },
        ]} />
        <main className="flex-1">{content}</main>
        <Footer />
      </div>
    );
  }

  return content;
};

export default NotificationsPage;
