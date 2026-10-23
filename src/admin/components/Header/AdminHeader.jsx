import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  Menu,
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
import { LoaderCircle, Search as SearchIcon } from "lucide-react";
import { searchAdmin } from "@/api/adminSearch";

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
  "/admin/profile": "profile",
};

const getPageKey = (pathname) => PAGE_TITLE_KEYS[pathname];
const isSafeAdminHref = (href) => typeof href === "string" && href.startsWith("/admin/") && !href.startsWith("//");

const AdminHeader = ({ onMenuClick, pageTitle, breadcrumbs = [] }) => {
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchRequest, setSearchRequest] = useState({ query: "", status: "idle", categories: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const profileRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const pageKey = getPageKey(location.pathname) ??
    (location.pathname.startsWith("/admin/search/") ? "searchDetail" : undefined);
  const resolvedTitle =
    pageTitle ??
    (pageKey ? ap.pages[pageKey]?.title : ap.pages.dashboard.title);

  const crumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: ap.breadcrumbs.home, path: "/admin/dashboard" }, { label: resolvedTitle }];

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (
        !desktopSearchRef.current?.contains(e.target) &&
        !mobileSearchRef.current?.contains(e.target)
      ) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const trimmedSearch = search.trim();
  useEffect(() => {
    if (trimmedSearch.length < 2) {
      setSearchRequest({ query: trimmedSearch, status: "idle", categories: [] });
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchRequest({ query: trimmedSearch, status: "loading", categories: [] });
      try {
        const data = await searchAdmin(trimmedSearch, controller.signal);
        if (active) setSearchRequest({ query: trimmedSearch, status: "success", categories: data.categories });
      } catch {
        if (active && !controller.signal.aborted) {
          setSearchRequest({ query: trimmedSearch, status: "error", categories: [] });
        }
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedSearch, searchAttempt]);

  const currentSearch = searchRequest.query === trimmedSearch
    ? searchRequest
    : { status: trimmedSearch.length >= 2 ? "loading" : "idle", categories: [] };
  const flattenedResults = currentSearch.categories.flatMap((category) =>
    category.items
      .filter((item) => isSafeAdminHref(item.href))
      .map((item) => ({ ...item, category: category.name }))
  );

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      setActiveSearchIndex(-1);
      event.currentTarget.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!flattenedResults.length) return;
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((index) => event.key === "ArrowDown"
        ? (index + 1) % flattenedResults.length
        : (index <= 0 ? flattenedResults.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter" && currentSearch.status === "success" && flattenedResults.length) {
      const index = activeSearchIndex < 0 ? 0 : activeSearchIndex;
      const result = flattenedResults[index];
      if (isSafeAdminHref(result?.href)) {
        event.preventDefault();
        navigate(result.href);
        setSearchOpen(false);
        setSearch("");
        setActiveSearchIndex(-1);
      }
    }
  };

  const retrySearch = () => setSearchAttempt((attempt) => attempt + 1);
  const clearSearch = () => {
    setSearch("");
    setSearchRequest({ query: "", status: "idle", categories: [] });
    setActiveSearchIndex(-1);
  };

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
        "sticky top-0 z-20 min-h-14 shrink-0",
        "border-b border-gray-200/60 dark:border-white/10",
        "bg-white/70 dark:bg-black/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60"
      )}
    >
      <div className="flex min-h-14 items-center gap-3 px-4 lg:px-6">
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

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div ref={desktopSearchRef} className="relative hidden min-w-[170px] max-w-sm flex-1 md:block">
            <SearchBar
              value={search}
              onChange={(value) => { setSearch(value); setActiveSearchIndex(-1); }}
              placeholder={ap.header.searchPlaceholder}
              className="w-full"
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              expanded={searchOpen}
              activeDescendant={activeSearchIndex >= 0 ? `admin-search-option-${activeSearchIndex}` : undefined}
              clearLabel={ap.header.clearSearch}
              onClear={clearSearch}
            />
            {searchOpen && (
              <SearchResults
                categories={currentSearch.categories}
                status={currentSearch.status}
                query={search}
                copy={ap}
                retry={retrySearch}
                activeIndex={activeSearchIndex}
                onActiveIndexChange={setActiveSearchIndex}
                onNavigate={() => { setSearchOpen(false); clearSearch(); }}
              />
            )}
          </div>

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
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#2C2DE0] to-[#2C2DE0] text-xs font-bold text-white">
                {user?.photo || user?.avatar
                  ? <img src={user.photo || user.avatar} alt="" className="h-full w-full object-cover" />
                  : initials}
              </span>
              <span className="hidden md:block text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                {user?.name}
              </span>
            </button>
            <AnimatePresence>
              {profileOpen && (
                <div
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
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div ref={mobileSearchRef} className="relative px-4 pb-3 md:hidden">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setActiveSearchIndex(-1); }}
          placeholder={ap.header.searchPlaceholder}
          className="w-full"
          onFocus={() => setSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          expanded={searchOpen}
          activeDescendant={activeSearchIndex >= 0 ? `admin-search-option-${activeSearchIndex}` : undefined}
          clearLabel={ap.header.clearSearch}
          onClear={clearSearch}
        />
        {searchOpen && (
          <SearchResults
            categories={currentSearch.categories}
            status={currentSearch.status}
            query={search}
            copy={ap}
            retry={retrySearch}
            activeIndex={activeSearchIndex}
            onActiveIndexChange={setActiveSearchIndex}
            onNavigate={() => { setSearchOpen(false); clearSearch(); }}
          />
        )}
      </div>
    </header>
  );
};

const SearchResults = ({
  categories = [],
  status,
  query,
  copy,
  retry,
  activeIndex,
  onActiveIndexChange,
  onNavigate,
}) => {
  const safeCategories = Array.isArray(categories)
    ? categories.filter((category) => category && typeof category.name === "string" && Array.isArray(category.items) && category.items.length > 0)
    : [];
  let itemIndex = 0;
  const header = copy.header;

  return (
    <div
      id="admin-global-search-results"
      role="listbox"
      aria-label={header.searchPlaceholder}
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(60vh,26rem)] overflow-y-auto rounded-xl border border-gray-200/90 bg-white p-1.5 shadow-xl shadow-gray-900/10 dark:border-white/10 dark:bg-gray-950 sm:p-2 md:left-auto md:right-0 md:w-[min(34rem,calc(100vw-2rem))]"
      onMouseDown={(event) => event.stopPropagation()}
    >
      {status === "loading" ? (
        <p className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500"><LoaderCircle size={15} className="animate-spin" />{header.searching}</p>
      ) : status === "error" ? (
        <div role="alert" className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-red-600">
          <span>{header.searchError}</span>
          <button type="button" onClick={retry} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#2C2DE0] hover:bg-[#2C2DE0]/10">
            {header.searchRetry}
          </button>
        </div>
      ) : query.trim().length < 2 ? (
        <p className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500"><SearchIcon size={15} />{header.searchIdle ?? header.searchMin}</p>
      ) : safeCategories.length ? safeCategories.map((category) => (
        <section key={category.name} className="py-1">
          <h2 className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {header.searchCategories?.[category.name] ?? category.name}
          </h2>
          {category.items.map((item) => {
            const index = isSafeAdminHref(item.href) ? itemIndex++ : -1;
            const rowClassName = `block rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/60 ${
              activeIndex === index ? "bg-[#2C2DE0]/10" : "hover:bg-gray-100 dark:hover:bg-white/5"
            }`;
            const row = (
              <>
                <span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{item.label}</span>
                {item.description && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.description}</span>}
              </>
            );
            return isSafeAdminHref(item.href) ? (
              <Link
                id={`admin-search-option-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                key={`${category.name}-${item.id ?? item.label}`}
                to={item.href}
                onClick={onNavigate}
                onMouseEnter={() => onActiveIndexChange(index)}
                className={rowClassName}
              >
                {row}
              </Link>
            ) : (
              <div
                id={index >= 0 ? `admin-search-option-${index}` : undefined}
                key={`${category.name}-${item.id ?? item.label}`}
                role="option"
                aria-selected={false}
                className={`${rowClassName} cursor-default`}
              >
                {row}
              </div>
            );
          })}
        </section>
      )) : (
        <div className="px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <SearchIcon size={15} />{header.searchNoResults}
          </p>
          <p className="mt-1 pl-6 text-xs text-gray-500">{header.searchTryAnother}</p>
        </div>
      )}
    </div>
  );
};

export default AdminHeader;
