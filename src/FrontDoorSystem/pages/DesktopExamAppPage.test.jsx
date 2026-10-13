import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DesktopExamAppPage from "./DesktopExamAppPage";

describe("UniCORE Desktop Exam App information page", () => {
  it("explains eligible portal launches, platform status, and security limitations", () => {
    render(
      <MemoryRouter>
        <DesktopExamAppPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "UniCORE Desktop Exam App" })).toBeInTheDocument();
    expect(screen.getByText(/Only exams for which the server confirms your eligibility/)).toBeInTheDocument();
    expect(screen.getByText(/x86_64 AppImage and Debian packages build locally/)).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByText(/does not claim guaranteed OS-level lockdown/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open student portal/ })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: /Download.*(Linux|Windows|macOS)/i })).not.toBeInTheDocument();
  });

  it("includes recovery instructions for tickets, login, installation, and connection problems", () => {
    render(
      <MemoryRouter>
        <DesktopExamAppPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Ticket expired or already used")).toBeInTheDocument();
    expect(screen.getByText("Login or saved-session problem")).toBeInTheDocument();
    expect(screen.getByText("App does not open")).toBeInTheDocument();
    expect(screen.getByText("Connection failure")).toBeInTheDocument();
  });
});
