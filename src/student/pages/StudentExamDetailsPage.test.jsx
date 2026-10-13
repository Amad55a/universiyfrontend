import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import StudentExamDetailsPage from "./StudentExamDetailsPage";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const exam = {
  id: "507f1f77bcf86cd799439011",
  title: "Midterm",
  instructions: "Read the questions carefully.",
  availableFrom: "2026-10-12T18:00:00.000Z",
  availableUntil: "2026-10-12T20:00:00.000Z",
  duration: 45,
  status: "available",
  canStart: true,
  canStartInBrowser: true,
  sebRequired: false,
  attemptStatus: null,
  security: {},
};

function ExamSessionRoute() {
  const { examId } = useParams();
  return <div>Exam session {examId}</div>;
}

function renderDetails() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/exams/${exam.id}`]}>
        <Routes>
          <Route path="/exams/:examId" element={<StudentExamDetailsPage />} />
          <Route path="/exam-session/:examId" element={<ExamSessionRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student browser exam launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: { exam } } });
  });

  it("shows exam details without issuing a launch token before the student starts", async () => {
    renderDetails();
    expect(await screen.findByRole("heading", { name: "Midterm" })).toBeInTheDocument();
    expect(screen.getByText("Read the questions carefully.")).toBeInTheDocument();
    expect(screen.getByText(/45 minutes/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`/exams/student/${exam.id}/details`);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("issues and redeems a one-time token before navigating without putting it in the URL", async () => {
    const token = "a".repeat(43);
    api.post
      .mockResolvedValueOnce({
        data: {
          data: {
            token,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            exam: { id: exam.id },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { examId: exam.id, attemptStatus: null } },
      });
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Start exam" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        `/exams/student/${exam.id}/launch-token`,
        {},
      );
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        "/exams/student/launch-token/redeem",
        { token },
      );
    });
    expect(await screen.findByText(`Exam session ${exam.id}`)).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.sessionStorage.getItem("exam_launch_token")).toBeNull();
  });

  it("keeps the student on the details page and offers retry when launch fails", async () => {
    api.post
      .mockRejectedValueOnce({ response: { data: { message: "Launch token expired." } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            token: "b".repeat(43),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            exam: { id: exam.id },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { examId: exam.id, attemptStatus: null } },
      });
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Start exam" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Launch token expired.");
    fireEvent.click(screen.getByRole("button", { name: "Retry launch" }));
    expect(await screen.findByText(`Exam session ${exam.id}`)).toBeInTheDocument();
  });

  it("does not offer Chrome launch for exams explicitly requiring SEB or a managed lock", async () => {
    api.get
      .mockResolvedValueOnce({
        data: { data: { exam: { ...exam, sebRequired: true, canStartInBrowser: false } } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            exam: {
              ...exam,
              security: { browserLock: true },
              canStartInBrowser: false,
            },
          },
        },
      });
    const { unmount } = renderDetails();
    expect(await screen.findByText(/Safe Exam Browser is required/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start exam" })).not.toBeInTheDocument();
    unmount();

    renderDetails();
    expect(await screen.findByText(/managed browser lock/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start exam" })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("discloses configured camera or microphone monitoring before launch", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          exam: {
            ...exam,
            security: { cameraRequired: true, microphoneRequired: true },
          },
        },
      },
    });
    renderDetails();
    expect(await screen.findByText(/Camera still images may be sent to exam staff/)).toBeInTheDocument();
    expect(screen.getByText(/microphone audio is not recorded/)).toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: "Resume exam" })).toBeInTheDocument();
  });
});
