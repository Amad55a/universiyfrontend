import React from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search, Users } from "lucide-react";
import PageHeader from "@/admin/components/PageHeader";
import PageTransition from "@/admin/components/PageTransition";
import { fetchAdminGroups, synchronizeAdminGroups } from "@/api/admin";

const GROUP_TYPES = [
  ["", "All group types"],
  ["university", "University"],
  ["department", "Department"],
  ["teacher_group", "Teacher-only"],
  ["semester", "Semester"],
  ["course", "Course"],
  ["class", "Class"],
];

const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState({ q: "", type: "", department: "", semester: "" });
  const [filterOptions, setFilterOptions] = useState({ departments: [], semesters: [] });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchAdminGroups({ ...filters, page, limit: 25 });
      setGroups(data.groups || []);
      setFilterOptions(data.filters || { departments: [], semesters: [] });
      setPages(data.pagination?.pages || 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load groups. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => void loadGroups(), 250);
    return () => clearTimeout(timer);
  }, [loadGroups]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const repairMemberships = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const { data } = await synchronizeAdminGroups();
      setSyncResult(data.message || "Membership synchronization completed.");
      await loadGroups();
    } catch (requestError) {
      setSyncResult(requestError.response?.data?.message || "Membership synchronization failed. Retry.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <PageTransition>
      <div className="px-4 py-5 sm:px-6">
        <PageHeader
          title="Groups"
          subtitle="Review academic groups, access, membership roles, and member counts."
          actions={(
            <button
              type="button"
              onClick={repairMemberships}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Synchronizing..." : "Sync memberships"}
            </button>
          )}
        />

        {syncResult && <p role="status" className="mb-4 rounded-xl bg-gray-100 p-3 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-200">{syncResult}</p>}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Group filters">
          <label className="relative">
            <span className="sr-only">Search groups</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Search groups..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-black"
            />
          </label>
          <label>
            <span className="sr-only">Filter by group type</span>
            <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-black">
              {GROUP_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by department</span>
            <select value={filters.department} onChange={(event) => updateFilter("department", event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-black">
              <option value="">All departments</option>
              {filterOptions.departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by semester</span>
            <select value={filters.semester} onChange={(event) => updateFilter("semester", event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-black">
              <option value="">All semesters</option>
              {filterOptions.semesters.map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
            </select>
          </label>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 p-6 text-center dark:border-red-900">
            <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</p>
            <button type="button" onClick={loadGroups} className="rounded-lg border px-4 py-2 text-sm font-semibold">Retry</button>
          </div>
        ) : loading ? (
          <div role="status" className="py-16 text-center text-sm text-gray-500">Loading groups...</div>
        ) : !groups.length ? (
          <div className="rounded-2xl border border-gray-200 p-10 text-center dark:border-white/10">
            <Users size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No groups match these filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <article key={group._id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-black sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-white">{group.name}</h2>
                    <p className="mt-1 text-xs capitalize text-gray-500">
                      {group.type.replace("_", " ")}
                      {group.courseId?.courseCode ? ` · ${group.courseId.courseCode}` : ""}
                      {group.departmentId ? ` · ${group.departmentId.name || "Department"}` : group.courseId?.department ? ` · ${group.courseId.department}` : ""}
                      {group.semester ? ` · Semester ${group.semester}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{group.memberCount} members</span>
                    <Link to={`/community/groups/${group._id}`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-[#2C2DE0] dark:border-white/10">Manage group</Link>
                  </div>
                </div>
                <details className="mt-4 border-t border-gray-100 pt-3 dark:border-white/10">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-500">View members and roles</summary>
                  {group.members?.length ? (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {group.members.map((member, index) => (
                        <li key={`${member.user?._id || "member"}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-gray-700 dark:text-gray-200">{member.user?.name || "Unknown user"}</span>
                          <span className="shrink-0 text-gray-500">{member.adminLevel?.replace("_", " ") || member.role}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-xs text-gray-500">No members.</p>}
                </details>
              </article>
            ))}
            <div className="flex items-center justify-between py-2 text-sm">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
              <span className="text-gray-500">Page {page} of {pages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page >= pages} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default GroupsPage;
