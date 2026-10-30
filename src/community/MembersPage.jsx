import React, { useEffect, useMemo, useState } from "react";
import { Search, MessageCircle, MoreVertical, Star, UserMinus, ShieldCheck, UserX, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AuthorName } from "./ui";
import {
  getGroupMembers,
  getMemberStats,
  promoteRepresentative,
  removeMember,
  changeMemberRole,
  suspendMember,
  exportMembers,
} from "../api/memberApi";
import { getOrCreatePrivateChat } from "@/api/chatApi";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import MemberProfileModal from "./components/memberprofilemodel";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "lecturer", label: "Lecturers" },
  { key: "student", label: "Students" },
  { key: "representative", label: "Representatives" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

const StatusDot = ({ status }) => {
  const color = status === "online" ? "bg-[#2C2DE0]" : status === "away" ? "bg-yellow-400" : "bg-gray-300";
  const text = status === "online" ? "Online" : status === "away" ? "Away" : "Offline";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {text}
    </span>
  );
};

// Action menu — what a member can do to another member, based on the
// permission table in the spec (student / lecturer / admin).
const MemberActions = ({ member, viewerRole, onMessage, onPromote, onRemove, onChangeRole, onSuspend }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = viewerRole === "lecturer" || viewerRole === "admin";

  if (!canManage) {
    return (
      <button
        onClick={onMessage}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2C2DE0] text-white shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all"
      >
        Message
      </button>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={onMessage}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2C2DE0] text-white shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all"
      >
        Message
      </button>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
      >
        <MoreVertical size={16} />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl py-1"
          onMouseLeave={() => setMenuOpen(false)}
        >
          {member.role !== "representative" && (
            <button onClick={onPromote} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900">
              <Star size={14} className="text-[#2C2DE0]" /> Promote to rep
            </button>
          )}
          {viewerRole === "admin" && (
            <button onClick={onChangeRole} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900">
              <ShieldCheck size={14} className="text-[#2C2DE0]" /> Change role
            </button>
          )}
          {viewerRole === "admin" && (
            <button onClick={onSuspend} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <UserX size={14} /> Suspend
            </button>
          )}
          <button onClick={onRemove} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            <UserMinus size={14} /> Remove
          </button>
        </div>
      )}
    </div>
  );
};

const MemberRow = ({ member, viewerRole, onOpenProfile, onMessage, onPromote, onRemove, onChangeRole, onSuspend }) => (
  <div className="flex items-center justify-between py-3 px-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <button
      onClick={() => onOpenProfile(member)}
      className="flex items-center gap-3 text-left flex-1 min-w-0"
    >
      <Avatar name={member.fullName || member.name} photo={member.photo || member.avatar} size={40} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1">
          <AuthorName user={member} />
        </p>
        <p className="text-xs text-gray-400 capitalize">
          {member.role === "representative" ? "Class Representative" : member.role}
        </p>
        <StatusDot status={member.status} />
      </div>
    </button>
    <MemberActions
      member={member}
      viewerRole={viewerRole}
      onMessage={() => onMessage(member)}
      onPromote={() => onPromote(member)}
      onRemove={() => onRemove(member)}
      onChangeRole={() => onChangeRole(member)}
      onSuspend={() => onSuspend(member)}
    />
  </div>
);

/**
 * Members module — matches the spec: member list, search, filters,
 * live stats, presence, and role-based management actions.
 * Colors follow the app's existing system (no new palette introduced):
 *   accent green #2C2DE0 / #1E1FAA shadow, white / gray-950 dark surface,
 *   gray-100/800 hairlines, Geist Variable type.
 */
const MembersPage = ({ groupId: propGroupId, groupName, currentUser: propCurrentUser }) => {
  const navigate = useNavigate();
  const { groupId: paramGroupId } = useParams();
  const { user: authUser } = useAuth();

  // Use prop groupId if provided, otherwise use URL param
  const groupId = propGroupId || paramGroupId;
  const currentUser = propCurrentUser || authUser;
  const viewerRole = currentUser?.role || "student";

  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  const load = async (nextPage = 1, replace = false) => {
    setLoading(true);
    try {
      const data = await getGroupMembers(groupId, { search, filter, page: nextPage });
      setMembers((prev) => (replace ? data.members : [...prev, ...data.members]));
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } catch {
      toast.error("Could not load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMemberStats(groupId).then((d) => d?.success && setStats(d.stats)).catch(() => { });
  }, [groupId]);

  useEffect(() => {
    const t = setTimeout(() => load(1, true), 250); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, groupId]);

  const grouped = useMemo(() => {
    // Lecturers surfaced first, matching the spec's card ordering
    const lecturers = members.filter((m) => m.role === "lecturer");
    const rest = members.filter((m) => m.role !== "lecturer");
    return [...lecturers, ...rest];
  }, [members]);

  const handleMessage = async (member) => {
    try {
      const data = await getOrCreatePrivateChat(member._id);
      if (!data?.success || !data.conversation?._id) {
        throw new Error(data?.message || "Could not start chat");
      }
      navigate(`/community/chat?id=${data.conversation._id}`, {
        state: { conversation: data.conversation },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not start chat");
    }
  };

  const handlePromote = async (member) => {
    try {
      await promoteRepresentative(groupId, member._id);
      toast.success(`${member.fullName || member.name} promoted to representative`);
      load(1, true);
    } catch {
      toast.error("Could not promote member");
    }
  };

  const handleRemove = async (member) => {
    try {
      await removeMember(groupId, member._id);
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
    } catch {
      toast.error("Could not remove member");
    }
  };

  const handleChangeRole = async (member) => {
    const role = window.prompt("New role (student / lecturer / representative / admin):", member.role);
    if (!role) return;
    try {
      await changeMemberRole(groupId, member._id, role);
      toast.success("Role updated");
      load(1, true);
    } catch {
      toast.error("Could not change role");
    }
  };

  const handleSuspend = async (member) => {
    try {
      await suspendMember(groupId, member._id);
      toast.success("Member suspended");
      load(1, true);
    } catch {
      toast.error("Could not suspend member");
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportMembers(groupId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${groupName || "members"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export members");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-950" style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-gray-900 dark:text-white">{groupName}</h1>
          {viewerRole === "admin" && (
            <button
              onClick={handleExport}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
              title="Export member list"
            >
              <Download size={16} />
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-2 mt-4">
            <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-center">
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-[11px] text-gray-400 font-medium">Members</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-center">
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.students}</p>
              <p className="text-[11px] text-gray-400 font-medium">Students</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-center">
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.lecturers}</p>
              <p className="text-[11px] text-gray-400 font-medium">Lecturers</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-center">
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.representatives}</p>
              <p className="text-[11px] text-gray-400 font-medium">Reps</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, semester, role..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#2C2DE0]/40"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === f.key
                  ? "bg-[#2C2DE0] text-white"
                  : "bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="px-4">
        {loading && members.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#2C2DE0]" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">No members match your search.</p>
        ) : (
          grouped.map((m) => (
            <MemberRow
              key={m._id}
              member={m}
              viewerRole={viewerRole}
              onOpenProfile={setSelectedMember}
              onMessage={handleMessage}
              onPromote={handlePromote}
              onRemove={handleRemove}
              onChangeRole={handleChangeRole}
              onSuspend={handleSuspend}
            />
          ))
        )}

        {hasMore && !loading && members.length > 0 && (
          <button
            onClick={() => load(page + 1)}
            className="w-full py-3 text-sm font-bold text-[#2C2DE0] hover:underline"
          >
            Load more...
          </button>
        )}
      </div>

      <MemberProfileModal
        member={selectedMember}
        groupId={groupId}
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        currentUserId={currentUser?._id}
      />
    </div>
  );
};

export default MembersPage;