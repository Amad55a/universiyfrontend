import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

globalThis.React = React;

const translations = vi.hoisted(() => ({
  adminPanel: {
    pages: {
      users: {
        statusActive: "Active",
        statusSuspended: "Suspended",
        statusBanned: "Banned",
        statusPending: "Pending",
        emailVerified: "Email verified",
        emailPending: "Email pending",
        verified: "Verified",
        notVerified: "Not verified",
        verificationRequired: "Verification required",
        notAvailable: "Not available",
        details: {
          backToUsers: "Back to users",
          loadingTitle: "Loading user",
          loadingSubtitle: "Loading user details",
          errorTitle: "User not found",
          errorSubtitle: "This account is unavailable",
          loadErrorTitle: "User details could not be loaded",
          loadErrorSubtitle: "The request failed. Check your connection and try again.",
          retry: "Retry",
          notProvided: "Not provided",
          roles: { student: "Student", teacher: "Teacher", admin: "Administrator" },
          profile: "Profile",
          universityInfo: "University info",
          teacherInfo: "Teacher information",
          accountInfo: "Account information",
          universityId: "University student ID",
          role: "Role",
          accountStatus: "Account status",
          classYear: "Class / academic year",
          enrolledCourses: "Enrolled courses",
          enrollmentStatus: "Enrollment status",
          specialization: "Specialization",
          office: "Office",
          employmentType: "Employment type",
          hireDate: "Hire date",
          assignedClasses: "Assigned classes",
          assignedCourses: "Assigned courses",
          qualifications: "Qualifications",
          recordStatus: "University record status",
          department: "Department",
          semester: "Semester",
          gender: "Gender",
          createdAt: "Created at",
          lastLogin: "Last login",
          provider: "Provider",
          googleLinked: "Google linked",
          emailVerifiedLabel: "Email verification",
          loginAttempts: "Login attempts",
          devices: "Devices",
          noDevices: "No devices recorded",
          reservationAnalytics: "Reservation analytics",
          totalReservations: "Total reservations",
          activeReservations: "Active reservations",
          cancelledReservations: "Cancelled reservations",
          noShows: "No-shows",
          auditTimeline: "Audit timeline",
          audit: {
            empty: "No audit events have been recorded for this user.",
            description: "This timeline shows only actions recorded by the system; older actions without audit records are not reconstructed.",
            system: "System",
            notAvailable: "Not available",
            from: "From",
            to: "To",
            yes: "Yes",
            no: "No",
            fields: { fullName: "Full name" },
            actions: { user_updated: "User updated" },
          },
        },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }));
vi.mock("@/api/admin", () => ({ fetchAdminUser: vi.fn() }));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: translations }),
}));

const { useQuery } = await import("@tanstack/react-query");
const { default: UserDetailsPage } = await import("./UserDetailsPage");

const renderDetailsPage = () =>
  render(
    <MemoryRouter initialEntries={["/admin/users/507f1f77bcf86cd799439011"]}>
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("UserDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows authoritative student academic fields and recorded audit information", () => {
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        user: {
          fullName: "Amina Hassan",
          email: "amina@example.test",
          role: "student",
          accountStatus: "active",
          isUniversityVerified: true,
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        registry: {
          universityId: "UNI-100",
          department: "Computing",
          semester: 4,
          gender: "female",
          status: "active",
          classes: [{ classCode: "CS-401-A", section: "A", academicYear: "2025-2026" }],
          courses: [{ courseCode: "CS401", title: "Databases" }],
        },
        analytics: {},
        auditLogs: [{
          id: "audit-1",
          action: "user_updated",
          details: {
            changes: [{ field: "fullName", from: "Amina", to: "Amina Hassan" }],
          },
          performedBy: { name: "Admin User" },
          createdAt: "2025-02-01T10:00:00.000Z",
        }],
      },
    });

    renderDetailsPage();

    expect(screen.getAllByText("Amina Hassan").length).toBeGreaterThan(0);
    expect(screen.getByText("UNI-100")).toBeInTheDocument();
    expect(screen.getByText("Computing")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("CS-401-A · A · 2025-2026")).toBeInTheDocument();
    expect(screen.getByText("CS401 · Databases")).toBeInTheDocument();
    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
    expect(screen.getByText(/only actions recorded by the system/i)).toBeInTheDocument();
  });

  it("shows missing university data honestly for a student without a linked record", () => {
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        user: {
          fullName: "Unlinked Student",
          email: "student@example.test",
          role: "student",
          accountStatus: "active",
        },
        registry: null,
        analytics: {},
        auditLogs: [],
      },
    });

    renderDetailsPage();

    expect(screen.getByText("University info")).toBeInTheDocument();
    expect(screen.getByText("No audit events have been recorded for this user.")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  });

  it("shows an administrative role without student academic fields", () => {
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        user: {
          fullName: "Library Admin",
          email: "admin@example.test",
          role: "admin",
          accountStatus: "active",
        },
        registry: null,
        analytics: {},
        auditLogs: [],
      },
    });

    renderDetailsPage();

    expect(screen.getAllByText("Administrator").length).toBeGreaterThan(0);
    expect(screen.getByText("Account information")).toBeInTheDocument();
    expect(screen.queryByText("University info")).not.toBeInTheDocument();
  });

  it("separates a request failure from a missing profile and offers retry", () => {
    const refetch = vi.fn();
    useQuery.mockReturnValue({ isLoading: false, isError: true, refetch });

    renderDetailsPage();

    expect(screen.getByText("User details could not be loaded")).toBeInTheDocument();
    expect(screen.queryByText("User not found")).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalledOnce();
  });
});
