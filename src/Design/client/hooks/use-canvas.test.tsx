import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fabric from "fabric";

const fabricMocks = vi.hoisted(() => ({
  createdTextboxes: [] as Array<{
    text: string;
    options: Record<string, unknown>;
    hiddenTextareaContainer: HTMLElement | null;
    isEditing: boolean;
    enterEditing: ReturnType<typeof vi.fn>;
    selectAll: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("fabric", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fabric")>();
  class TextboxMock {
    text: string;
    options: Record<string, unknown>;
    hiddenTextareaContainer: HTMLElement | null = null;
    isEditing = false;
    enterEditing = vi.fn(() => { this.isEditing = true; });
    selectAll = vi.fn();

    constructor(text: string, options: Record<string, unknown>) {
      this.text = text;
      this.options = options;
      fabricMocks.createdTextboxes.push(this);
    }
  }
  return { ...actual, Textbox: TextboxMock };
});

import { useCanvasState } from "./use-canvas";

function createCanvasStub() {
  const handlers = new Map<string, Array<(event?: { target?: unknown }) => void>>();
  const canvasElement = document.createElement("div");
  const objects: Array<{ text?: string; options?: Record<string, unknown> }> = [];
  const canvas = {
    wrapperEl: canvasElement,
    on: vi.fn((event: string, handler: (event?: { target?: unknown }) => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    add: vi.fn((object: { text?: string; options?: Record<string, unknown> }) => {
      objects.push(object);
      handlers.get("object:added")?.forEach((handler) => handler({ target: object }));
    }),
    setActiveObject: vi.fn(),
    getActiveObject: vi.fn(() => objects[objects.length - 1]),
    requestRenderAll: vi.fn(),
    toJSON: vi.fn(() => ({ objects: objects.map(({ text, options }) => ({ text, ...options })) })),
    fire: (event: string, payload?: { target?: unknown }) => {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
  return { canvas, objects };
}

describe("Design Lab text editing", () => {
  beforeEach(() => {
    fabricMocks.createdTextboxes.length = 0;
  });

  it("creates visible text and starts editing within the canvas fullscreen subtree", () => {
    const { result } = renderHook(() => useCanvasState());
    const { canvas } = createCanvasStub();

    act(() => {
      result.current.registerCanvas("page-1", canvas as never);
      result.current.setActiveCanvas("page-1");
      result.current.addText("heading");
    });

    const text = fabricMocks.createdTextboxes[0];
    expect(text.text).toBe("Add a heading");
    expect(text.options.fill).toBe("#1f2937");
    expect(text.options.editable).toBe(true);
    expect(text.hiddenTextareaContainer).toBe(canvas.wrapperEl);
    expect(text.enterEditing).toHaveBeenCalledOnce();
    expect(text.selectAll).toHaveBeenCalledOnce();
    expect(canvas.setActiveObject).toHaveBeenCalledWith(text);
  });

  it("tracks typed edits for autosave and retains the text when a page canvas is unregistered", () => {
    const { result } = renderHook(() => useCanvasState());
    const { canvas, objects } = createCanvasStub();

    act(() => {
      result.current.registerCanvas("page-1", canvas as never);
      result.current.setActiveCanvas("page-1");
      result.current.addText("body");
    });

    act(() => {
      objects[0].text = "Poster title";
      canvas.fire("text:changed", { target: objects[0] });
    });

    expect(result.current.lastModified).toBeGreaterThan(0);
    expect(result.current.getCanvasJSONForPage("page-1")).toContain("Poster title");

    act(() => result.current.unregisterCanvas("page-1"));
    expect(result.current.getCanvasJSONForPage("page-1")).toContain("Poster title");
  });

  it("waits for required image assets before allowing exam submission", async () => {
    const { result } = renderHook(() => useCanvasState());
    const { canvas } = createCanvasStub();
    act(() => {
      result.current.registerCanvas("page-1", canvas as never);
      result.current.setActiveCanvas("page-1");
    });

    let resolveImage!: (image: { width: number; height: number; set: () => void }) => void;
    const imagePromise = new Promise((resolve) => { resolveImage = resolve; });
    const imageSpy = vi.spyOn(fabric.FabricImage, "fromURL").mockReturnValue(imagePromise as never);
    const addImagePromise = result.current.addImage("https://res.cloudinary.com/example/image.png");
    let flushComplete = false;
    const flushPromise = result.current.flushPendingAssets().then(() => { flushComplete = true; });
    await Promise.resolve();
    expect(flushComplete).toBe(false);

    const image = { width: 100, height: 100, set: vi.fn() };
    await act(async () => {
      resolveImage(image);
      await addImagePromise;
      await flushPromise;
    });

    expect(imageSpy).toHaveBeenCalledWith(
      "https://res.cloudinary.com/example/image.png",
      { crossOrigin: "anonymous" },
    );
    expect(canvas.add).toHaveBeenCalledWith(image);
    expect(flushComplete).toBe(true);
    imageSpy.mockRestore();
  });

  it("blocks submission preparation after a required image fails until retry succeeds", async () => {
    const { result } = renderHook(() => useCanvasState());
    const { canvas } = createCanvasStub();
    act(() => {
      result.current.registerCanvas("page-1", canvas as never);
      result.current.setActiveCanvas("page-1");
    });
    const imageSpy = vi.spyOn(fabric.FabricImage, "fromURL")
      .mockRejectedValueOnce(new Error("resource unavailable"))
      .mockResolvedValueOnce({ width: 100, height: 100, set: vi.fn() } as never);

    await act(async () => {
      await result.current.addImage("https://res.cloudinary.com/example/retry.png");
    });
    await expect(result.current.flushPendingAssets()).rejects.toThrow(/Retry loading the image/);

    await act(async () => {
      await result.current.addImage("https://res.cloudinary.com/example/retry.png");
      await result.current.flushPendingAssets();
    });
    expect(canvas.add).toHaveBeenCalledOnce();
    imageSpy.mockRestore();
  });
});
