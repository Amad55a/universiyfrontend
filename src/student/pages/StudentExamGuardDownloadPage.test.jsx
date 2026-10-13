import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StudentExamGuardDownloadPage from "./StudentExamGuardDownloadPage";

vi.mock("./examguardPlatform", () => ({
  detectExamGuardPlatform: vi.fn(() => "linux"),
}));

function renderDownloadPage() {
  return render(
    <MemoryRouter initialEntries={["/examguard/download?examId=507f1f77bcf86cd799439011"]}>
      <Routes>
        <Route path="/examguard/download" element={<StudentExamGuardDownloadPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ExamGuard download page", () => {
  it("recommends the detected platform and supports manual platform selection", () => {
    renderDownloadPage();
    expect(screen.getByText(/Recommended: Linux/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Linux" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Windows" }));
    expect(screen.getByRole("button", { name: "Windows" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Windows installer not published yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Download ExamGuard/ })).not.toBeInTheDocument();
  });

  it("rechecks the platform and returns to the exam without inventing an installer link", () => {
    renderDownloadPage();
    fireEvent.click(screen.getByRole("button", { name: "Check Again" }));
    expect(screen.getByText("Platform detected: Linux.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Return to your exam" })[0]).toHaveAttribute("href", "/exams/507f1f77bcf86cd799439011");
    expect(screen.getByText(/Linux installer not published yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full installation and troubleshooting guide/i })).toHaveAttribute("href", "/desktop-exam-app");
  });
});
