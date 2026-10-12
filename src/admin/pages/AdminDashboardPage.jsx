import React, { useEffect } from "react";
import {
  Users,
  Armchair,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle,
  Wifi,
  UserX,
  ArrowRight,
  CalendarDays,
  Activity,
  BookMarked,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import StatCard from "@/admin/components/Statcard";
import LiveActivityFeed from "@/admin/components/Liveactivityfeed";
import LibraryStatusPanel from "@/admin/components/Librarystatuspanel";
import ReservationAnalyticsWidget from "@/admin/components/Reservationanalyticswidget";
import QuickAnalyticsCards from "@/admin/components/Quickanalyticscards";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import api from "@/api/client";
// Import your socket instance — adjust path to wherever you initialise it
// e.g. import socket from "@/lib/socket";
// If you don't have a shared socket instance, see the comment at the bottom.
import socket from "@/lib/socket";
import NotificationWelcomeModal from "@/components/NotificationWelcomeModal";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
});

const AdminDashboardPage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const ap = t.adminPanel;
  const p = ap.pages.dashboard;

  // ── Fetch dashboard data (poll every 30 s as fallback) ───────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data: dashboard } = await api.get("/admin/dashboard");
      return dashboard;
    },
    refetchInterval: 30_000,
    retry: 1,
  });

  // ── Real-time refresh via Socket.IO ──────────────────────────────────────
  // The server emits "dashboard:refresh" whenever a significant event occurs
  // (new reservation, book borrowed, user registered, etc.)
  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    };

    socket.on("dashboard:refresh", refresh);

    // Also refresh on these specific events if your server emits them directly
    socket.on("reservation:created", refresh);
    socket.on("reservation:updated", refresh);
    socket.on("reservation:cancelled", refresh);
    socket.on("book:borrowed", refresh);
    socket.on("book:returned", refresh);
    socket.on("user:registered", refresh);
    socket.on("user:verified", refresh);

    return () => {
      socket.off("dashboard:refresh", refresh);
      socket.off("reservation:created", refresh);
      socket.off("reservation:updated", refresh);
      socket.off("reservation:cancelled", refresh);
      socket.off("book:borrowed", refresh);
      socket.off("book:returned", refresh);
      socket.off("user:registered", refresh);
      socket.off("user:verified", refresh);
    };
  }, [queryClient]);

  const stats = data?.stats;
  const lineData = data?.lineData ?? [];
  const statusBreakdown = data?.statusBreakdown ?? {};
  const topBooks = data?.topBooks ?? [];
  const pendingApprovals = data?.pendingApprovals ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const peakData = data?.peakData ?? [];
  const zoneData = data?.zoneData ?? [];

  // ── Helper: safe string from stats ───────────────────────────────────────
  const val = (key, fallback = 0) =>
    isLoading || isError ? "—" : String(stats?.[key] ?? fallback);

  // ── User stat cards ───────────────────────────────────────────────────────
  const userCards = [
    {
      label: p.totalUsers,
      value: val("totalStudents"),
      icon: Users,
      accent: "green",
      trend: "up",
    },
    {
      label: p.activeToday,
      value: val("activeTodayUsers"),
      icon: Activity,
      accent: "green",
      trend: "up",
    },
    {
      label: p.verifiedStudents,
      value: val("verifiedStudents"),
      icon: CheckCircle,
      accent: "green",
      trend: "up",
    },
    {
      label: p.onlineUsers,
      value: val("onlineUsers"),
      icon: Wifi,
      accent: "green",
      trend: "up",
      live: true,
    },
  ];

  // ── Seat + book stat cards ────────────────────────────────────────────────
  const seatBookCards = [
    {
      label: p.totalSeats,
      value: val("totalSeats"),
      icon: Armchair,
      accent: "green",
      trend: "stable",
    },
    {
      label: p.availableSeats,
      value: val("availableSeats"),
      icon: CheckCircle,
      accent: "green",
      trend: "up",
    },
    {
      label: p.occupiedSeats,
      value: val("occupiedSeats"),
      icon: Armchair,
      accent: "black",
      trend: "down",
    },
    {
      label: p.reservationsToday,
      value: val("reservationsToday"),
      icon: CalendarDays,
      accent: "green",
      trend: "up",
    },
    {
      label: p.totalBooks,
      value: val("totalBooks"),
      icon: BookOpen,
      accent: "green",
      trend: "stable",
    },
    {
      label: p.borrowedBooks,
      value: val("borrowedBooks"),
      icon: BookMarked,
      accent: "black",
      trend: "down",
    },
    {
      label: p.overdueBooks,
      value: val("overdueBooks"),
      icon: AlertCircle,
      accent: "black",
      trend: "down",
    },
    {
      label: p.noShowToday,
      value: val("noShowToday"),
      icon: UserX,
      accent: "black",
      trend: "down",
    },
  ];

  const quickLinks = [
    { label: ap.sidebar.reservations, path: "/admin/reservations", icon: CalendarDays },
    { label: ap.sidebar.books, path: "/admin/books", icon: BookOpen },
    { label: ap.sidebar.users, path: "/admin/users", icon: Users },
    { label: ap.sidebar.universityStudents, path: "/admin/university-students", icon: Users },
  ];

  const base = isDark
    ? "bg-black border-white/10 text-white"
    : "bg-white border-black/10 text-black";

  return (
    <PageTransition>
      <NotificationWelcomeModal />
      <PageHeader title={p.title} subtitle={p.subtitle} badge={ap.brandShort} />
      {isError && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
          <span>{error?.response?.data?.message || error?.message || "Dashboard data could not be loaded."}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-current px-3 py-1.5 font-semibold hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── User statistics ── */}
      <motion.p
        {...fadeUp(0)}
        className="text-[11px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-3"
      >
        {p.sectionUsers}
      </motion.p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {userCards.map((c, i) => (
          <StatCard key={c.label} {...c} delay={i * 0.04} loading={isLoading} />
        ))}
      </div>

      {/* ── Seat + Book statistics ── */}
      <motion.p
        {...fadeUp(0.1)}
        className="text-[11px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-3"
      >
        {p.sectionSeatsBooks}
      </motion.p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {seatBookCards.map((c, i) => (
          <StatCard
            key={c.label}
            {...c}
            delay={0.1 + i * 0.04}
            loading={isLoading}
          />
        ))}
      </div>

      {/* ── Main 3-column row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px_260px] gap-4 mb-6">
        <motion.div {...fadeUp(0.18)}>
          <ReservationAnalyticsWidget
            lineData={lineData}
            statusBreakdown={statusBreakdown}
            peakData={peakData}
            zoneData={zoneData}
          />
        </motion.div>

        <motion.div {...fadeUp(0.22)}>
          <LiveActivityFeed activities={recentActivity} />
        </motion.div>

        <motion.div {...fadeUp(0.26)}>
          <LibraryStatusPanel stats={stats} loading={isLoading} />
        </motion.div>
      </div>

      {/* ── Quick Analytics ── */}
      <motion.div {...fadeUp(0.3)} className="mb-6">
        <QuickAnalyticsCards stats={stats} loading={isLoading} />
      </motion.div>

      {/* ── Pending Approvals + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pending book reservations */}
        <motion.div {...fadeUp(0.34)} className={`rounded-xl border p-5 ${base}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{ap.common.pending}</h3>
            <Clock className="w-4 h-4 opacity-40" />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 rounded-lg animate-pulse ${isDark ? "bg-white/5" : "bg-black/4"
                    }`}
                />
              ))
            ) : pendingApprovals.length === 0 ? (
              <p className="text-xs opacity-40">{ap.common.noResults}</p>
            ) : (
              pendingApprovals.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${isDark
                    ? "border-white/8 bg-white/[0.03]"
                    : "border-black/6 bg-black/[0.02]"
                    }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{r.book}</p>
                    <p className="text-[11px] opacity-50 truncate">
                      {r.studentFullName || r.student}
                    </p>
                  </div>
                  <Link
                    to="/admin/reservations"
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-md bg-[#2C2DE0] text-black font-semibold hover:bg-[#2C2DE0] transition-colors"
                  >
                    {ap.common.view}
                  </Link>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...fadeUp(0.38)} className={`rounded-xl border p-5 ${base}`}>
          <h3 className="text-sm font-semibold mb-4">{p.quickActions}</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center justify-between rounded-lg p-3.5 border text-xs font-medium transition-colors ${isDark
                    ? "border-white/8 hover:bg-white/4"
                    : "border-black/8 hover:bg-black/3"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#2C2DE0]" />
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 opacity-30" />
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AdminDashboardPage;

/*
 * ─── Socket instance note ────────────────────────────────────────────────────
 * If you don't already have a shared socket file at @/lib/socket, create one:
 *
 *   // src/lib/socket.js
 *   import { io } from "socket.io-client";
 *   const socket = io(import.meta.env.VITE_API_URL ?? "", {
 *     withCredentials: true,
 *     autoConnect: true,
 *   });
 *   export default socket;
 *
 * Then import it here as shown above.
 * ─────────────────────────────────────────────────────────────────────────────
 */