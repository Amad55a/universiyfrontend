import React, { createElement } from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
  BookOpen,
  CalendarDays,
  MessageCircle,
  QrCode,
  RotateCcw,
  Search,
  UserRoundSearch,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { title: "Book Management", description: "Search, add, edit, or safely archive physical books.", to: "/admin/books", icon: BookOpen },
  { title: "Seat Management", description: "View and manage library seats and service status.", to: "/admin/seats", icon: Armchair },
  { title: "Reservations", description: "Review reservations and process permitted check-ins and check-outs.", to: "/admin/reservations", icon: CalendarDays },
  { title: "QR Code Scanner", description: "Verify student identity and reservation QR codes.", to: "/admin/qr-checkin", icon: QrCode },
  { title: "Borrowing", description: "Issue books and review active loans.", to: "/admin/books/borrowing", icon: BookOpen },
  { title: "Returns", description: "Process returned books and view completed loans.", to: "/admin/books/returns", icon: RotateCcw },
  { title: "Student Search", description: "Search read-only student identity from the University Registry.", to: "/admin/library/students", icon: UserRoundSearch },
  { title: "Community", description: "Open the existing UniCORE Community.", to: "/community", icon: MessageCircle },
  { title: "Profile", description: "View and update your own account profile.", to: "/admin/profile", icon: UserRound },
];

export default function LibraryOverviewPage() {
  const { user } = useAuth();

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="rounded-2xl bg-gradient-to-br from-[#2C2DE0] to-indigo-800 p-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">UniCORE Library</p>
        <h1 className="mt-2 text-2xl font-black">Library Overview</h1>
        <p className="mt-1 text-sm text-white/80">
          Welcome, {user?.name || user?.fullName || "Librarian"}
          {user?.librarianId ? ` · ${user.librarianId}` : ""}
        </p>
      </header>
      <section aria-label="Librarian features" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map(({ title, description, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#2C2DE0]/40 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
          >
            {createElement(Icon, { className: "h-5 w-5 text-[#2C2DE0]" })}
            <h2 className="mt-3 font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
