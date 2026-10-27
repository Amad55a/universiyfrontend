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
} from "lucide-react";
import { FcBarChart, FcDocument } from "react-icons/fc";

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
        roles: ["admin", "librarian"],
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
        labelKey: "seats",
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
        roles: ["admin", "librarian"],
        children: [
          {
            id: "books",
            labelKey: "books",
            icon: Library,
            path: "/admin/books",
            roles: ["admin", "librarian"],
          },
          {
            id: "books-borrowing",
            labelKey: "booksBorrowing",
            icon: BookCheck,
            path: "/admin/books/borrowing",
            roles: ["admin", "librarian"],
          },
        ],
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
        labelKey: "analytics",
        icon: BarChart3,
        path: "/admin/analytics",
        roles: ["admin", "librarian"],
      },
    ],
  },
  {
    id: "reports",
    sectionKey: "sections.reports",
    items: [
      {
        id: "reports",
        labelKey: "Reports",
        icon: FcDocument,
        path: "/admin/reports",
        roles: ["admin", "librarian"],
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

  {id: "user-authority",
  labelKey: "userAuthority",        
  icon: ShieldCheck,
  path: "/admin/user-authority",
  roles: ["admin"],

  }
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
