import { describe, expect, it } from "vitest";
import { getBookReadUrl } from "./books";

describe("getBookReadUrl", () => {
  it("builds the backend-mounted path for local and production API bases", () => {
    expect(getBookReadUrl("book-id", "/api/v1/")).toBe(
      "/api/v1/books/book-id/read"
    );
    expect(getBookReadUrl("book-id", "https://api.unicores.tech/api/v1")).toBe(
      "https://api.unicores.tech/api/v1/books/book-id/read"
    );
  });

  it("encodes the book identifier as one URL path segment", () => {
    expect(getBookReadUrl("book/id", "/api/v1")).toBe(
      "/api/v1/books/book%2Fid/read"
    );
  });
});
