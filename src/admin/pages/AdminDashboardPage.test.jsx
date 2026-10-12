import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminDashboardPage from "./AdminDashboardPage";

vi.mock("@/api/client", () => ({ default: { get: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("framer-motion", () => {
  const MotionElement = ({ children, ...props }) => <div {...props}>{children}</div>;
  return { motion: { p: MotionElement, div: MotionElement } };
});
vi.mock("@/admin/components/PageTransition", () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock("@/admin/components/PageHeader", () => ({
  default: ({ title }) => <h1>{title}</h1>,
}));
vi.mock("@/admin/components/Statcard", () => ({
  default: ({ label, value }) => <div>{label}: {value}</div>,
}));
vi.mock("@/admin/components/Liveactivityfeed", () => ({ default: () => null }));
vi.mock("@/admin/components/Librarystatuspanel", () => ({ default: () => null }));
vi.mock("@/admin/components/Reservationanalyticswidget", () => ({ default: () => null }));
vi.mock("@/admin/components/Quickanalyticscards", () => ({ default: () => null }));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    t: {
      adminPanel: {
        brandShort: "UniCORE",
        pages: { dashboard: new Proxy({}, { get: (_target, key) => String(key) }) },
        sidebar: {
          reservations: "Reservations",
          books: "Books",
          users: "Users",
          universityStudents: "University students",
        },
        common: { pending: "Pending", noResults: "No results", view: "View" },
      },
    },
  }),
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ isDark: false }) }));
vi.mock("@/lib/socket", () => ({ default: { on: vi.fn(), off: vi.fn() } }));
vi.mock("@/components/NotificationWelcomeModal", () => ({ default: () => null }));

const dashboardData = {
  stats: { totalStudents: 42, activeTodayUsers: 7 },
  lineData: [],
  statusBreakdown: {},
  topBooks: [],
  pendingApprovals: [],
  recentActivity: [],
  peakData: [],
  zoneData: [],
};

const renderDashboard = () => render(
  <MemoryRouter>
    <AdminDashboardPage />
  </MemoryRouter>
);

describe("AdminDashboardPage", () => {
  const refetch = vi.fn();
  const invalidateQueries = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useQueryClient.mockReturnValue({ invalidateQueries });
    useQuery.mockReturnValue({
      data: dashboardData,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
  });

  it("loads dashboard data through the shared authenticated API client", async () => {
    api.get.mockResolvedValue({ data: dashboardData });
    renderDashboard();

    const options = useQuery.mock.calls[0][0];
    await expect(options.queryFn()).resolves.toEqual(dashboardData);
    expect(api.get).toHaveBeenCalledWith("/admin/dashboard");
    expect(screen.getByText("totalUsers: 42")).toBeInTheDocument();
  });

  it("shows an explicit loading state instead of reporting zero values", () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch,
    });

    renderDashboard();

    expect(screen.getByText("totalUsers: —")).toBeInTheDocument();
  });

  it("shows request errors and provides a retry action", () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { data: { message: "Administrator access required." } } },
      refetch,
    });

    renderDashboard();

    expect(screen.getByRole("alert")).toHaveTextContent("Administrator access required.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("totalUsers: —")).toBeInTheDocument();
  });
});
