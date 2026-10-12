import { describe, expect, it } from "vitest";
import {
  handleNotificationNew,
  handleNotificationRead,
  handleNotificationUnreadCount,
} from "./handlers";

const createQueryClient = (initialEntries = []) => {
  const cache = new Map(initialEntries.map(([key, value]) => [JSON.stringify(key), { key, value }]));

  return {
    getQueryData: (key) => cache.get(JSON.stringify(key))?.value,
    setQueryData(key, updater) {
      const serialized = JSON.stringify(key);
      const current = cache.get(serialized)?.value;
      const value = typeof updater === "function" ? updater(current) : updater;
      cache.set(serialized, { key, value });
    },
    setQueriesData({ queryKey }, updater) {
      for (const [serialized, entry] of cache) {
        const matches = queryKey.every((part, index) => entry.key[index] === part);
        if (matches) {
          cache.set(serialized, { ...entry, value: updater(entry.value) });
        }
      }
    },
  };
};

describe("notification query cache", () => {
  it("keeps unread count data shaped as an object and scoped to its user", () => {
    const queryClient = createQueryClient([
      [["notifications", "student-a", "unreadCount"], { count: 4 }],
      [["notifications", "student-b", "unreadCount"], { count: 2 }],
      [["notifications", "student-a", "all", 1], { notifications: [], unreadCount: 0 }],
    ]);
    const notification = { deliveryId: "delivery-1", title: "New message", isRead: false };

    handleNotificationNew(queryClient, notification, "student-a");
    handleNotificationNew(queryClient, notification, "student-a");

    expect(queryClient.getQueryData(["notifications", "student-a", "unreadCount"])).toEqual({ count: 5 });
    expect(queryClient.getQueryData(["notifications", "student-b", "unreadCount"])).toEqual({ count: 2 });
    expect(queryClient.getQueryData(["notifications", "student-a", "all", 1]).notifications)
      .toHaveLength(1);
  });

  it("decrements only when a cached unread notification becomes read", () => {
    const queryClient = createQueryClient([
      [["notifications", "student-a", "unreadCount"], { count: 1 }],
      [["notifications", "student-a", "all", 1], {
        notifications: [{ _id: "delivery-1", deliveryId: "delivery-1", isRead: false }],
      }],
    ]);
    const event = { _id: "delivery-1", readAt: "2026-01-01T00:00:00.000Z" };

    handleNotificationRead(queryClient, event, "student-a");
    handleNotificationRead(queryClient, event, "student-a");

    expect(queryClient.getQueryData(["notifications", "student-a", "unreadCount"])).toEqual({ count: 0 });
  });

  it("accepts exact count refreshes from the server", () => {
    const queryClient = createQueryClient();

    handleNotificationUnreadCount(queryClient, { count: 0 }, "student-a");

    expect(queryClient.getQueryData(["notifications", "student-a", "unreadCount"])).toEqual({ count: 0 });
  });
});
