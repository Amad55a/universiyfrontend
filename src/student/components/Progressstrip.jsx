// student/components/DashboardComponents/ProgressStrip.jsx
// Small stat-card row for the dashboard: borrowed books, active
// reservations, books due soon, unread notifications.
// Fully translated via t.dashboardStrip (add the keys shown at the
// bottom of this file to en.js / so.js).

import { createElement } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, AlertTriangle, Bell } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const StripCard = ({ icon: Icon, label, value, href, tone, error }) => {
  const tones = {
    green:  { bg: "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10", icon: "text-[#2C2DE0] dark:text-[#2C2DE0]" },
    blue:   { bg: "bg-blue-50 dark:bg-blue-500/10",   icon: "text-blue-600 dark:text-blue-400"   },
    amber:  { bg: "bg-amber-50 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400" },
    gray:   { bg: "bg-gray-100 dark:bg-white/5",       icon: "text-gray-600 dark:text-gray-300"   },
  };
  const v = tones[tone] ?? tones.gray;

  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3.5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-none transition-all duration-150"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${v.bg}`}>
        {createElement(Icon, { size: 18, className: v.icon })}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-gray-900 dark:text-white leading-none" aria-label={error ? "Data unavailable" : undefined}>{error ? "—" : value ?? "—"}</p>
        <p className="text-[11px] font-semibold text-gray-400 mt-1 truncate">{label}</p>
      </div>
    </Link>
  );
};

const ProgressStrip = ({ stats, error = false }) => {
  const { t } = useLanguage();
  const s = t?.dashboardStrip ?? {};

  const cards = [
    {
      icon: BookOpen,
      label: s.borrowed ?? "Borrowed books",
      value: stats?.borrowed ?? 0,
      href: "/e-library/my-borrows",
      tone: "green",
      error,
    },
    {
      icon: CalendarClock,
      label: s.reservations ?? "Reservations",
      value: stats?.reservations ?? 0,
      href: "/my-reservations",
      tone: "blue",
      error,
    },
    {
      icon: AlertTriangle,
      label: s.dueSoon ?? "Due soon",
      value: stats?.dueSoon ?? 0,
      href: "/e-library/my-borrows",
      tone: "amber",
      error,
    },
    {
      icon: Bell,
      label: s.notifications ?? "Notifications",
      value: stats?.unread ?? 0,
      href: "/notifications",
      tone: "gray",
      error,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <StripCard key={c.label} {...c} />
      ))}
    </div>
  );
};

export default ProgressStrip;

/*
  Add to en.js (top level, next to `dashboard`):

  dashboardStrip: {
    borrowed: "Borrowed books",
    reservations: "Reservations",
    dueSoon: "Due soon",
    notifications: "Notifications",
  },

  Add to so.js:

  dashboardStrip: {
    borrowed: "Buugagta la deymay",
    reservations: "Boosaska la qabtay",
    dueSoon: "Dhow inay dhacaan",
    notifications: "Ogeysiisyada",
  },
*/