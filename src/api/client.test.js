import { afterEach, describe, expect, it, vi } from "vitest";
import api from "./client";
import { createReservation, getTodayReservations } from "./reservation";

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe("api client URL normalization", () => {
  it("does not apply a relative API base URL twice", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;

    await api.post("/auth/reset-password", {});

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe("/api/v1/auth/reset-password");
    expect(adapter.mock.calls[0][0].baseURL).toBe("");
  });

  it("preserves absolute API base URLs", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;

    await api.post(
      "/auth/reset-password",
      {},
      { baseURL: "https://api.example.test/api/v1" }
    );

    expect(adapter.mock.calls[0][0].url).toBe(
      "https://api.example.test/api/v1/auth/reset-password"
    );
  });

  it("sends booking and today's-reservations requests with one API prefix", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;

    await createReservation({
      seatId: "seat-1",
      slotIndex: 2,
      durationSlots: 2,
    });
    await getTodayReservations();

    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      "/api/v1/reservations/createReserve",
      "/api/v1/reservations/today",
    ]);
  });

  it("removes a legacy API prefix when the shared client already supplies it", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;

    await api.post("/api/v1/reservations/createReserve", {});

    expect(adapter.mock.calls[0][0].url).toBe("/api/v1/reservations/createReserve");
  });
});
