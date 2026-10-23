// src/components/community/CommunityHeader.jsx
// Medium-style top header for UNISO Community

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, PenSquare, Bell, ChevronDown, X, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Avatar } from "./ui";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import NotificationPanel from "@/components/NotificationPanel";
import { toast } from "sonner";

const CommunityHeader = ({ onWritePost, notificationCount = 0 }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileNavItems = [
    { href: "/community", label: t["sidebar.feed"] ?? "Feed" },
    { href: "/community/bookmarks", label: t["sidebar.bookmarks"] ?? "Bookmarks" },
    { href: "/community/roadmaps", label: t["sidebar.roadmaps"] ?? "Roadmaps" },
    { href: "/community/groups", label: t["sidebar.groups"] ?? "Groups" },
    { href: "/community/meetings", label: t["sidebar.meetings"] ?? "Meetings" },
    { href: "/community/chat", label: t["sidebar.chat"] ?? "Chat" },
    { href: "/community/settings", label: t["sidebar.settings"] ?? "Settings" },
    { href: "/community/help", label: t["sidebar.help"] ?? "Help" },
  ];

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/community?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("[CommunityHeader] logout failed", error);
      toast.error(t["nav.logoutError"] ?? "Unable to sign out. Please try again.");
    }
  };

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-900"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? "Close community navigation" : "Open community navigation"}
          aria-expanded={navOpen}
          aria-controls="community-mobile-navigation"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo — shown here on lg-down where the sidebar's own logo is off-screen */}
        <Link to="/community" className="hidden min-[380px]:flex items-center lg:hidden flex-shrink-0">
          <UnicoreLogo />
        </Link>

        {/* Desktop search */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xs relative"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t["header.search"] ?? "Search…"}
            className="w-full pl-8 pr-4 py-2 rounded-full text-sm bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-gray-300 dark:focus:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all"
          />
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">

          <button
            className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Write — icon only, opens the WritePostModal via onWritePost */}
          <button
            onClick={onWritePost ?? (() => navigate("/community/write"))}
            className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            aria-label="Write post"
          >
            <PenSquare size={18} />
          </button>

          <NotificationPanel />

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((s) => !s)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              aria-label="Profile menu"
            >
              <Avatar name={user?.name} photo={user?.photo} size={32} ring />
              <ChevronDown
                size={12}
                className={`text-gray-400 transition-transform hidden sm:block ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-950 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user?.name ?? "Student"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                {[
                  {
                    label: t["nav.profile"] ?? "Profile",
                    href: user?.role === "teacher"
                      ? "/teacher/profile"
                      : user?._id
                      ? `/community/user/${user._id}`
                      : "/profile",
                  },
                  {
                    label: t["nav.stories"] ?? "My Stories",
                    href: user?._id ? `/community/user/${user._id}` : "/community",
                  },
                  {
                    label: t["nav.settings"] ?? "Settings",
                    href: "/community/settings",
                  },
                ].map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    {t["nav.signOut"] ?? "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {navOpen && (
        <nav
          id="community-mobile-navigation"
          className="lg:hidden absolute inset-x-0 top-full z-40 grid grid-cols-2 sm:grid-cols-3 gap-1 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-black p-3 shadow-lg"
          aria-label="Community navigation"
        >
          {mobileNavItems.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setNavOpen(false)}
              className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            >
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      )}

      {searchOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-900 px-4 py-2.5 bg-white dark:bg-black">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t["header.search"] ?? "Search…"}
              className="w-full pl-8 pr-4 py-2 rounded-full text-sm bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
          </form>
        </div>
      )}
    </header>
  );
};

export default CommunityHeader;