import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./client";
import {
  cancelReservation,
  createReservation,
  extendReservation,
  getReservationMeta,
  getSeatBookedSlots,
  getTodayReservations,
  rescheduleReservation,
} from "./reservation";

vi.mock("./client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("reservation API paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { reservation: {} } });
    api.patch.mockResolvedValue({ data: {} });
  });

  it("creates reservations through the single-prefix route", async () => {
    const payload = { seatId: "seat-1", slotIndex: 2, durationSlots: 2 };

    await createReservation(payload);

    expect(api.post).toHaveBeenCalledWith("/reservations/createReserve", payload);
  });

  it("keeps list, metadata, seat, cancel, extend, and reschedule requests separate", async () => {
    await getTodayReservations();
    await getReservationMeta();
    await getSeatBookedSlots("seat-1");
    await cancelReservation("reservation-1");
    await extendReservation("reservation-1", 30);
    await rescheduleReservation("reservation-1", { slotIndex: 4, durationSlots: 2 });

    expect(api.get.mock.calls).toEqual([
      ["/reservations/today"],
      ["/reservations/meta"],
      ["/reservations/seat/seat-1/slots"],
    ]);
    expect(api.patch.mock.calls).toEqual([
      ["/reservations/reservation-1/cancel"],
      ["/reservations/reservation-1/extend", { extensionMinutes: 30 }],
      ["/reservations/reservation-1/reschedule", { slotIndex: 4, durationSlots: 2 }],
    ]);
  });
});
