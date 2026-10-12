/**
 * Socket Event Listeners — central registration.
 * Called once by useSocketSync on mount.
 */

import socket from "@/socket.js";
import * as handlers from "./handlers";

const registeredListeners = [];

export const registerSocketListeners = (queryClient, getUserId = () => undefined) => {
    if (!queryClient) {
        console.warn("[Socket] queryClient not provided to registerSocketListeners");
        return;
    }

    const on = (event, handler) => {
        socket.on(event, handler);
        registeredListeners.push({ event, handler });
    };

    // ── RESERVATIONS ─────────────────────────────────────────────────────
    on("reservation:created", (data) => handlers.handleReservationCreated(queryClient, data));
    on("reservation:updated", (data) => handlers.handleReservationUpdated(queryClient, data));
    on("reservation:cancelled", (data) => handlers.handleReservationCancelled(queryClient, data));
    // Legacy event name the server also emits
    on("reservationUpdated", (data) => handlers.handleReservationUpdated(queryClient, data));

    // ── SEATS ─────────────────────────────────────────────────────────────
    on("seat:updated", (data) => handlers.handleSeatUpdated(queryClient, data));
    on("seats:available", (seats) => handlers.handleSeatsAvailable(queryClient, seats));

    // ── BORROWS ───────────────────────────────────────────────────────────
    on("borrow:created", (data) => handlers.handleBorrowCreated(queryClient, data));
    on("borrow:returned", (data) => handlers.handleBorrowReturned(queryClient, data));
    on("borrow:overdue", (data) => handlers.handleBorrowOverdue(queryClient, data));
    on("borrow:updated", (data) => handlers.handleBorrowUpdated(queryClient, data));

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    on("notification:new", (data) => handlers.handleNotificationNew(queryClient, data, getUserId()));
    on("notification:read", (data) => handlers.handleNotificationRead(queryClient, data, getUserId()));
    // Server pushes this from _pushCount() after mark-read / dismiss etc.
    on("notification:unread_count", (data) =>
        handlers.handleNotificationUnreadCount(queryClient, data, getUserId())
    );

    // ── USER STATUS ───────────────────────────────────────────────────────
    on("user:status_changed", (data) => handlers.handleUserStatusChanged(queryClient, data));
    // Note: ban/suspend redirect is handled separately in useSocketSync
    // to keep navigate() in the correct React Router context.

    // ── DASHBOARD ─────────────────────────────────────────────────────────
    on("dashboard:stats_updated", (stats) => handlers.handleDashboardStatsUpdated(queryClient, stats));

    // ── COMMUNITY (also dispatched as window events via useCommunitySocket) ─
    on("post:like", (data) => handlers.handleCommunityEvent(queryClient, "community:post-like", data));
    on("comment:new", (data) => handlers.handleCommunityEvent(queryClient, "community:comment-new", data));
    on("comment:deleted", (data) => handlers.handleCommunityEvent(queryClient, "community:comment-deleted", data));
    on("post:created", (data) => handlers.handleCommunityEvent(queryClient, "community:post-created", data));
    on("post:deleted", (data) => handlers.handleCommunityEvent(queryClient, "community:post-deleted", data));
    on("chat:message", (data) => handlers.handleCommunityEvent(queryClient, "community:chat-message", data));
    on("chat:conversation_updated", () => handlers.handleCommunityEvent(queryClient, "community:chats-updated", {}));

    // ── GROUP MEMBERS ──────────────────────────────────────────────────────
    on("group:member_status_changed", (data) => handlers.handleGroupMemberStatusChanged(queryClient, data));
    on("group:member_admin_level_changed", (data) => handlers.handleGroupMemberAdminLevelChanged(queryClient, data));
    on("group:member_removed", (data) => handlers.handleGroupMemberRemoved(queryClient, data));

    // ── CONNECTION ────────────────────────────────────────────────────────
    on("connect", () => console.log("[Socket] Connected:", socket.id));
    on("disconnect", () => console.log("[Socket] Disconnected"));
    on("connect_error", (err) => console.error("[Socket] Connection error:", err));
};

export const unregisterSocketListeners = () => {
    registeredListeners.forEach(({ event, handler }) => socket.off(event, handler));
    registeredListeners.length = 0;
    console.log("[Socket] All listeners unregistered");
};