import { afterEach, describe, expect, it, vi } from "vitest";
import api from "./client";

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
});
