import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import StudentExamPortal from "./StudentExamPortal";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn() },
}));

function renderPortal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentExamPortal />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("browser-based student exam portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists available exams and links to their detail and launch page", async () => {
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
    renderPortal();

    expect(await screen.findByRole("heading", { name: "University Exam Portal" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Midterm" })).toHaveAttribute(
      "href",
      "/exams/507f1f77bcf86cd799439011",
    );
    expect(api.get).toHaveBeenCalledWith("/exams/student");
    expect(screen.getByText(/start or resume your browser session/)).toBeInTheDocument();
  });

  it("can refresh the exam list and reports empty and error states", async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: { exams: [] } } })
      .mockRejectedValueOnce({ response: { data: { message: "Connection unavailable." } } });
    renderPortal();
    expect(await screen.findByText(/No upcoming or available exams/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh exams" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection unavailable.");
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
