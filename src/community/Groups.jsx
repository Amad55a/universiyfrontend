import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, GraduationCap, Layers, BookOpen, Archive, Search, Building2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getMyGroups, searchGroups } from "@/api/groupApi";
import { Spinner } from "./ui";

const BTN_PRIMARY =
  "bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none";

const SECTIONS = [
  { key: "university", label: "University", icon: Building2 },
  { key: "department", label: "Department", icon: Users },
  { key: "semester", label: "Semester", icon: Layers },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "classes", label: "Classes", icon: Layers },
  { key: "teacherGroups", label: "Teacher Groups", icon: GraduationCap },
];

const EMPTY_GROUPS = {
  university: [],
  department: [],
  semester: [],
  courses: [],
  classes: [],
  teacherGroups: [],
};

const GroupCard = ({ group }) => (
  <Link
    to={`/community/groups/${group._id}`}
    className="block p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black hover:border-[#2C2DE0] transition-colors"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#2C2DE0] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
        {(group.name ?? "").slice(0, 2).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-black text-black dark:text-white">{group.name ?? "—"}</h2>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {group.semester && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]">
              Semester {group.semester}
            </span>
          )}
          {group.postPolicy === "admins_only" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              Announcements only
            </span>
          )}
        </div>
        <p className="text-xs text-black/40 dark:text-white/40 mt-2 flex items-center gap-1">
          <Users size={12} />
          {group.memberCount} members
        </p>
      </div>
      <span className={`px-4 py-2 rounded-xl ${BTN_PRIMARY} flex-shrink-0`}>Open</span>
    </div>
  </Link>
);

const Groups = () => {
  const { t } = useLanguage();
  const [groups, setGroups] = useState(EMPTY_GROUPS);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("courses");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyGroups();
      if (data.success) setGroups({ ...EMPTY_GROUPS, ...data.groups });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced cross-section search — falls back to filtering the active tab locally when query is short
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await searchGroups(q);
        if (data.success) setSearchResults(data.groups);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const activeGroups =
    searchResults ??
    (groups[active] ?? []).filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 hidden sm:block">
        <h1 className="text-lg font-black text-black dark:text-white mb-4 px-2">
          {t["community.nav.groups"] ?? "Groups"}
        </h1>
        <nav className="space-y-1">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActive(key);
                setQuery("");
                setSearchResults(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                active === key
                  ? "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
                  : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActive("archived")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
              active === "archived"
                ? "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
                : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Archive size={16} />
            Archived
          </button>
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white focus:outline-none focus:border-[#2C2DE0]"
          />
        </div>

        {loading || searching ? (
          <div className="flex justify-center py-20">
            <Spinner size={20} className="text-[#2C2DE0]" />
          </div>
        ) : active === "archived" ? (
          <div className="text-center py-24">
            <Archive size={36} className="mx-auto text-black/20 dark:text-white/20 mb-3" />
            <p className="text-sm font-semibold text-black/50 dark:text-white/50">No archived groups</p>
          </div>
        ) : activeGroups.length === 0 ? (
          <div className="text-center py-24">
            <Users size={36} className="mx-auto text-black/20 dark:text-white/20 mb-3" />
            <p className="text-sm font-semibold text-black/50 dark:text-white/50">Nothing here yet</p>
            <p className="text-xs text-black/30 dark:text-white/30 mt-1">
              Groups appear automatically based on your enrollment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGroups.map((g) => (
              <GroupCard key={g._id} group={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;