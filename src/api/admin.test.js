import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./client", () => ({ default: mocks }));

const { fetchSeatReservation, unwrapSeatReservationDetail } = await import("./admin");

describe("admin reservation detail API", () => {
  afterEach(() => vi.clearAllMocks());

  it("requests the authorized reservation detail route using the provided ID", async () => {
    mocks.get.mockResolvedValue({ data: { reservation: { _id: "reservation-1" } } });
    await fetchSeatReservation("reservation-1");
    expect(mocks.get).toHaveBeenCalledWith("/admin/seat-reservations/reservation-1");
  });

  it("unwraps the actual sendSuccess response and rejects missing reservation payloads", () => {
    const reservation = { _id: "reservation-1", status: "completed" };
    expect(unwrapSeatReservationDetail({ data: { success: true, reservation } })).toBe(reservation);
    expect(() => unwrapSeatReservationDetail({ data: { success: true } }))
      .toThrow("Reservation details are missing from the server response.");
  });
});
