import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import StudentExamSession from "./StudentExamSession";

vi.mock("@/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key) => key }),
}));
vi.mock("@/teacher/hooks/useexamsecurity", () => ({
  default: () => ({
    violations: [],
    isFullscreen: false,
    violationCount: 0,
    sessionId: "",
    disarm: vi.fn(),
  }),
}));
vi.mock("../components/ExamSubmitConfirmation", () => ({ default: () => null }));
vi.mock("../components/ExamWatermark", () => ({ default: () => null }));
vi.mock("../components/ExamCameraMonitor", () => ({ default: () => null }));
vi.mock("../components/StandardQuestion", () => ({ default: () => null }));
vi.mock("@/teacher/components/CodingLab", () => ({ StudentCodingLab: () => null }));
vi.mock("@/teacher/components/LinuxLab", () => ({ default: () => null }));
vi.mock("@/teacher/components/DesignLab", () => ({ default: () => null }));
vi.mock("@/teacher/components/NetworkingLab", () => ({ default: () => null }));
vi.mock("@/teacher/components/WindowsLab", () => ({ default: () => null }));

const examId = "507f1f77bcf86cd799439011";

function renderSession() {
  return render(
    <MemoryRouter initialEntries={[`/exam-session/${examId}`]}>
      <Routes>
        <Route path="/exam-session/:examId" element={<StudentExamSession />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("student exam session recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries the existing session endpoint instead of re-submitting an access token", async () => {
    api.get
      .mockRejectedValueOnce({
        response: { status: 401, data: { message: "You are not logged in." } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            exam: {
              _id: examId,
              title: "Recovered exam",
              questions: [{
                _id: "question-1",
                type: "mcq",
                question: "Recovery check",
                marks: 1,
                options: [],
              }],
              endTime: new Date(Date.now() + 60_000).toISOString(),
              security: {},
            },
            submissionId: "attempt-1",
            answers: [],
            serverTime: new Date().toISOString(),
          },
        },
      });

    renderSession();
    expect(await screen.findByRole("alert")).toHaveTextContent("You are not logged in.");
    fireEvent.click(screen.getByRole("button", { name: "Retry session recovery" }));

    expect(await screen.findByText("Recovered exam")).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenNthCalledWith(1, `/exams/student/${examId}/start`);
      expect(api.get).toHaveBeenNthCalledWith(2, `/exams/student/${examId}/start`);
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
