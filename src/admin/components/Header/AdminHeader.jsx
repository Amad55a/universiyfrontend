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
  Users,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SearchBar from "../SearchBar";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import NotificationPanel from "@/components/NotificationPanel";

const PAGE_TITLE_KEYS = {
  "/admin/dashboard": "dashboard",
  "/admin/users": "users",
  "/admin/university-students": "universityStudents",
  "/admin/books": "books",
  "/admin/books/categories": "books",
  "/admin/reservations": "reservations",
  "/admin/qr-checkin": "qrCheckin",
  "/admin/analytics": "analytics",
  "/admin/settings": "settings",
};

const getPageKey = (pathname) => PAGE_TITLE_KEYS[pathname];

const AdminHeader = ({ onMenuClick, pageTitle, breadcrumbs = [] }) => {
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const pageKey = getPageKey(location.pathname);
  const resolvedTitle =
    pageTitle ??
    (pageKey ? ap.pages[pageKey]?.title : ap.pages.dashboard.title);

  const crumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: ap.breadcrumbs.home, path: "/admin/dashboard" }, { label: resolvedTitle }];

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 h-14 shrink-0",
        "border-b border-gray-200/60 dark:border-white/10",
        "bg-white/70 dark:bg-black/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60"
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label={ap.sidebar.openMenu}
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:block min-w-0 flex-1">
          <h1 className="text-sm font-black text-gray-900 dark:text-white truncate">
            {resolvedTitle}
          </h1>
          <nav className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} />}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={ap.header.searchPlaceholder}
            className="hidden md:block max-w-xs flex-1"
          />

          <ThemeToggle size="sm" />

          <Link
            to="/community"
            className="hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-[#2C2DE0]/10 hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors"
          >
            <Users size={15} />
            {t["navbar.community"] ?? "Community"}
          </Link>

         <NotificationPanel />

          <Link
            to="/admin/settings"
            className="hidden sm:flex rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label={ap.header.settings}
          >
            <Settings size={18} />
          </Link>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200/80 dark:border-white/10 pl-1 pr-2 py-1 hover:border-[#2C2DE0]/30 transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2C2DE0] to-[#2C2DE0] text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden md:block text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                {user?.name}
              </span>
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 shadow-xl backdrop-blur-xl py-1 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/admin/settings"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-[#2C2DE0]/10 hover:text-[#2C2DE0] transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={14} />
                    {ap.header.viewProfile}
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    {ap.header.signOut}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={ap.header.searchPlaceholder}
        />
      </div>
    </header>
  );
};

export default AdminHeader;
