import { describe, expect, it, vi } from "vitest";
import { createExamGuardProtocolUrl, openExamGuard } from "./examguardProtocol";

describe("ExamGuard protocol launch", () => {
  it("creates a deep link only for a well-formed one-time ticket", () => {
    expect(createExamGuardProtocolUrl("a".repeat(43))).toBe(
      `unicore-exam://launch?ticket=${"a".repeat(43)}`,
    );
    expect(() => createExamGuardProtocolUrl("not-a-ticket")).toThrow(/invalid launch ticket/);
  });

  it("opens the app without persisting the ticket in the website", () => {
    const openUrl = vi.fn();
    const ticket = "b".repeat(43);
    openExamGuard(ticket, openUrl);
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith(`unicore-exam://launch?ticket=${ticket}`);
  });
});
