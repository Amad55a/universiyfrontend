/**
 * Socket Event Handlers
 *
 * Each handler receives (queryClient, data) and updates React Query cache.
 */

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
export const handleReservationCreated = (queryClient, data) => {
    queryClient.setQueryData(["reservations"], (old = []) => {
        if (!Array.isArray(old)) return old;
        return [data, ...old];
    });
    queryClient.invalidateQueries({ queryKey: ["reservations", "paginated"] });
    queryClient.invalidateQueries({ queryKey: ["myReservations"] });
    queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
    queryClient.invalidateQueries({ queryKey: ["seatSlots"] });
};

export const handleReservationUpdated = (queryClient, data) => {
    queryClient.setQueriesData(
        { queryKey: ["reservations"] },
        (old = []) => {
            if (!Array.isArray(old)) return old;
            return old.map((r) => (r._id === data._id ? { ...r, ...data } : r));
        }
    );
    queryClient.setQueryData(["reservation", data._id], data);
    queryClient.setQueriesData(
        { queryKey: ["myReservations"] },
        (old = []) => {
            if (!Array.isArray(old)) return old;
            return old.map((r) => (r._id === data._id ? { ...r, ...data } : r));
        }
    );
    queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
    queryClient.invalidateQueries({ queryKey: ["seatSlots"] });
};

export const handleReservationCancelled = (queryClient, data) => {
    queryClient.setQueriesData(
        { queryKey: ["reservations"] },
        (old = []) => {
            if (!Array.isArray(old)) return old;
            return old.filter((r) => r._id !== data._id);
        }
    );
    queryClient.setQueriesData(
        { queryKey: ["myReservations"] },
        (old = []) => {
            if (!Array.isArray(old)) return old;
            return old.map((r) =>
                r._id === data._id ? { ...r, ...data, status: "cancelled" } : r
            );
        }
    );
    queryClient.invalidateQueries({ queryKey: ["reservation", data._id] });
    queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
    queryClient.invalidateQueries({ queryKey: ["seatSlots"] });
};

// ─── SEATS ────────────────────────────────────────────────────────────────────
export const handleSeatUpdated = (queryClient, data) => {
    queryClient.setQueryData(["seat", data._id], data);

    queryClient.setQueriesData({ queryKey: ["seats"] }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((s) => (s._id === data._id ? { ...s, ...data } : s));
    });

    queryClient.setQueriesData({ queryKey: ["admin-seats"] }, (old) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
            ...old,
            data: old.data.map((s) => (s._id === data._id ? { ...s, ...data } : s)),
        };
    });

    queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
    queryClient.invalidateQueries({ queryKey: ["seatSlots", data._id] });
    queryClient.invalidateQueries({ queryKey: ["admin-seat-reservations"] });
    queryClient.invalidateQueries({ queryKey: ["admin-seat-reservation-stats"] });
};

export const handleSeatsAvailable = (queryClient, seats) => {
    queryClient.setQueryData(["seats", "available"], seats);
};

// ─── BORROWS ──────────────────────────────────────────────────────────────────
export const handleBorrowCreated = (queryClient, data) => {
    queryClient.setQueryData(["borrows"], (old = []) => {
        if (!Array.isArray(old)) return old;
        return [data, ...old];
    });
    queryClient.invalidateQueries({ queryKey: ["borrows", "paginated"] });
};

export const handleBorrowReturned = (queryClient, data) => {
    queryClient.setQueriesData({ queryKey: ["borrows"] }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((b) => (b._id === data._id ? { ...b, status: "returned" } : b));
    });
    queryClient.setQueryData(["borrow", data._id], (old) => ({
        ...old,
        status: "returned",
    }));
};

export const handleBorrowOverdue = (queryClient, data) => {
    queryClient.setQueriesData({ queryKey: ["borrows"] }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((b) =>
            b._id === data._id ? { ...b, status: "overdue", ...data } : b
        );
    });
    queryClient.setQueryData(["borrow", data._id], (old) => ({
        ...old,
        status: "overdue",
        ...data,
    }));
};

export const handleBorrowUpdated = (queryClient, data) => {
    queryClient.setQueriesData({ queryKey: ["borrows"] }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((b) => (b._id === data._id ? { ...b, ...data } : b));
    });
    queryClient.setQueryData(["borrow", data._id], (old) => ({ ...old, ...data }));
    queryClient.setQueriesData({ queryKey: ["myBorrows"] }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((b) => (b._id === data._id ? { ...b, ...data } : b));
    });
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

/**
 * handleNotificationNew — was MISSING from the original file.
 * Prepends the new notification and bumps the unread counter.
 *
 * The server emits notification:new with the shape from socketEmitter:
 *   { _id, user, type, message, read, createdAt }
 *
 * We normalise it to match the shape useNotifications expects:
 *   { _id / deliveryId, type, title, message, isRead, createdAt, ... }
 */
const unreadCountKey = (userId) => ["notifications", userId, "unreadCount"];
const adjustUnreadCount = (old, delta) => {
    const current = typeof old === "number" ? old : Number(old?.count ?? 0);
    return { count: Math.max(0, current + delta) };
};

export const handleNotificationNew = (queryClient, data, userId) => {
    // Build a notification object that matches what the notifications page renders
    const normalised = {
        _id: data.deliveryId ?? data._id,
        deliveryId: data.deliveryId ?? data._id,
        notificationId: data.notificationId ?? data._id,
        type: data.type ?? "system",
        title: data.title ?? data.titleKey ?? "",
        message: data.message ?? data.messageKey ?? "",
        titleKey: data.titleKey,
        messageKey: data.messageKey,
        titleParams: data.titleParams,
        messageParams: data.messageParams,
        isRead: data.read ?? false,
        readAt: null,
        createdAt: data.createdAt ?? new Date().toISOString(),
        actionUrl: data.actionUrl ?? null,
    };

    // Prepend to every "notifications" query in the cache (any filter / page)
    let alreadyPresent = false;
    queryClient.setQueriesData({ queryKey: ["notifications", userId] }, (old) => {
        if (!old) return old;
        // Handle both array and paginated { notifications: [...] } shapes
        if (Array.isArray(old)) {
            alreadyPresent ||= old.some((notification) => notification.deliveryId === normalised.deliveryId);
            return alreadyPresent ? old : [normalised, ...old];
        }
        if (Array.isArray(old.notifications)) {
            alreadyPresent ||= old.notifications.some(
                (notification) => notification.deliveryId === normalised.deliveryId
            );
            if (alreadyPresent) return old;
            return {
                ...old,
                notifications: [normalised, ...old.notifications],
                unreadCount: (old.unreadCount ?? 0) + 1,
            };
        }
        return old;
    });

    // Bump the standalone unread counter query
    if (!alreadyPresent) {
        queryClient.setQueryData(unreadCountKey(userId), (old) => adjustUnreadCount(old, 1));
    }
};

export const handleNotificationRead = (queryClient, data, userId) => {
    let changedUnread = false;
    queryClient.setQueriesData({ queryKey: ["notifications", userId] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
            return old.map((n) => {
                if (n.deliveryId !== data.deliveryId && n._id !== data._id) return n;
                if (!n.isRead) changedUnread = true;
                return { ...n, isRead: true, readAt: data.readAt };
            });
        }
        if (Array.isArray(old.notifications)) {
            return {
                ...old,
                notifications: old.notifications.map((n) => {
                    if (n.deliveryId !== data.deliveryId && n._id !== data._id) return n;
                    if (!n.isRead) changedUnread = true;
                    return { ...n, isRead: true, readAt: data.readAt };
                }),
            };
        }
        return old;
    });
    if (changedUnread) {
        queryClient.setQueryData(unreadCountKey(userId), (old) => adjustUnreadCount(old, -1));
    }
};

// Handles the server's "notification:unread_count" push from NotificationController._pushCount
export const handleNotificationUnreadCount = (queryClient, data, userId) => {
    queryClient.setQueryData(unreadCountKey(userId), { count: Number(data.count ?? 0) });
};

// ─── USER STATUS ──────────────────────────────────────────────────────────────
export const handleUserStatusChanged = (queryClient, data) => {
    queryClient.setQueryData(["user"], (old) => {
        if (!old || String(old._id) !== String(data._id)) return old;
        return {
            ...old,
            status: data.status,
            accountStatus: data.accountStatus || data.status,
        };
    });

    queryClient.setQueriesData({ queryKey: ["admin-users"] }, (old) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
            ...old,
            data: old.data.map((user) =>
                String(user._id) === String(data._id)
                    ? {
                        ...user,
                        status: data.status,
                        accountStatus: data.accountStatus || data.status,
                    }
                    : user
            ),
        };
    });
};

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
export const handleDashboardStatsUpdated = (queryClient, stats) => {
    queryClient.setQueryData(["dashboard", "stats"], stats);
    queryClient.setQueryData(["dashboard", "activeReservations"], stats.activeReservations);
    queryClient.setQueryData(["dashboard", "availableSeats"], stats.availableSeats);
    queryClient.setQueryData(["dashboard", "totalBorrows"], stats.totalBorrows);
    queryClient.setQueryData(["dashboard", "overdueCount"], stats.overdueCount);
};

// ─── COMMUNITY ───────────────────────────────────────────────────────────────
export const handleCommunityEvent = (queryClient, eventName, data) => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    if (queryClient && eventName.startsWith("community:post")) {
        queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    }
};

// ─── GROUP MEMBERS ────────────────────────────────────────────────────────────
/**
 * handleGroupMemberStatusChanged — updates member status in real-time
 * Called when a member is banned, suspended, muted, or unmuted
 */
export const handleGroupMemberStatusChanged = (queryClient, data) => {
    const { groupId, userId, status } = data;

    // Update the group members list for this specific group
    queryClient.setQueryData(["groupMembers", groupId], (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((member) =>
            member.user?._id === userId
                ? { ...member, status }
                : member
        );
    });

    // Invalidate group detail to refresh display
    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
};

/**
 * handleGroupMemberAdminLevelChanged — updates member admin level
 * Called when admin level is changed (grant/revoke announcement or group admin)
 */
export const handleGroupMemberAdminLevelChanged = (queryClient, data) => {
    const { groupId, userId, adminLevel } = data;

    queryClient.setQueryData(["groupMembers", groupId], (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((member) =>
            member.user?._id === userId
                ? { ...member, adminLevel }
                : member
        );
    });

    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
};

/**
 * handleGroupMemberRemoved — removes member from the group
 */
export const handleGroupMemberRemoved = (queryClient, data) => {
    const { groupId, userId } = data;

    queryClient.setQueryData(["groupMembers", groupId], (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.filter((member) => member.user?._id !== userId);
    });

    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
};