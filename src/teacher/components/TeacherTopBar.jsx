// teacher/components/TeacherTopBar.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  Settings,
  ChevronRight,
  User,
  LogOut,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTeacherLanguage } from "../hooks/useLanguages";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";

const TeacherTopBar = ({ pageTitle, pageSubtitle, onMenuClick, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const { t } = useTeacherLanguage();
  const location = useLocation();

  const p = t?.dashboard ?? {};
  const c = t?.common ?? {};
  const s = t?.sidebar ?? {};

  // Interactive States
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false); // Can interface with a notification panel later
  const [search, setSearch] = useState("");

  // Click-Outside references
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus on outside clicks
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Compute identity tokens
  const fullName = user?.fullName ?? user?.name ?? "Teacher";
  const firstName = fullName.split(" ")[0];
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "TH";

  // Build breadcrumbs dynamically if not supplied
  const crumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : [
        { label: s?.dashboard || "Dashboard", path: "/teacher/dashboard" },
        { label: pageTitle },
      ];

  return (
    <header
      className={cn(
        "sticky top-0 z-20 h-14 shrink-0 flex flex-col justify-center w-full",
        "border-b border-gray-200/60 dark:border-white/10",
        "bg-white/70 dark:bg-black/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60"
      )}
    >
      <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">

        {/* LEFT SECTION: Mobile Trigger & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Open Menu"
          >
            <Menu size={18} />
          </button>

          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-black text-gray-900 dark:text-white truncate">
              {pageTitle}
            </h1>
            <nav className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={10} />}
                  {crumb.path && i < crumbs.length - 1 ? (
                    <Link
                      to={crumb.path}
                      className="hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400 font-medium truncate max-w-[120px]">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          </div>
        </div>

        {/* RIGHT SECTION: Controls, Utilities, Profiles */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Search bar module integrated directly */}
          <div className="relative hidden md:block max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl pl-8 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/50 w-48 focus:w-60 transition-all"
              placeholder={c?.search || "Search…"}
            />
          </div>

          {/* Core Theme Toggle system */}
          <ThemeToggle size="sm" />

          <Link
            to="/community"
            className="hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-[#2C2DE0]/10 hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors"
          >
            <Users size={15} />
            Community
          </Link>

          <NotificationPanel />


          {/* Quick link to Profile settings */}
          <Link
            to="/teacher/profile"
            className="hidden sm:flex rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </Link>

          {/* Functional Profile Dropdown Context */}
          <div ref={profileRef} className="relative pl-1 border-l border-gray-100 dark:border-white/10 ml-1">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200/80 dark:border-white/10 pl-1 pr-2 py-1 hover:border-[#2C2DE0]/30 transition-colors bg-white/50 dark:bg-zinc-900/30"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#2C2DE0] to-[#2C2DE0] text-[11px] font-black text-white shadow-sm shadow-[#2C2DE0]/10">
                {user?.photo || user?.avatar
                  ? <img src={user.photo || user.avatar} alt="" className="h-full w-full object-cover" />
                  : initials}
              </span>
              <span className="hidden md:block text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                {firstName}
              </span>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-xl py-1 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/20">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {fullName}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                      {user?.email || "teacher@academy.edu"}
                    </p>
                  </div>

                  <Link
                    to="/teacher/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-[#2C2DE0]/10 hover:text-[#2C2DE0] transition-colors"
                  >
                    <User size={14} />
                    {p?.viewProfile || "My Profile"}
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout?.();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors border-t border-gray-50 dark:border-zinc-900"
                  >
                    <LogOut size={14} />
                    {c?.signOut || "Sign Out"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </header>
  );
};

export default TeacherTopBar;