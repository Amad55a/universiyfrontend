import { describe, expect, it } from "vitest";
import { getBookReadUrl, shouldRefreshBookPdfSession } from "./books";

describe("getBookReadUrl", () => {
  it("builds the backend-mounted path for local and production API bases", () => {
    expect(getBookReadUrl("book-id", "/api/v1/")).toBe(
      "/api/v1/books/book-id/read"
    );
    expect(getBookReadUrl("book-id", "https://api.unicores.tech/api/v1")).toBe(
      "https://api.unicores.tech/api/v1/books/book-id/read"
    );
  });

  describe("shouldRefreshBookPdfSession", () => {
    it("refreshes the session once for an application 401", () => {
      expect(shouldRefreshBookPdfSession({ status: 401 }, 0)).toBe(true);
      expect(shouldRefreshBookPdfSession({ status: 401 }, 1)).toBe(false);
    });

    it("does not refresh for non-authentication PDF failures", () => {
      expect(shouldRefreshBookPdfSession({ status: 502 }, 0)).toBe(false);
      expect(shouldRefreshBookPdfSession({ status: 404 }, 0)).toBe(false);
    });
  });

  it("encodes the book identifier as one URL path segment", () => {
    expect(getBookReadUrl("book/id", "/api/v1")).toBe(
      "/api/v1/books/book%2Fid/read"
    );
  });

  it.each([undefined, null, "", "   ", "undefined", "null", " undefined "])(
    "does not build a malformed URL for a missing identifier (%s)",
    (bookId) => {
      expect(getBookReadUrl(bookId)).toBeNull();
    }
  );
});
