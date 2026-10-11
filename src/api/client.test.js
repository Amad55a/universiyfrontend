import { afterEach, describe, expect, it, vi } from "vitest";
import api, { setAccessToken } from "./client";
import { createReservation, getTodayReservations } from "./reservation";

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  setAccessToken(null);
});

describe("api client URL normalization", () => {
  it("sends credentialed requests through the configured API client", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;

    await api.get("/auth/me");

    expect(adapter.mock.calls[0][0].withCredentials).toBe(true);
  });

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

  it("refreshes an expired authenticated request once using the refresh cookie", async () => {
    let protectedAttempts = 0;
    const adapter = vi.fn(async (config) => {
      if (config.url === "/api/v1/auth/refresh-token") {
        return {
          data: { data: { accessToken: "refreshed-access-token" } },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      protectedAttempts += 1;
      if (protectedAttempts === 1) {
        return Promise.reject({
          config,
          response: { status: 401, config },
        });
      }

      return {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    });
    api.defaults.adapter = adapter;

    const response = await api.get("/private/resource");

    expect(response.data).toEqual({ success: true });
    expect(protectedAttempts).toBe(2);
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      "/api/v1/private/resource",
      "/api/v1/auth/refresh-token",
      "/api/v1/private/resource",
    ]);
    expect(adapter.mock.calls.every(([config]) => config.withCredentials)).toBe(true);
  });
});
