import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  QrCode,
  BarChart3,
  Settings,
  Library,
  Bell,
  BookCheck,
  ShieldCheck,
  UsersRound,
  MessageSquareText,
  UserRoundSearch,
} from "lucide-react";

/**
 * Sidebar structure — labels resolved via t.adminPanel.sidebar[labelKey]
 * Icons and paths only; no hardcoded visible text.
 */
export const SIDEBAR_SECTIONS = [
  {
    id: "main",
    sectionKey: "sections.main",
    items: [
      {
        id: "dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
        roles: ["admin"],
      },
      {
        id: "library-overview",
        labelKey: "libraryOverview",
        icon: LayoutDashboard,
        path: "/admin/library",
        roles: ["librarian"],
      },
    ],
  },
  {
    id: "management",
    sectionKey: "sections.management",
    items: [
      {
        id: "users",
        labelKey: "users",
        icon: Users,
        path: "/admin/users",
        roles: ["admin"],
      },
      {
        id: "university-registry",
        labelKey: "universityRegistry",
        icon: GraduationCap,
        path: "/admin/university-registry",
        roles: ["admin"],
      },
      {
        id: "groups",
        labelKey: "groups",
        icon: UsersRound,
        path: "/admin/groups",
        roles: ["admin"],
      },
      {
        id: "seats",
        labelKey: "seatManagement",
        icon: GraduationCap,
        path: "/admin/seats",
        roles: ["admin", "librarian"],
      },
      {
        id: "reservations",
        labelKey: "reservations",
        icon: CalendarDays,
        path: "/admin/reservations",
        roles: ["admin", "librarian"],
      },
      {
        id: "notifications",
        labelKey: "notifications",
        icon: Bell,
        path: "/admin/notifications",
        roles: ["admin"],
      },
    ],
  },
  {
    id: "library",
    sectionKey: "sections.library",
    items: [
      {
        id: "books",
        labelKey: "books",
        icon: BookOpen,
        path: "/admin/books",
        roles: ["admin"],
        children: [
          {
            id: "books",
            labelKey: "books",
            icon: Library,
            path: "/admin/books",
            roles: ["admin"],
          },
          {
            id: "books-borrowing",
            labelKey: "booksBorrowing",
            icon: BookCheck,
            path: "/admin/books/borrowing",
            roles: ["admin"],
          },
        ],
      },
      {
        id: "librarian-book-search",
        labelKey: "books",
        icon: BookOpen,
        path: "/admin/books",
        roles: ["librarian"],
      },
      {
        id: "librarian-borrowing",
        labelKey: "borrowing",
        icon: BookCheck,
        path: "/admin/books/borrowing",
        roles: ["librarian"],
      },
      {
        id: "librarian-returns",
        labelKey: "returns",
        icon: BookCheck,
        path: "/admin/books/returns",
        roles: ["librarian"],
      },
      {
        id: "librarian-student-search",
        labelKey: "studentSearch",
        icon: UserRoundSearch,
        path: "/admin/library/students",
        roles: ["librarian"],
      },
    ],
  },
  {
    id: "analytics",
    sectionKey: "sections.analytics",
    items: [
      {
        id: "qr-checkin",
        labelKey: "qrCheckin",
        icon: QrCode,
        path: "/admin/qr-checkin",
        roles: ["admin", "librarian"],
      },
      {
        id: "analytics",
        labelKey: "reportsCenter",
        icon: BarChart3,
        path: "/admin/reports",
        roles: ["admin"],
      },
    ],
  },
  {
    id: "community",
    sectionKey: "sections.community",
    items: [
      {
        id: "librarian-community",
        labelKey: "community",
        icon: MessageSquareText,
        path: "/community",
        roles: ["librarian"],
      },
    ],
  },
  {
    id: "system",
    sectionKey: "sections.system",
    items: [
      {
        id: "settings",
        labelKey: "settings",
        icon: Settings,
        path: "/admin/settings",
        roles: ["admin"],
      },
      {
        id: "profile",
        labelKey: "profile",
        icon: Users,
        path: "/admin/profile",
        roles: ["librarian"],
      },

      {
        id: "user-authority",
        labelKey: "userAuthority",
        icon: ShieldCheck,
        path: "/admin/user-authority",
        roles: ["admin"],
      },
    ],
  },
];

export const resolveSidebarLabel = (sidebarT, labelKey) => {
  const keys = labelKey.split(".");
  let value = sidebarT;
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? labelKey;
};
