import { useState, useEffect } from "react";
import api from "@/api/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Calendar,
  AlertCircle,
  ChevronRight,
  Clock,
  GraduationCap,
  UserPlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import TeacherStatCard from "../components/TeacherStatCard";
import { cn } from "@/lib/utils";
import { useTeacherLanguage } from "../hooks/useLanguages";
import NotificationWelcomeModal from "@/components/NotificationWelcomeModal";



const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
});

const getGreeting = (t, name) => {
  const h = new Date().getHours();
  if (h < 12) return typeof t?.dashboard?.greeting === "function" ? t.dashboard.greeting(name) : `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
};

// Format a relative time string from a date
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const semesterLabel = (sem, year) => `Semester ${sem} · ${year}`;

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={cn("animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800", className)} />
);

const TeacherDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTeacherLanguage();
  const p = t?.dashboard ?? {};
  const c = t?.common ?? {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fullName = (user?.fullName || user?.name || "Teacher").trim();
  const firstName = fullName.split(/\s+/)[0] || "Teacher";
  const greetingName = firstName.charAt(0).toLocaleUpperCase() + firstName.slice(1);
  const initials = fullName.split(/\s+/).map((namePart) => namePart[0] || "").join("").slice(0, 2).toUpperCase();

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: json } = await api.get("/teacher/dashboard");
      setData(json.data);
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  // ── Derived stats from API data ──
  const stats = data
    ? [
      { label: p.stats?.totalClasses || "Total Classes", value: String(data.stats.totalClasses), icon: BookOpen, accent: "green", trend: "up", subLabel: `${data.classStats.length} active` },
      { label: p.stats?.totalStudents || "Total Students", value: String(data.stats.totalStudents), icon: Users, accent: "black", trend: "up", subLabel: `Across all classes` },
      { label: p.stats?.upcomingExams || "Scheduled", value: String(data.stats.upcomingExamsCount), icon: Calendar, accent: "green", trend: "stable", subLabel: `Classes with schedule` },
      { label: p.stats?.pendingGrading || "Pending Grading", value: String(data.stats.pendingGrading), icon: AlertCircle, accent: "black", trend: "down", subLabel: p.stats?.dueSoon || "Check assignments" },
    ]
    : [];

  return (
    <div className="space-y-8 w-full">
      <NotificationWelcomeModal />

      {/* ── Welcome bar ── */}
      <motion.div {...fadeUp(0)}>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.01), 0 4px 12px rgba(0,0,0,0.01)" }}>
          <div className="relative z-10 p-6 flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Link
                to="/teacher/profile"
                aria-label={p.viewProfile || "View and update your profile"}
                title={p.viewProfile || "View and update your profile"}
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2C2DE0] text-base font-black text-white shadow-sm shadow-[#2C2DE0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
              >
                {user?.photo || user?.avatar
                  ? <img src={user.photo || user.avatar} alt="" className="h-full w-full object-cover" />
                  : initials}
              </Link>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {getGreeting(t, greetingName)}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2C2DE0] animate-pulse" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">{c?.online || "Online and Synced"}</span>
                </div>
                <Link to="/teacher/profile" className="mt-1 inline-block text-xs font-semibold text-[#2C2DE0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]">
                  {p.viewProfile || "View profile"}
                </Link>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-6 shrink-0 pr-2">
              {loading ? (
                <>
                  <Skeleton className="w-10 h-10" />
                  <Skeleton className="w-10 h-10" />
                  <Skeleton className="w-10 h-10" />
                </>
              ) : data ? (
                [
                  { label: "Classes", value: data.stats.totalClasses, color: "text-[#2C2DE0]" },
                  { label: "Students", value: data.stats.totalStudents, color: "text-black dark:text-white" },
                  { label: "Scheduled", value: data.stats.upcomingExamsCount, color: "text-gray-500 dark:text-gray-300" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={cn("text-xl font-black", s.color)}>{s.value}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Error state ── */}
      {error && (
        <motion.div {...fadeUp(0.05)} className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchDashboard} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
            <RefreshCw size={12} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <div>
        <motion.p {...fadeUp(0.05)} className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0] dark:text-[#2C2DE0] mb-3">
          Overview
        </motion.p>
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <TeacherStatCard key={s.label} {...s} delay={0.06 + i * 0.04} />
            ))}
          </div>
        )}
      </div>

      {/* ── Main two-column row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* My Classes overview */}
        <motion.div {...fadeUp(0.28)} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">My Classes</h3>
            <Link to="/teacher/classes" className="text-xs text-[#] dark:text-[#2C2DE0] font-semibold hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : data?.classStats?.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <BookOpen size={28} className="text-gray-300 dark:text-zinc-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No classes assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(data?.classStats ?? []).slice(0, 5).map((cls) => (
                <Link
                  key={cls.classCode}
                  to="/teacher/classes"
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-[#fff] dark:text-[#2C2DE0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{cls.courseName}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{cls.classCode} · {semesterLabel(cls.semester, cls.year)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#2C2DE0] dark:text-[#2C2DE0] shrink-0">
                    <Users size={12} />
                    <span className="text-[11px] font-bold">{cls.studentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent students + scheduled classes */}
        <motion.div {...fadeUp(0.32)} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Enrollments</h3>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.recentStudents?.length === 0 ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <UserPlus size={22} className="text-gray-300 dark:text-zinc-600" />
              <p className="text-xs text-gray-400 dark:text-gray-500">No new enrollments this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data?.recentStudents ?? []).map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#2C2DE0]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-zinc-300 leading-snug">
                      <span className="font-semibold">{s.fullName}</span> enrolled · {s.department}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{timeAgo(s.joinedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming scheduled classes */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={12} className="text-gray-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Scheduled Classes
              </p>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.upcomingExams ?? []).slice(0, 3).map((e) => (
                  <div key={String(e.id)} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-zinc-900/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate">{e.title}</p>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500">{e.classCode} · {e.schedule?.day} {e.schedule?.time}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#2C2DE0] dark:text-[#2C2DE0] bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      <Users size={10} className="inline mr-0.5" />{e.studentCount}
                    </span>
                  </div>
                ))}
                {!loading && (data?.upcomingExams ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 py-2">No scheduled classes found.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;