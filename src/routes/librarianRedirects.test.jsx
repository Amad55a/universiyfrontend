import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoutes";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

const renderRoutes = (initialEntry) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/login" element={<PublicRoute><p>Login page</p></PublicRoute>} />
      <Route
        path="/student-only"
        element={<RoleRoute role="student"><p>Student page</p></RoleRoute>}
      />
      <Route path="/admin/library" element={<p>Librarian library overview</p>} />
    </Routes>
  </MemoryRouter>,
);

describe("librarian redirects", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "librarian" },
      loading: false,
    });
  });

  it("sends authenticated librarians away from public login pages to the Admin scanner", () => {
    renderRoutes("/login");

    expect(screen.getByText("Librarian library overview")).toBeInTheDocument();
  });

  it("sends librarians away from other role routes to the Admin scanner", () => {
    renderRoutes("/student-only");

    expect(screen.getByText("Librarian library overview")).toBeInTheDocument();
  });
});
