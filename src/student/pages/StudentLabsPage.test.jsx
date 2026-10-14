import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StudentLabsPage from "./StudentLabsPage";

const mocks = vi.hoisted(() => ({ linuxLabRender: vi.fn() }));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: () => "" }),
}));
vi.mock("@/teacher/components/CodingLab", () => ({
  StudentCodingLab: () => <div>code runner available</div>,
}));
vi.mock("@/teacher/components/DesignLab", () => ({
  default: () => <div>design lab available</div>,
}));
vi.mock("@/teacher/components/LinuxLab", () => ({
  default: (...args) => mocks.linuxLabRender(...args),
}));
vi.mock("@/teacher/components/NetworkingLab", () => ({
  default: () => <div>network lab available</div>,
}));
vi.mock("@/teacher/components/WindowsLab", () => ({
  default: () => <div>windows lab available</div>,
}));

describe("Student labs while Linux Terminal is disabled", () => {
  it("hides Linux Terminal and keeps the Code Runner available", () => {
    render(
      <MemoryRouter>
        <StudentLabsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Linux Terminal" })).not.toBeInTheDocument();
    expect(screen.getByText("code runner available")).toBeInTheDocument();
    expect(mocks.linuxLabRender).not.toHaveBeenCalled();
  });
});
