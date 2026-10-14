import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());
vi.mock("../api", () => ({ api: apiMock }));

import { useDesigns } from "./use-designs";

describe("useDesigns", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockImplementation(async (method: string, path: string) => {
      if (method === "GET" && path === "/api/designs") return [];
      if (method === "GET" && path === "/api/templates") return [];
      if (method === "POST" && path === "/api/designs") {
        return { id: "design-1", name: "Untitled", pages: [{ id: "page-1", canvas_json: "{}" }] };
      }
      if (method === "GET" && path === "/api/designs/design-1") {
        return { id: "design-1", name: "Saved", width: 800, height: 600, pages: [{ id: "page-1", canvas_json: '{"objects":[]}' }] };
      }
      if (method === "PUT" && path === "/api/pages/page-1") return { id: "page-1" };
      if (method === "PUT" && path === "/api/designs/design-1") return { id: "design-1", name: "Saved" };
      throw new Error(`Unexpected API request: ${method} ${path}`);
    });
  });

  it("creates the first page immediately so the editor can mount a canvas", async () => {
    const { result } = renderHook(() => useDesigns(() => "{}"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.createDesign(); });
    expect(result.current.activeDesign?.id).toBe("design-1");
    expect(result.current.pages[0]?.id).toBe("page-1");
    expect(result.current.activePageId).toBe("page-1");
  });

  it("restores saved pages and persists canvas JSON", async () => {
    const { result } = renderHook(() => useDesigns((id) => id === "page-1" ? '{"objects":[{"type":"rect"}]}' : "{}"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.loadDesign("design-1"); });
    expect(result.current.pages[0]?.canvas_json).toBe('{"objects":[]}');
    await act(async () => { await result.current.saveDesign({ width: 1080, height: 1080 }); });
    expect(apiMock).toHaveBeenCalledWith("PUT", "/api/pages/page-1", {
      canvas_json: '{"objects":[{"type":"rect"}]}',
    });
    expect(apiMock).toHaveBeenCalledWith("PUT", "/api/designs/design-1", {
      canvas_json: '{"objects":[{"type":"rect"}]}',
      width: 1080,
      height: 1080,
    });
  });
});
