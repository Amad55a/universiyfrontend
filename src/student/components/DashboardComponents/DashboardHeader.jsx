// DashboardHeader.jsx (Topbar)
// Navigation now lives in Sidebar.jsx — this bar's job is utilities:
// mobile menu trigger, global search, language switch, theme, notifications,
// profile. Same logo mark as the sidebar so both read as one system; the
// logo here only shows on mobile/tablet where the sidebar is hidden.

import { useAuth }      from "@/context/AuthContext";
import {
  LogOut, ChevronDown, Settings, X, Search, Globe, Menu,
  CalendarDays, Heart, Library, Users,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SettingsDrawer  from "./SettingsDrawer";
import ThemeToggle     from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import { MobileSidebarDrawer } from "@/student/components/Sidebar";
import { toast } from "sonner";

const resolvePhoto = (photo) => {
  if (!photo) return null;
  if (photo.startsWith("blob:") || photo.startsWith("http")) return photo;
  const base = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/${photo.replace(/^\/+/, "")}` : `/${photo.replace(/^\/+/, "")}`;
};
const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const GlobalSearch = ({ className = "", placeholder }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/e-library?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 h-[34px] rounded-[10px] text-[13px] bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] transition-all duration-200"
      />
    </form>
  );
};

// Two languages only: en / so. Cycles between them, persists via setLang.
const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();
  const isSo = lang === "so";
  return (
    <button
      onClick={() => setLang?.(isSo ? "en" : "so")}
      className="flex items-center gap-1.5 px-2.5 h-[34px] rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-extrabold text-gray-600 dark:text-gray-300 hover:bg-[#2C2DE0]/10 dark:hover:bg-[#2C2DE0]/10 hover:border-[#2C2DE0]/40 hover:text-[#2C2DE0] dark:hover:text-[#6366F1] transition-colors"
      aria-label="Change language"
      title={isSo ? "Switch to English" : "U bedel Af-Soomaali"}
    >
      <Globe size={13} />
      {isSo ? "SO" : "EN"}
    </button>
  );
};

const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const { t, dir }        = useLanguage();
  const navigate          = useNavigate();

  const [openProfile, setOpenProfile]   = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const profileRef = useRef(null);
  const photoUrl   = resolvePhoto(user?.photo);

  const handleLogout = async () => {
    setOpenProfile(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("[DashboardHeader] logout failed", error);
      toast.error(t?.nav?.logoutError || "Unable to sign out. Please try again.");
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header
        dir={dir}
        className="w-full h-[60px] bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-3 sm:px-6 flex items-center gap-3 sm:gap-4 sticky top-0 z-40"
      >
        {/* Mobile menu trigger — opens the same nav the sidebar has */}
        <button
          onClick={() => setMobileNavOpen((p) => !p)}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all flex-shrink-0"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo — only here on mobile/tablet, sidebar already carries it on desktop */}
        <Link to="/dashboard" className="lg:hidden flex items-center gap-2 flex-shrink-0">
          <UnicoreLogo />
        </Link>

        <GlobalSearch
          className="hidden md:block w-[200px] lg:w-[280px] flex-shrink-0"
          placeholder={t?.nav?.searchPlaceholder || "Search books, courses…"}
        />

        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <ThemeToggle />
          <LanguageToggle />
          <NotificationPanel />

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setOpenProfile((p) => !p)}
              aria-haspopup="true"
              aria-expanded={openProfile}
              className="flex items-center gap-2 pl-1.5 pr-2 h-[38px] rounded-[10px] bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7FE83A] to-[#2C2DE0] text-white font-bold shadow-sm overflow-hidden flex items-center justify-center text-[13px] flex-shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; e.target.parentElement.textContent = getInitials(user?.name); }}
                  />
                ) : getInitials(user?.name)}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-gray-800 dark:text-white">
                  {user?.name?.split(" ")[0] || t?.nav?.account || "Account"}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
              </div>
              <ChevronDown
                size={12}
                className={`hidden sm:block text-gray-400 transition-transform duration-200 ${openProfile ? "rotate-180" : ""}`}
              />
            </button>

            <div
              className={`absolute top-[calc(100%+8px)] right-0 w-60 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-black/10 overflow-hidden transition-all duration-200 origin-top-right ${
                openProfile ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
              style={{ zIndex: 60 }}
            >
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#2C2DE0] flex items-center justify-center text-white font-black text-xl shadow flex-shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt="avatar" className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; e.target.parentElement.textContent = getInitials(user?.name); }} />
                    ) : getInitials(user?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-xs text-[#2C2DE0] dark:text-[#6366F1] font-medium capitalize">{user?.role}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-2 space-y-0.5">
                {[
                  { href: "/community",            icon: Users,        label: t?.nav?.community     || "Community"    },
                  { href: "/e-library/my-library",  icon: Heart,        label: t?.nav?.myLibrary      || "My Library"   },
                  { href: "/e-library/my-borrows",  icon: Library,      label: t?.nav?.myBorrows      || "My Borrows"   },
                  { href: "/my-reservations",       icon: CalendarDays, label: t?.nav?.reservations   || "Reservations" },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setOpenProfile(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-all"
                  >
                    <Icon size={15} className="text-[#2C2DE0]" />
                    {label}
                  </Link>
                ))}

                <button
                  onClick={() => { setOpenProfile(false); setOpenSettings(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  <Settings size={15} className="text-[#2C2DE0]" />
                  {t?.nav?.settings || "Settings"}
                </button>
              </div>

              <div className="p-2 pt-0 border-t border-gray-100 dark:border-gray-800 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={15} />
                  {t?.nav?.signOut || "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MobileSidebarDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SettingsDrawer open={openSettings} onClose={() => setOpenSettings(false)} />
    </>
  );
};

export default DashboardHeader;