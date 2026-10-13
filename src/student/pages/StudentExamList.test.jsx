import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import StudentExamList from "./StudentExamList";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn() },
}));

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentExamList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student dashboard exam list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows exam schedule, duration, status, and a details route", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          exams: [{
            id: "507f1f77bcf86cd799439011",
            title: "Midterm",
            availableFrom: "2026-10-12T18:00:00.000Z",
            duration: 45,
            status: "available",
          }],
        },
      },
    });
    renderList();
    expect(await screen.findByRole("link", { name: "Midterm" })).toHaveAttribute(
      "href",
      "/exams/507f1f77bcf86cd799439011",
    );
    const examRow = screen.getByRole("link", { name: "Midterm" }).closest("li");
    expect(examRow).toHaveClass("bg-white", "text-gray-900", "dark:bg-zinc-900", "dark:text-zinc-100");
    expect(examRow).toHaveClass("hover:bg-indigo-50", "focus-within:ring-2");
    expect(screen.getByText("45 minutes")).toBeInTheDocument();
    expect(screen.getByText("available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details" })).toHaveClass("focus-visible:ring-2", "active:bg-indigo-100");
  });

  it("reports when there are no enrolled exams", async () => {
    api.get.mockResolvedValueOnce({ data: { data: { exams: [] } } });
    renderList();
    expect(await screen.findByText(/No upcoming or available exams/)).toBeInTheDocument();
  });
});
