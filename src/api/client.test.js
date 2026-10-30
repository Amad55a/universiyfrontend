import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import api, { setAccessToken } from "./client";
import { createReservation, getTodayReservations } from "./reservation";

const originalAdapter = api.defaults.adapter;
const originalAxiosAdapter = axios.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  axios.defaults.adapter = originalAxiosAdapter;
  setAccessToken(null);
  window.sessionStorage.removeItem("unicores-seb-launch-token:507f1f77bcf86cd799439011");
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

  it("adds the student-specific SEB launch selector only to that exam's API requests", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;
    window.sessionStorage.setItem(
      "unicores-seb-launch-token:507f1f77bcf86cd799439011",
      "a".repeat(43),
    );

    await api.get("/exams/student/507f1f77bcf86cd799439011/start");
    await api.get("/exams/student/507f1f77bcf86cd799439012/start");
    await api.get("/auth/me");

    expect(adapter.mock.calls[0][0].headers["X-UniCORE-SEB-Launch-Token"]).toBe("a".repeat(43));
    expect(adapter.mock.calls[1][0].headers["X-UniCORE-SEB-Launch-Token"]).toBeUndefined();
    expect(adapter.mock.calls[2][0].headers["X-UniCORE-SEB-Launch-Token"]).toBeUndefined();
  });

  it("routes exam API requests through the frontend origin for SEB request headers", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    api.defaults.adapter = adapter;
    window.sessionStorage.setItem(
      "unicores-seb-launch-token:507f1f77bcf86cd799439011",
      "a".repeat(43),
    );

    await api.get(
      "https://api.example.test/api/v1/exams/student/507f1f77bcf86cd799439011/start",
    );

    expect(adapter.mock.calls[0][0].url).toBe(
      "/api/v1/exams/student/507f1f77bcf86cd799439011/start",
    );
    expect(adapter.mock.calls[0][0].baseURL).toBe("");
    expect(adapter.mock.calls[0][0].headers["X-UniCORE-SEB-Launch-Token"]).toBe("a".repeat(43));
  });

  it("routes exam session requests made through shared axios through the frontend origin", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    axios.defaults.adapter = adapter;
    window.sessionStorage.setItem(
      "unicores-seb-launch-token:507f1f77bcf86cd799439011",
      "a".repeat(43),
    );

    await axios.get("/api/exams/student/507f1f77bcf86cd799439011/start");

    expect(adapter.mock.calls[0][0].url).toBe(
      "/api/exams/student/507f1f77bcf86cd799439011/start",
    );
    expect(adapter.mock.calls[0][0].baseURL).toBe("");
    expect(adapter.mock.calls[0][0].headers["X-UniCORE-SEB-Launch-Token"]).toBe("a".repeat(43));
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

  it("shares one refresh operation across concurrent expired requests", async () => {
    let refreshAttempts = 0;
    const protectedAttempts = new Map();
    const adapter = vi.fn(async (config) => {
      if (config.url === "/api/v1/auth/refresh-token") {
        refreshAttempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
        return {
          data: { data: { accessToken: "shared-refreshed-token" } },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      const resource = config.url;
      const attempts = (protectedAttempts.get(resource) || 0) + 1;
      protectedAttempts.set(resource, attempts);
      if (attempts === 1) {
        return Promise.reject({ config, response: { status: 401, config } });
      }

      return { data: { resource }, status: 200, statusText: "OK", headers: {}, config };
    });
    api.defaults.adapter = adapter;

    const responses = await Promise.all([
      api.get("/private/one"),
      api.get("/private/two"),
    ]);

    expect(responses.map(({ data }) => data.resource)).toEqual([
      "/api/v1/private/one",
      "/api/v1/private/two",
    ]);
    expect(refreshAttempts).toBe(1);
    expect([...protectedAttempts.values()]).toEqual([2, 2]);
  });

  it("does not retry protected requests when refresh returns no access token", async () => {
    let protectedAttempts = 0;
    let refreshAttempts = 0;
    const adapter = vi.fn(async (config) => {
      if (config.url === "/api/v1/auth/refresh-token") {
        refreshAttempts += 1;
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      }

      protectedAttempts += 1;
      return Promise.reject({ config, response: { status: 401, config } });
    });
    api.defaults.adapter = adapter;

    await expect(api.get("/private/resource")).rejects.toThrow(
      "Session refresh returned no access token."
    );

    expect(refreshAttempts).toBe(1);
    expect(protectedAttempts).toBe(1);
  });

  it("does not retry an expired session after the refresh cookie is rejected", async () => {
    let protectedAttempts = 0;
    let refreshAttempts = 0;
    const adapter = vi.fn(async (config) => {
      if (config.url === "/api/v1/auth/refresh-token") {
        refreshAttempts += 1;
        return Promise.reject({ config, response: { status: 401, config } });
      }

      protectedAttempts += 1;
      return Promise.reject({ config, response: { status: 401, config } });
    });
    api.defaults.adapter = adapter;

    await expect(api.get("/private/resource")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshAttempts).toBe(1);
    expect(protectedAttempts).toBe(1);
  });
});
