import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import BookReader from "./bookreader";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pdf: {
    numPages: 1,
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
  default: () => <section aria-label="Library Tutor" />,
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

  it("keeps reader navigation, zoom, and AI access available in the compact toolbar", async () => {
    const { container } = render(<BookReader />);

    expect(await screen.findByRole("button", { name: "Go back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit page to width" })).toBeInTheDocument();

    fireEvent.click(container.querySelector(".reader-mobile-ai-button"));
    expect(screen.getByRole("region", { name: "Library Tutor" })).toBeInTheDocument();
    expect(container.querySelector(".reader-ai-panel-open")).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-label="Close AI tutor"]').length).toBeGreaterThan(0);

    const readerStyles = document.querySelector(".book-reader style").textContent;
    expect(readerStyles).toContain("@media (max-width: 900px)");
    expect(readerStyles).toContain("reader-bottom-toolbar");
  });
});
