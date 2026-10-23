import { describe, expect, it } from "vitest";
import { normalizeAdminSearchResponse } from "./adminSearch";

describe("normalizeAdminSearchResponse", () => {
  it("preserves valid groups and omits missing, null, and empty groups", () => {
    expect(normalizeAdminSearchResponse({
      categories: [
        { name: "Books", items: [{ id: "1", label: "Data Systems", href: "/admin/books" }] },
        { name: "Students", items: null },
        null,
        { name: "Teachers", items: [] },
      ],
    })).toEqual({
      categories: [
        { name: "Books", items: [{ id: "1", label: "Data Systems", href: "/admin/books" }] },
      ],
    });
  });

  it("normalizes an empty successful result", () => {
    expect(normalizeAdminSearchResponse({ categories: [] })).toEqual({ categories: [] });
  });

  it.each([null, undefined, {}, { categories: null }])("rejects malformed response data: %s", (data) => {
    expect(() => normalizeAdminSearchResponse(data)).toThrow("Invalid admin search response");
  });
});
