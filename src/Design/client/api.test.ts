import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getDesignRequestErrorMessage } from "./api";
import apiClient from "../../api/client";

vi.mock("../../api/client", () => ({
  default: { request: vi.fn() },
}));

const mockedRequest = vi.mocked(apiClient.request);

describe("Design API client", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("uses the configured application API client for cross-origin requests", async () => {
    mockedRequest.mockResolvedValue({ data: { designs: [] } });

    await expect(api("GET", "/api/designs")).resolves.toEqual({ designs: [] });
    expect(mockedRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/designs",
      data: undefined,
      timeout: 15000,
    });
  });

  it("maps auth, not-found, service, timeout and network failures safely", () => {
    expect(getDesignRequestErrorMessage({ response: { status: 401 } }))
      .toContain("session has expired");
    expect(getDesignRequestErrorMessage({ response: { status: 403 } }))
      .toContain("do not have permission");
    expect(getDesignRequestErrorMessage({ response: { status: 404 } }))
      .toContain("could not be found");
    expect(getDesignRequestErrorMessage({
      response: { status: 500, data: { message: "database password leaked" } },
    })).toBe("The design service is temporarily unavailable. Please try again.");
    expect(getDesignRequestErrorMessage({ code: "ETIMEDOUT" }))
      .toContain("timed out");
    expect(getDesignRequestErrorMessage(new Error("network error")))
      .toContain("Could not connect");
  });
});
