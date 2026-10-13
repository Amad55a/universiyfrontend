import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ExamGuardOnlyPage from "./ExamGuardOnlyPage";

describe("ExamGuardOnlyPage", () => {
  it("directs browser session routes back to the desktop-app portal flow", () => {
    render(
      <MemoryRouter>
        <ExamGuardOnlyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/available only in the authenticated desktop app/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to exam portal" })).toHaveAttribute(
      "href",
      "/exam-portal",
    );
  });
});
