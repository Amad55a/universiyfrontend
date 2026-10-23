// teacher/components/TeacherSidebar.jsx
import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEACHER_SIDEBAR_SECTIONS } from "../config/sidebarConfig";
import { useAuth } from "@/context/AuthContext";
import { useTeacherLanguage } from "../hooks/useLanguages";
import { motion } from "framer-motion";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
// ─── Single nav item ──────────────────────────────────────────────────────────
const NavItem = ({ item, collapsed, sidebarT }) => {
  const Icon = item.icon;
  const label = sidebarT[item.labelKey] ?? item.labelKey;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          isActive
            ? "bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0]"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="teacher-sidebar-active"
              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#2C2DE0]"
            />
          )}
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
};

// ─── Main sidebar ─────────────────────────────────────────────────────────────
const TeacherSidebar = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { t } = useTeacherLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const s = t.sidebar;
  const showBrand = !collapsed || mobileOpen;

  // Close mobile on route change
  useEffect(() => {
    onCloseMobile?.();
  }, [location.pathname, onCloseMobile]);

  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "Teacher";
  const fullName = user?.fullName ?? user?.name ?? "Teacher";
  const profilePhoto = user?.photo || user?.avatar;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ── Brand header ── */}
      <div
        className={cn(
          "flex items-center border-b border-gray-200/60 dark:border-white/10 px-4 h-14 shrink-0",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        {showBrand && (
          <Link to="/teacher/dashboard" className="flex min-w-0 items-center overflow-hidden">
            <UnicoreLogo />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "hidden lg:flex rounded-lg p-2 text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
          )}
          aria-label={collapsed ? s.expand : s.collapse}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {TEACHER_SIDEBAR_SECTIONS.map((section) => (
          <div key={section.id}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {s.sections[section.sectionKey]}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  sidebarT={s}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Teacher profile strip ── */}
      <div className="p-3 border-t border-gray-200/60 dark:border-white/10">
        <Link
          to="/teacher/profile"
          onClick={onCloseMobile}
          aria-label={`${s.profile}: ${fullName}`}
          title={collapsed ? fullName : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors",
            location.pathname === "/teacher/profile"
              ? "bg-[#2C2DE0]/10 text-[#2C2DE0]"
              : "hover:bg-white/60 dark:hover:bg-white/5",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-[#2C2DE0] rounded-full flex items-center justify-center overflow-hidden text-white text-xs font-bold shrink-0">
            {profilePhoto
              ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
              : firstName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                {fullName}
              </p>
              <p className="text-[11px] text-[#2C2DE0] truncate">
                {user?.email || s.profile}
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 256 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30",
          "border-r border-gray-200/60 dark:border-white/10",
          "bg-white/80 dark:bg-black/80 backdrop-blur-xl"
        )}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-64 flex flex-col lg:hidden",
              "border-r border-gray-200/60 dark:border-white/10",
              "bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl"
            )}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeacherSidebar;