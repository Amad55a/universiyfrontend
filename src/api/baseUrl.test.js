import { describe, expect, it } from "vitest";
import { buildGoogleAuthUrl, resolveApiBaseUrl, resolveApiOrigin } from "./baseUrl";

describe("API base URL configuration", () => {
  it("uses the configured localhost backend in development", () => {
    const apiUrl = resolveApiBaseUrl("http://localhost:8080/api/v1");

    expect(apiUrl).toBe("http://localhost:8080/api/v1");
    expect(buildGoogleAuthUrl(apiUrl)).toBe(
      "http://localhost:8080/api/v1/auth/google"
    );
  });

  it("preserves the configured production API without replacing it with a development URL", () => {
    const apiUrl = resolveApiBaseUrl("https://api.unicores.tech");

    expect(apiUrl).toBe("https://api.unicores.tech/api/v1");
    expect(buildGoogleAuthUrl(apiUrl)).toBe(
      "https://api.unicores.tech/api/v1/auth/google"
    );
  });

  it("keeps relative API paths available for same-origin development proxying", () => {
    expect(resolveApiBaseUrl("/api/v1")).toBe("/api/v1");
    expect(resolveApiOrigin("/api/v1")).toBe("");
  });

  it("derives the API origin for legacy Axios calls without duplicating API prefixes", () => {
    expect(resolveApiOrigin("http://localhost:8080/api/v1")).toBe(
      "http://localhost:8080"
    );
    expect(resolveApiOrigin("https://api.unicores.tech/api/v1")).toBe(
      "https://api.unicores.tech"
    );
  });
});
