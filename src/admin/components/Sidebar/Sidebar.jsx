import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
import { SIDEBAR_SECTIONS, resolveSidebarLabel } from "@/admin/config/sidebarConfig";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";

const SidebarNavItem = ({
  item,
  collapsed,
  sidebarT,
  expandedMenus,
  toggleMenu,
  depth = 0,
}) => {
  const location = useLocation();
  const hasChildren = item.children?.length > 0;
  const isExpanded = expandedMenus.has(item.id);
  const Icon = item.icon;
  const label = resolveSidebarLabel(sidebarT, item.labelKey);

  const isActive =
    location.pathname === item.path ||
    item.children?.some((c) => location.pathname === c.path);

  if (hasChildren) {
    return (
      <div className={depth > 0 ? "ml-3" : ""}>
        <button
          type="button"
          onClick={() => toggleMenu(item.id)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
            isActive
              ? "text-[#2C2DE0]"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
          )}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{label}</span>
              <Motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ChevronDown size={16} />
              </Motion.span>
            </>
          )}
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && !collapsed && (
            <Motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5 border-l border-[#2C2DE0]/20 ml-5 pl-2">
                {item.children.map((child) => (
                  <SidebarNavItem
                    key={child.id}
                    item={child}
                    collapsed={collapsed}
                    sidebarT={sidebarT}
                    expandedMenus={expandedMenus}
                    toggleMenu={toggleMenu}
                    depth={depth + 1}
                  />
                ))}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end
      className={({ isActive: active }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          depth > 0 && "py-2 text-xs",
          active
            ? "bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0]"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
        )
      }
    >
      {({ isActive: active }) => (
        <>
          {active && (
            <Motion.span
              layoutId="admin-sidebar-active"
              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#2C2DE0]"
            />
          )}
          <Icon size={depth > 0 ? 16 : 18} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
};

const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const ap = t.adminPanel;
  const sidebarT = ap.sidebar;
  const [expandedMenus, setExpandedMenus] = useState(new Set(["books"]));
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const showBrand = !collapsed || mobileOpen;

  useEffect(() => {
    onCloseMobile?.();
  }, [location.pathname, onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseMobile?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  const toggleMenu = (id) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center border-b border-gray-200/60 dark:border-white/10 px-4 h-14 shrink-0",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        {showBrand && (
          <Link
            to={user?.role === "librarian" ? "/admin/library" : "/admin/dashboard"}
            className="flex min-w-0 items-center overflow-hidden"
          >
            <UnicoreLogo />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex rounded-lg p-2 text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label={collapsed ? ap.sidebar.expand : ap.sidebar.collapse}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SIDEBAR_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user?.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {resolveSidebarLabel(sidebarT, section.sectionKey)}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    sidebarT={sidebarT}
                    expandedMenus={expandedMenus}
                    toggleMenu={toggleMenu}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <Motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 top-14 z-40 cursor-default border-0 bg-black/50 p-0 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
            aria-label={ap.sidebar.closeMenu}
          />
        )}
      </AnimatePresence>

      <Motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30",
          "border-r border-gray-200/60 dark:border-white/10",
          "bg-white/80 dark:bg-black/80 backdrop-blur-xl"
        )}
      >
        {sidebarContent}
      </Motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <Motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed bottom-0 left-0 top-14 z-50 h-auto w-[260px] flex flex-col lg:hidden",
              "border-r border-gray-200/60 dark:border-white/10",
              "bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl"
            )}
            id="admin-mobile-navigation"
            aria-modal="true"
            role="dialog"
            aria-label={sidebarT.navigation || "Admin navigation"}
            onClick={(event) => event.stopPropagation()}
          >
            {sidebarContent}
          </Motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
