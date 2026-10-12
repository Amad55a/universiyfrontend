import { describe, expect, it } from "vitest";
import { detectExamGuardPlatform } from "./examguardPlatform";

describe("ExamGuard platform detection", () => {
  it.each([
    [{ platform: "Win32" }, "windows"],
    [{ userAgentData: { platform: "macOS" } }, "macos"],
    [{ platform: "Linux x86_64" }, "linux"],
    [{ platform: "Unknown" }, null],
  ])("detects %s as %s", (navigatorValue, expected) => {
    expect(detectExamGuardPlatform(navigatorValue)).toBe(expected);
  });
});
