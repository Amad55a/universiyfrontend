import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const motion = new Proxy({}, {
    get: (_target, tag) => (motionProps) => {
      const props = { ...motionProps };
      const { children } = props;
      ["initial", "animate", "exit", "transition", "layoutId"].forEach((prop) => delete props[prop]);
      return ReactModule.createElement(tag, props, children);
    },
  });

  return {
    motion,
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => false,
  };
});

vi.mock("@/admin/components/Header/AdminHeader", () => ({
  default: ({ mobileOpen, onMenuClick }) => (
    <button
      type="button"
      aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
      aria-expanded={mobileOpen}
      onClick={onMenuClick}
    />
  ),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    t: {
      adminPanel: {
        sidebar: {
          closeMenu: "Close menu",
          expand: "Expand",
          collapse: "Collapse",
          users: "Users",
          books: "Books",
          sections: {},
        },
      },
    },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "admin" } }),
}));

vi.mock("@/FrontDoorSystem/components/Logo", () => ({
  default: () => <div>UniCORE</div>,
}));

const CurrentRoute = () => {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
};

const renderAdmin = () => render(
  <MemoryRouter initialEntries={["/admin/dashboard"]}>
    <Routes>
      <Route path="/admin/*" element={<AdminLayout />}>
        <Route path="dashboard" element={<CurrentRoute />} />
        <Route path="users" element={<CurrentRoute />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

describe("AdminLayout mobile navigation", () => {
  it("keeps the sidebar open after the opening tap and toggles it closed on the next tap", () => {
    renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: "Open admin menu" }));
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close admin menu" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Close admin menu" }));
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("does not close when tapping inside, closes on the backdrop, and navigates from sidebar links", () => {
    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Open admin menu" }));

    const sidebar = screen.getByRole("dialog", { name: "Admin navigation" });
    fireEvent.click(within(sidebar).getByRole("button", { name: "Books" }));
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("dialog", { name: "Admin navigation" })).getByRole("link", { name: "Users" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/users");
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open admin menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("keeps desktop sidebar navigation links functional", () => {
    renderAdmin();

    fireEvent.click(screen.getByRole("link", { name: "Users" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/users");
  });
});
