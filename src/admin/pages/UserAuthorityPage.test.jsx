import { describe, expect, it } from "vitest";
import { createPermissionOverridePatch, getCurrentStatus } from "./userAuthorityHelpers";

describe("user authority permission updates", () => {
  it("sends only changed override values and never clears unrelated permissions", () => {
    const patch = createPermissionOverridePatch(
      { "book.borrow": false, "exam.take": true },
      { "exam.take": true, "reservation.create": false },
      ["book.borrow", "exam.take", "reservation.create"],
    );

    expect(patch).toEqual({
      "book.borrow": null,
      "reservation.create": false,
    });
    expect(patch).not.toHaveProperty("exam.take");
  });

  it("does not claim an unknown activation state is active", () => {
    expect(getCurrentStatus({})).toBe("unknown");
    expect(getCurrentStatus({ isActive: false })).toBe("suspended");
    expect(getCurrentStatus({ accountStatus: "banned", isActive: true })).toBe("banned");
  });
});
