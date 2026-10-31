import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  isSebExamSession: vi.fn(() => true),
  setAccessToken: vi.fn(),
}));

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.clearAllMocks();
});

function AuthStateProbe() {
  const { loading, user } = useAuth();
  return <div>{loading ? "loading" : user ? "authenticated" : "anonymous"}</div>;
}

describe("SEB exam authentication bootstrap", () => {
  it.each([
    "/exam-session/exam-1?sebLaunchToken=one-time-handoff",
    "/exam-session/exam-1?sebSession=1",
    "/exam-session/exam-1?sebQuit=opaque",
  ])("does not request normal browser authentication at %s", async (path) => {
    window.history.replaceState({}, "", path);
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
