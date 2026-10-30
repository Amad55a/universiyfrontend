import { describe, expect, it } from "vitest";
import { SIDEBAR_SECTIONS } from "./sidebarConfig";

const visiblePaths = (role) => SIDEBAR_SECTIONS
  .flatMap((section) => section.items)
  .filter((item) => !item.roles || item.roles.includes(role))
  .map((item) => item.path);

describe("admin sidebar role navigation", () => {
  it("limits librarian navigation to the library workflows and account/community access", () => {
    expect(visiblePaths("librarian")).toEqual([
      "/admin/library",
      "/admin/seats",
      "/admin/reservations",
      "/admin/books",
      "/admin/books/borrowing",
      "/admin/books/returns",
      "/admin/library/students",
      "/admin/qr-checkin",
      "/community",
      "/admin/profile",
    ]);
  });

  it("retains the administrator dashboard and administrative navigation", () => {
    expect(visiblePaths("admin")).toContain("/admin/dashboard");
    expect(visiblePaths("admin")).toContain("/admin/user-authority");
    expect(visiblePaths("admin")).toContain("/admin/settings");
  });
});
