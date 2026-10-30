import { describe, expect, it } from "vitest";
import { canLibrarianAccessPath, LIBRARIAN_ALLOWED_PATHS, LIBRARIAN_HOME } from "./adminAccess";

describe("librarian admin routes", () => {
  it("allows only the existing library workflows", () => {
    expect([...LIBRARIAN_ALLOWED_PATHS]).toEqual([
      "/admin/library",
      "/admin/reservations",
      "/admin/books",
      "/admin/books/borrowing",
      "/admin/books/returns",
      "/admin/seats",
      "/admin/qr-checkin",
      "/admin/library/students",
      "/admin/profile",
    ]);
    expect(canLibrarianAccessPath("/admin/user-authority")).toBe(false);
    expect(canLibrarianAccessPath("/admin/dashboard")).toBe(false);
    expect(canLibrarianAccessPath("/admin/books/categories")).toBe(false);
  });

  it("uses the QR scanner as the permitted landing page", () => {
    expect(LIBRARIAN_HOME).toBe("/admin/library");
  });
});
