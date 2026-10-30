import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAccessRoute from "./AdminAccessRoute";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/admin/layout/AdminLayout", () => ({ default: () => <Outlet /> }));

const CurrentPath = () => {
  const location = useLocation();
  return <output>{location.pathname}</output>;
};

const renderRoute = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/admin/*" element={<AdminAccessRoute />}>
        <Route path="library" element={<p>Library overview</p>} />
        <Route path="library/students" element={<p>Library student search</p>} />
        <Route path="seats" element={<p>Seat management</p>} />
        <Route path="qr-checkin" element={<p>QR scanner page</p>} />
        <Route path="reservations" element={<p>Reservations page</p>} />
        <Route path="user-authority" element={<p>Admin authority page</p>} />
        <Route path="dashboard" element={<p>Admin dashboard page</p>} />
      </Route>
      <Route path="*" element={<CurrentPath />} />
    </Routes>
  </MemoryRouter>,
);

describe("AdminAccessRoute", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: "librarian" }, loading: false });
  });

  it("redirects direct URLs outside the librarian allowlist to the library overview", () => {
    renderRoute("/admin/user-authority");
    expect(screen.getByText("Library overview")).toBeInTheDocument();
    expect(screen.queryByText("Admin authority page")).not.toBeInTheDocument();
  });

  it("keeps an allowed librarian route available", () => {
    renderRoute("/admin/reservations");
    expect(screen.getByText("Reservations page")).toBeInTheDocument();
  });

  it("allows library seat management and registry-backed student search", () => {
    renderRoute("/admin/seats");
    expect(screen.getByText("Seat management")).toBeInTheDocument();
  });

  it("preserves the administrator dashboard route", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: "admin" }, loading: false });
    renderRoute("/admin/dashboard");
    expect(screen.getByText("Admin dashboard page")).toBeInTheDocument();
  });
});
