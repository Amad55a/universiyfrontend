import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import BookReader from "./bookreader";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pdf: {
    numPages: 3,
    getOutline: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue({
      getViewport: () => ({ width: 612 }),
    }),
  },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "test-book" }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));
vi.mock("@/api/client", () => ({
  default: { defaults: { baseURL: "/api/v1" }, post: vi.fn() },
  getAccessToken: () => null,
}));
vi.mock("@/api/books", () => ({
  getBookReadUrl: () => "/api/v1/books/test-book/read",
  shouldRefreshBookPdfSession: () => false,
}));
vi.mock("react-pdf", async () => {
  const ReactModule = await import("react");
  const Document = ({ children, onLoadSuccess }) => {
    ReactModule.useEffect(() => {
      onLoadSuccess(mocks.pdf);
    }, [onLoadSuccess]);
    return <div data-testid="pdf-document">{children}</div>;
  };
  return {
    Document,
    Page: ({ scale }) => <div data-testid="pdf-page" data-scale={scale} />,
    pdfjs: { GlobalWorkerOptions: {} },
  };
});
vi.mock("@/hooks/usee-library", () => ({
  useBookReader: () => ({
    savedProgress: null,
    saveProgress: vi.fn(),
    bookmarks: [],
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  }),
  useNotes: () => ({
    notes: {},
    saveNote: vi.fn(),
    deleteNote: vi.fn(),
  }),
}));
vi.mock("@/hooks/useUniversityVerification", () => ({
  useUniversityVerification: () => ({
    universityId: "TEST-1",
    fullName: "Reader Test",
  }),
}));
vi.mock("./AiPanel", () => ({
  default: ({ showMobileClose, onClose }) => (
    <section aria-label="Library Tutor">
      <textarea aria-label="Ask the library tutor" />
      {showMobileClose && (
        <button type="button" aria-label="Close AI tutor" onClick={onClose}>Close</button>
      )}
    </section>
  ),
}));

describe("BookReader responsive controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuery.mockReturnValue({
      data: { title: "Test book", author: "Test author" },
      isLoading: false,
      error: null,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
    });
    Object.defineProperty(window, "outerWidth", { configurable: true, value: window.innerWidth });
    Object.defineProperty(window, "outerHeight", { configurable: true, value: window.innerHeight });
  });

  it("keeps progress and one AI entry point in the mobile toolbar while hiding desktop controls", async () => {
    const { container } = render(<BookReader />);

    expect(await screen.findByRole("button", { name: "Go back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit page to width" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toHaveAttribute("aria-valuenow", "33");

    fireEvent.click(container.querySelector(".reader-mobile-ai-button"));
    expect(screen.getByRole("region", { name: "Library Tutor" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask the library tutor" })).toBeInTheDocument();
    expect(container.querySelector(".reader-ai-panel-open")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Library Tutor" })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-label="Close AI tutor"]').length).toBeGreaterThan(0);
    expect(container.querySelector(".reader-bottom-toolbar")).toHaveClass("reader-bottom-toolbar-ai-open");
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toBeInTheDocument();
    const readerStyles = document.querySelector(".book-reader style").textContent;
    expect(readerStyles).toMatch(
      /\.reader-zoom-controls,\s*\.reader-page-controls,\s*\.reader-keyboard-hint\s*\{\s*display: none !important;/
    );
    expect(readerStyles).toContain("@media (max-width: 900px)");
    expect(readerStyles).toContain("padding: 64px 8px 16px !important");
    expect(readerStyles).toContain("touch-action: pan-y pinch-zoom");
    expect(readerStyles).toMatch(/\.reader-progress-controls\s*\{\s*order: 0;\s*justify-self: start;/);
    expect(readerStyles).toMatch(/\.reader-mobile-ai-button\s*\{[^}]*margin-left: auto;/);
    expect(readerStyles).toContain("width: 44px !important");
    expect(readerStyles).toContain("safe-area-inset-bottom");
    expect(readerStyles).toContain("inset: env(safe-area-inset-top) 0 0 auto !important");
    expect(readerStyles).toContain(".library-tutor-panel > div:last-of-type");
    expect(readerStyles).toContain("padding-bottom: calc(12px + env(safe-area-inset-bottom))");
    expect(readerStyles).toMatch(
      /\.reader-bottom-toolbar\.reader-bottom-toolbar-ai-open\s*\{\s*display: none !important;\s*height: 0 !important;\s*min-height: 0 !important;\s*padding: 0 !important;\s*border: 0 !important;\s*background: transparent !important;/
    );
    expect(readerStyles).toContain(".reader-bottom-toolbar-ai-open");
    expect(readerStyles).toContain("max-width: 100%");
    expect(container.querySelector(".reader-bottom-toolbar")).toContainElement(
      screen.getByRole("progressbar", { name: "Reading progress" })
    );
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
  });

  it("updates page and progress indicators when navigating", async () => {
    render(<BookReader />);

    const currentPage = await screen.findByRole("spinbutton", { name: "Current page" });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(currentPage).toHaveValue(2);
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toHaveAttribute("aria-valuenow", "67");
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toHaveAttribute("aria-valuetext", "Page 2 of 3, 67%");
  });

  it("preserves the current page while opening and closing the AI drawer", async () => {
    const { container } = render(<BookReader />);
    const currentPage = await screen.findByRole("spinbutton", { name: "Current page" });

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(document.querySelector(".reader-mobile-ai-button"));
    expect(screen.getByRole("dialog", { name: "Library Tutor" })).toBeInTheDocument();
    expect(currentPage).toHaveValue(2);

    fireEvent.click(container.querySelector(".reader-mobile-ai-close"));
    expect(screen.queryByRole("dialog", { name: "Library Tutor" })).not.toBeInTheDocument();
    expect(currentPage).toHaveValue(2);
    expect(container.querySelector(".reader-bottom-toolbar")).not.toHaveClass("reader-bottom-toolbar-ai-open");
    expect(container.querySelector(".reader-bottom-toolbar")).toContainElement(
      screen.getByRole("progressbar", { name: "Reading progress" })
    );

    fireEvent.click(container.querySelector(".reader-mobile-ai-button"));
    expect(container.querySelector(".reader-bottom-toolbar")).toHaveClass("reader-bottom-toolbar-ai-open");
    fireEvent.click(container.querySelector(".reader-mobile-ai-close"));
    expect(container.querySelector(".reader-bottom-toolbar")).not.toHaveClass("reader-bottom-toolbar-ai-open");
    expect(currentPage).toHaveValue(2);
  });

  it("does not turn the book page for a swipe performed inside the AI drawer", async () => {
    const { container } = render(<BookReader />);
    const currentPage = await screen.findByRole("spinbutton", { name: "Current page" });
    fireEvent.click(container.querySelector(".reader-mobile-ai-button"));
    const drawer = screen.getByRole("dialog", { name: "Library Tutor" });

    fireEvent.touchStart(drawer, {
      touches: [{ identifier: 1, clientX: 220, clientY: 120 }],
    });
    fireEvent.touchEnd(drawer, {
      changedTouches: [{ identifier: 1, clientX: 150, clientY: 126 }],
    });

    expect(currentPage).toHaveValue(1);
    expect(container.querySelector(".reader-pdf-container")).toBeInTheDocument();
  });

  it("turns pages on horizontal swipes but leaves vertical scrolling alone", async () => {
    const { container } = render(<BookReader />);
    const reader = container.querySelector(".reader-pdf-container");
    const currentPage = container.querySelector(".reader-page-number input");

    await screen.findByTestId("pdf-document");
    fireEvent.touchStart(reader, {
      touches: [{ identifier: 1, clientX: 220, clientY: 120 }],
    });
    fireEvent.touchEnd(reader, {
      changedTouches: [{ identifier: 1, clientX: 150, clientY: 126 }],
    });
    expect(currentPage).toHaveValue(2);

    fireEvent.touchStart(reader, {
      touches: [{ identifier: 1, clientX: 150, clientY: 120 }],
    });
    fireEvent.touchEnd(reader, {
      changedTouches: [{ identifier: 1, clientX: 155, clientY: 60 }],
    });
    expect(currentPage).toHaveValue(2);
  });

  it("keeps native pinch zoom enabled and ignores multi-touch as a page-turn swipe", async () => {
    const { container } = render(<BookReader />);
    const reader = container.querySelector(".reader-pdf-container");
    const currentPage = await screen.findByRole("spinbutton", { name: "Current page" });

    fireEvent.touchStart(reader, {
      touches: [
        { identifier: 1, clientX: 150, clientY: 120 },
        { identifier: 2, clientX: 240, clientY: 120 },
      ],
    });
    fireEvent.touchMove(reader, {
      touches: [
        { identifier: 1, clientX: 130, clientY: 120 },
        { identifier: 2, clientX: 260, clientY: 120 },
      ],
    });
    fireEvent.touchEnd(reader, {
      changedTouches: [{ identifier: 1, clientX: 130, clientY: 120 }],
    });

    expect(currentPage).toHaveValue(1);
    expect(document.querySelector(".book-reader style").textContent).toContain("touch-action: pan-y pinch-zoom");
  });

  it("does not pause reading when responsive mobile viewport testing changes the window dimensions", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "outerWidth", { configurable: true, value: 1400 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "outerHeight", { configurable: true, value: 1100 });

    render(<BookReader />);

    expect(await screen.findByRole("button", { name: "Go back" })).toBeInTheDocument();
    expect(screen.queryByText("Developer tools detected. Reading has been paused to protect copyrighted content."))
      .not.toBeInTheDocument();
  });
});
