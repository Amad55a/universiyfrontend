import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import api from "@/api/client";
import StudentExamPortal from "./StudentExamPortal";

vi.mock("@/api/client", () => ({
  default: { post: vi.fn() },
}));
vi.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key) => key }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "student-1" }, loading: false }),
}));

const validExam = {
  examId: "507f1f77bcf86cd799439011",
  title: "Midterm",
  duration: 45,
  questionsCount: 4,
  security: { sebRequired: false },
};

function renderPortal() {
  return render(
    <MemoryRouter>
      <StudentExamPortal />
    </MemoryRouter>,
  );
}

describe("ExamGuard launch ticket handoff", () => {
  beforeEach(() => {
    api.post.mockReset();
    localStorage.clear();
    Object.defineProperty(window, "SafeExamBrowser", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests an authenticated one-time ticket and only displays/copies it temporarily", async () => {
    const ticket = "a".repeat(43);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    api.post.mockResolvedValueOnce({ data: { data: validExam } });
    api.post.mockResolvedValueOnce({ data: { data: { ticket, expiresAt } } });
    renderPortal();

    fireEvent.change(screen.getByPlaceholderText("CS101-MID"), {
      target: { value: "EXM-1234-ABCD-5678" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "exam.verifyToken" }).closest("form"));
    fireEvent.click(await screen.findByRole("button", { name: "Open in ExamGuard" }));

    const ticketInput = await screen.findByLabelText("One-time ExamGuard ticket");
    expect(ticketInput).toHaveValue(ticket);
    expect(api.post).toHaveBeenLastCalledWith(
      `/exams/student/${validExam.examId}/launch-ticket`,
      {},
      { withCredentials: true },
    );
    expect(window.location.search).toBe("");
    expect(localStorage.length).toBe(0);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy ticket" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ticket));
    expect(await screen.findByText(/Ticket copied/)).toBeInTheDocument();
  });

  it("clears the ticket when it expires", async () => {
    const ticket = "b".repeat(43);
    api.post.mockResolvedValueOnce({ data: { data: validExam } });
    api.post.mockResolvedValueOnce({
      data: { data: { ticket, expiresAt: new Date(Date.now() + 50).toISOString() } },
    });
    renderPortal();

    fireEvent.change(screen.getByPlaceholderText("CS101-MID"), {
      target: { value: "EXM-1234-ABCD-5678" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "exam.verifyToken" }).closest("form"));
    fireEvent.click(await screen.findByRole("button", { name: "Open in ExamGuard" }));
    await screen.findByLabelText("One-time ExamGuard ticket");

    await waitFor(() => {
      expect(screen.queryByLabelText("One-time ExamGuard ticket")).not.toBeInTheDocument();
      expect(screen.getByText(/ticket expired/i)).toBeInTheDocument();
    });
  });

  it("does not offer ExamGuard tickets for an SEB-required exam", async () => {
    const sebExam = {
      ...validExam,
      security: { sebRequired: true },
    };
    api.post.mockResolvedValueOnce({ data: { data: sebExam } });
    renderPortal();

    fireEvent.change(screen.getByPlaceholderText("CS101-MID"), {
      target: { value: "EXM-1234-ABCD-5678" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "exam.verifyToken" }).closest("form"));

    expect(await screen.findByRole("button", { name: "Start Secure Exam" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open in ExamGuard" })).not.toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
