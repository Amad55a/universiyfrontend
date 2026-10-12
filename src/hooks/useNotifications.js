// client/hooks/useNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//
//   1. normaliseSocketNotif now maps `title` → `title` and `message` → `message`
//      so REST-fetched and socket-pushed notifications have identical shapes.
//      The resolver priority (pre-resolved text first) means no raw keys show.
//
//   2. markAsRead now calls api.markRead(n.deliveryId) not n._id.
//      Both fields exist on every notification but deliveryId is the correct
//      REST endpoint parameter.  The notification cards must pass deliveryId.
//
//   3. Socket listeners are deduplicated — this hook uses the shared socket
//      import for live events only.  NotificationContext owns the authenticated
//      io() connection; this hook owns the React Query cache updates.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useNotificationContext, buildResolver } from "../context/Notificationcontext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

// ── API helpers ───────────────────────────────────────────────────────────────
const api = {
  getNotifications: (params) =>
    apiClient.get("/notifications", { params }).then((r) => r.data),
  getUnreadCount: () =>
    apiClient.get("/notifications/unread-count").then((r) => r.data),
  markRead: (deliveryId) =>
    apiClient.patch(`/notifications/${deliveryId}/read`).then((r) => r.data),
  markAllRead: () =>
    apiClient.patch("/notifications/read-all").then((r) => r.data),
  dismiss: (deliveryId) =>
    apiClient.delete(`/notifications/${deliveryId}`).then((r) => r.data),
  clearAll: () =>
    apiClient.delete("/notifications/clear-all").then((r) => r.data),
};

// ── Normalise a raw socket notification to the UI shape ───────────────────────
// The socket payload from notificationService now always contains:
//   titleResolved / messageResolved  (pre-resolved English text)
//   titleKey / messageKey            (i18n keys)
//   title / message                  (aliases — same as resolved text)
const normaliseSocketNotif = (data) => ({
  _id:            data._id            ?? data.deliveryId,
  deliveryId:     data._id            ?? data.deliveryId,
  notificationId: data.notificationId ?? data._id,
  type:           data.type           ?? "system",

  // i18n keys
  titleKey:      data.titleKey      ?? "",
  messageKey:    data.messageKey    ?? "",
  titleParams:   data.titleParams   ?? {},
  messageParams: data.messageParams ?? {},

  // Pre-resolved text — primary display source
  // The socket payload sets `title` = titleResolved and `message` = messageResolved
  title:   data.title   ?? data.titleResolved   ?? "",
  message: data.message ?? data.messageResolved ?? "",

  isRead:    data.isRead    ?? false,
  readAt:    data.readAt    ?? null,
  createdAt: data.createdAt ?? new Date().toISOString(),
  actionUrl: data.actionUrl ?? null,
});

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useNotifications = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const ctx   = useNotificationContext();

  // Use context resolver if available, otherwise build a standalone one
  const resolve = useCallback(
    ctx?.resolve ?? buildResolver(t),
    [ctx?.resolve, t]
  );

  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const userId = user?._id ?? user?.id;
  const enabled = Boolean(userId && !authLoading);
  const LIMIT = 20;

  const queryKey = ["notifications", userId, activeFilter, page];

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      api.getNotifications({
        page,
        limit: LIMIT,
        type:  activeFilter === "all" ? undefined : activeFilter,
      }),
    enabled,
    keepPreviousData: true,
  });

  const countQuery = useQuery({
    queryKey:       ["notifications", userId, "unreadCount"],
    queryFn:        api.getUnreadCount,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });

  // Socket updates are handled centrally by socket/listeners.js via SocketSyncProvider.
  const invalidateUserNotifications = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  const { mutate: markAsRead } = useMutation({
    mutationFn: api.markRead,
    onSuccess:  invalidateUserNotifications,
  });

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: api.markAllRead,
    onSuccess:  invalidateUserNotifications,
  });

  const { mutate: dismiss } = useMutation({
    mutationFn: api.dismiss,
    onSuccess:  invalidateUserNotifications,
  });

  const { mutate: clearAll } = useMutation({
    mutationFn: api.clearAll,
    onSuccess:  invalidateUserNotifications,
  });

  const changeFilter = useCallback((filter) => {
    setActiveFilter(filter);
    setPage(1);
  }, []);

  const loadMore = useCallback(() => setPage((p) => p + 1), []);

  const data = notificationsQuery.data;
  const countData = countQuery.data;
  const notifications = data?.notifications ?? [];
  const unreadCount   = countData?.count ?? data?.unreadCount ?? 0;
  const hasMore       = data
    ? data.pagination?.hasMore ?? notifications.length < (data.pagination?.total ?? 0)
    : false;

  return {
    notifications,
    unreadCount,
    loading:     enabled && notificationsQuery.isLoading,
    loadingMore: false,
    hasMore,
    error: notificationsQuery.error,
    countLoading: enabled && countQuery.isLoading,
    countError: countQuery.error,
    refreshUnreadCount: countQuery.refetch,
    refreshNotifications: notificationsQuery.refetch,
    activeFilter,
    changeFilter,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    loadMore,
    resolve,
  };
};

export default useNotifications;
