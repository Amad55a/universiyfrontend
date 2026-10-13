import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import StudentExamDetailsPage from "./StudentExamDetailsPage";
import { openExamGuard } from "./examguardProtocol";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("./examguardProtocol", () => ({ openExamGuard: vi.fn() }));

const exam = {
  id: "507f1f77bcf86cd799439011",
  title: "Midterm",
  instructions: "Read the questions carefully.",
  availableFrom: "2026-10-12T18:00:00.000Z",
  availableUntil: "2026-10-12T20:00:00.000Z",
  duration: 45,
  status: "available",
  canStart: true,
  canUseExamGuard: true,
  sebRequired: false,
  attemptStatus: null,
  security: {},
};

function renderDetails() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/exams/${exam.id}`]}>
        <Routes>
          <Route path="/exams/:examId" element={<StudentExamDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student exam details and launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: { exam } } });
  });

  it("shows exam details and does not issue a ticket until launch is clicked", async () => {
    renderDetails();
    expect(await screen.findByRole("heading", { name: "Midterm" })).toBeInTheDocument();
    expect(screen.getByText("Read the questions carefully.")).toBeInTheDocument();
    expect(screen.getByText(/45 minutes/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`/exams/student/${exam.id}/details`);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("issues the existing launch ticket only from the launch button and opens ExamGuard", async () => {
    const ticket = "a".repeat(43);
    api.post.mockResolvedValueOnce({
      data: { data: { ticket, expiresAt: new Date(Date.now() + 60_000).toISOString() } },
    });
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Open ExamGuard" }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/exams/student/${exam.id}/launch-ticket`,
        {},
        { withCredentials: true },
      );
    });
    expect(openExamGuard).toHaveBeenCalledWith(ticket);
    expect(await screen.findByLabelText("One-time ExamGuard ticket")).toHaveValue(ticket);
    expect(screen.getByText(/cannot confirm whether ExamGuard opened/i)).toBeInTheDocument();
    expect(screen.getByText(/enter this same ticket manually/i)).toBeInTheDocument();
    const informationLink = screen.getByRole("link", { name: "Open installation guide" });
    expect(informationLink).toHaveAttribute("href", `/examguard/download?examId=${exam.id}`);
  });

  it("keeps the ticket available for manual verification if the protocol launch throws", async () => {
    const ticket = "b".repeat(43);
    api.post.mockResolvedValueOnce({
      data: { data: { ticket, expiresAt: new Date(Date.now() + 60_000).toISOString() } },
    });
    openExamGuard.mockImplementationOnce(() => {
      throw new Error("protocol launch failed");
    });
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Open ExamGuard" }));

    expect(await screen.findByLabelText("One-time ExamGuard ticket")).toHaveValue(ticket);
    expect(screen.getByText(/automatic launch was blocked/i)).toBeInTheDocument();
  });

  it("copies the issued invitation for the desktop manual-entry fallback", async () => {
    const ticket = "c".repeat(43);
    api.post.mockResolvedValueOnce({
      data: { data: { ticket, expiresAt: new Date(Date.now() + 60_000).toISOString() } },
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Open ExamGuard" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy invitation" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ticket));
    expect(await screen.findByText(/Ticket copied/)).toBeInTheDocument();
  });

  it("does not offer ExamGuard for SEB-required or ineligible exams", async () => {
    api.get.mockResolvedValueOnce({
      data: { data: { exam: { ...exam, sebRequired: true, canUseExamGuard: false } } },
    });
    renderDetails();
    expect(await screen.findByText(/Safe Exam Browser is required/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open ExamGuard" })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("offers resume for an existing in-progress attempt", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          exam: {
            ...exam,
            status: "in-progress",
            attemptStatus: "in-progress",
            sessionEndsAt: "2026-10-12T19:00:00.000Z",
          },
        },
      },
    });
    renderDetails();
    expect(await screen.findByRole("button", { name: "Resume in ExamGuard" })).toBeInTheDocument();
  });
});
