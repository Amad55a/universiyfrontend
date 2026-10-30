import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Shield,
  Key,
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  UserCheck,
  Loader2,
} from "lucide-react";
import LibrariansTab from "./LibrariansTab";

import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

import {
  fetchAdminUsers,
  fetchAdminUser,
  fetchAdminRoles,
  fetchAdminAuditLogs,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateAdminUserPermissions,
  USER_FEATURE_KEYS,
} from "@/api/admin";
import {
  createPermissionOverridePatch,
  getCurrentStatus,
  normalizeOverrides,
} from "./userAuthorityHelpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  librarian: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  teacher: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  student: { bg: "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20", text: "text-[#2C2DE0] dark:text-[#2C2DE0]", dot: "bg-[#2C2DE0]" },
  guest: { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
};
const FALLBACK_ROLE_COLOR = { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-400" };
const roleColor = (name) => ROLE_COLORS[name] || FALLBACK_ROLE_COLOR;

const STATUS_CONFIG = {
  active: { icon: CheckCircle2, color: "text-[#2C2DE0] dark:text-[#2C2DE0]", bg: "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20", label: "Active" },
  suspended: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", label: "Suspended" },
  banned: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", label: "Banned" },
  pending: { icon: AlertCircle, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/20", label: "Pending" },
  unknown: { icon: AlertCircle, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700", label: "Unknown" },
};

const formatRelativeTime = (date) => {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};


const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

// ─── Avatar ───────────────────────────────────────────────────────────────────
const UserAvatar = ({ user, size = "md" }) => {
  const sizeMap = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" };
  const initials = (user.name || user.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-[#2C2DE0]", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const color = colors[initials.charCodeAt(0) % colors.length];

  if (user.avatar || user.photo) {
    return <img src={user.avatar || user.photo} alt={user.name} className={`${sizeMap[size]} rounded-full object-cover`} />;
  }
  return <div className={`${sizeMap[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold`}>{initials}</div>;
};

const RoleBadge = ({ role, t }) => {
  const cfg = roleColor(role);
  const label = t.userAuthority.roleLabels[role] || role;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
};

const StatusBadge = ({ status, t }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {t.userAuthority.statuses[status] || status}
    </span>
  );
};

const InlineError = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
};

const Modal = ({ open, onClose, title, children, width = "max-w-lg" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Role Change Modal (assigns a role to a user) ───────────────────────────
const RoleChangeModal = ({ user, roles, onClose, onSave, t }) => {
  const [selectedRole, setSelectedRole] = useState(user?.role || "student");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (selectedRole === user.role) return onClose();
    setSaving(true);
    setError(null);
    try {
      await onSave(user._id || user.id, selectedRole);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this user's role. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const ua = t.userAuthority;
  return (
    <Modal open={!!user} onClose={onClose} title={ua.roleModal.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <UserAvatar user={user} size="md" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <div className="ml-auto"><RoleBadge role={user.role} t={t} /></div>
        </div>

        <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">{ua.roleModal.warningMessage}</p>
        </div>

        <InlineError message={error} />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{ua.roleModal.newRole}</label>
          <div className="grid grid-cols-2 gap-2">
            {roles.filter((r) => ["student", "teacher", "admin"].includes(r.name)).map((role) => {
              const cfg = roleColor(role.name);
              const isSelected = selectedRole === role.name;
              return (
                <button
                  key={role._id}
                  onClick={() => setSelectedRole(role.name)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `border-[#2C2DE0] ${cfg.bg}`
                      : "border-slate-200 dark:border-slate-600 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${isSelected ? cfg.text : "text-slate-700 dark:text-slate-300"}`}>
                      {role.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{role.permissions?.length} perms</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#2C2DE0] dark:text-[#2C2DE0] ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {ua.roleModal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedRole === user.role}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{ua.roleModal.saving}</> : ua.roleModal.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Per-user feature locks (User Authority overrides) ───────────────────────
const FEATURE_LABELS = {
  "reservation.create": "Reserve seats",
  "reservation.reschedule": "Reschedule seats",
  "reservation.cancel": "Cancel seats",
  "book.borrow": "Borrow books",
  "exam.take": "Take exams",
  "lab.access": "Access labs",
  "qr.scan": "QR check-in",
};

const FeatureLocksModal = ({ user, onClose, onSave, t }) => {
  const featureCopy = t.userAuthority.featureModal;
  const [overrides, setOverrides] = useState({});
  const [originalOverrides, setOriginalOverrides] = useState({});
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const loadOverrides = async () => {
      setLoadingOverrides(true);
      setError(null);
      try {
        let detail = user;
        if (!Object.prototype.hasOwnProperty.call(user, "permissionOverrides")) {
          const response = await fetchAdminUser(user._id || user.id);
          detail = response?.data?.data?.user ?? response?.data?.user ?? response?.data?.data;
        }
        if (!detail || !Object.prototype.hasOwnProperty.call(detail, "permissionOverrides")) {
          throw new Error("Permission overrides were not included in the user details response.");
        }
        const normalized = normalizeOverrides(detail.permissionOverrides);
        if (active) {
          setOverrides(normalized);
          setOriginalOverrides(normalized);
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Could not load this user's permission overrides."));
      } finally {
        if (active) setLoadingOverrides(false);
      }
    };
    loadOverrides();
    return () => { active = false; };
  }, [user]);

  const toggle = (key) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[key] === false) next[key] = true;
      else if (next[key] === true) delete next[key];
      else next[key] = false;
      return next;
    });
  };

  const handleSave = async () => {
    const payload = createPermissionOverridePatch(originalOverrides, overrides);
    if (Object.keys(payload).length === 0) return onClose();

    setSaving(true);
    setError(null);
    try {
      await onSave(user._id || user.id, payload);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update feature locks."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={featureCopy.title}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {featureCopy.description} <strong>{user?.fullName || user?.name || user?.email}</strong>
        </p>
        <InlineError message={error} />
        {loadingOverrides ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />{featureCopy.loading}
          </div>
        ) : (
        <div className="space-y-2">
          {USER_FEATURE_KEYS.map((key) => {
            const state = Object.prototype.hasOwnProperty.call(overrides, key)
              ? overrides[key] ? "allowed" : "blocked"
              : "inherit";
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                disabled={Boolean(error) || saving}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all ${
                  state === "blocked"
                    ? "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : state === "allowed"
                      ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{FEATURE_LABELS[key] || key}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {state === "blocked" ? featureCopy.blocked : state === "allowed" ? featureCopy.allowed : featureCopy.roleDefault}
                </span>
              </button>
            );
          })}
        </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-800">{featureCopy.cancel}</button>
          <button type="button" onClick={handleSave} disabled={saving || loadingOverrides || Boolean(error)} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#2C2DE0] disabled:opacity-50">
            {saving ? featureCopy.saving : featureCopy.save}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Status Change Modal ──────────────────────────────────────────────────────
const StatusChangeModal = ({ user, initialStatus, onClose, onSave, t }) => {
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || getCurrentStatus(user));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const ua = t.userAuthority;
  const statuses = ["active", "suspended", "banned", "pending"];

  const handleSave = async () => {
    if (selectedStatus === "unknown" || selectedStatus === getCurrentStatus(user)) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(user._id || user.id, selectedStatus, reason);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this user's status. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={ua.statusModal.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <UserAvatar user={user} />
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <div className="ml-auto"><StatusBadge status={getCurrentStatus(user)} t={t} /></div>
        </div>

        <InlineError message={error} />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{ua.statusModal.newStatus}</label>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              const isSelected = selectedStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `border-[#2C2DE0] ${cfg.bg}`
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? cfg.color : "text-slate-400"}`} />
                  <span className={`text-sm font-medium ${isSelected ? cfg.color : "text-slate-700 dark:text-slate-300"}`}>
                    {ua.statuses[s]}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#2C2DE0] dark:text-[#2C2DE0] ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{ua.statusModal.reason}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={ua.statusModal.reasonPlaceholder}
            rows={2}
            className="w-full text-sm px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            {ua.statusModal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedStatus === "unknown" || selectedStatus === getCurrentStatus(user)}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{ua.statusModal.saving}</> : ua.statusModal.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── USERS TAB ────────────────────────────────────────────────────────────────
const UsersTab = ({
  t,
  users,
  roles,
  loading,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
  onRoleChange,
  onStatusChange,
  onFeatureLocks,
}) => {
  const [search, setSearch] = useState("");
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [locksModalUser, setLocksModalUser] = useState(null);
  const ua = t.userAuthority;

  useEffect(() => {
    const timer = setTimeout(() => onFilterChange({ search }), 300);
    return () => clearTimeout(timer);
  }, [search, onFilterChange]);

  const roleFilter = filters.role || "all";
  const statusFilter = filters.status || "all";
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id || "").toLowerCase().includes(q) || String(u._id || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || getCurrentStatus(u) === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalUsers = pagination?.total ?? users.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: ua.users.totalUsers, value: totalUsers, icon: <Users className="w-4 h-4 text-slate-500" /> },
          { label: ua.users.showingUsers, value: users.length, icon: <UserCheck className="w-4 h-4 text-slate-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
              {icon}
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ua.users.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => onFilterChange({ role: e.target.value })}
          className="px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]"
        >
          <option value="all">{ua.users.allRoles}</option>
          {roles.map((r) => <option key={r._id} value={r.name}>{r.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]"
        >
          <option value="all">{ua.users.allStatuses}</option>
          {["active", "suspended", "banned", "pending"].map((s) => (
            <option key={s} value={s}>{ua.statuses[s]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />{ua.users.loading}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{ua.users.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {Object.values(ua.users.tableHeaders).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name || user.fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} t={t} /></td>
                    <td className="px-4 py-3"><StatusBadge status={getCurrentStatus(user)} t={t} /></td>
                    <td className="px-4 py-3">
                      {Object.prototype.hasOwnProperty.call(user, "permissionOverrides") ? (
                        (() => {
                          const overrides = normalizeOverrides(user.permissionOverrides);
                          const allowed = Object.values(overrides).filter((value) => value === true).length;
                          const blocked = Object.values(overrides).filter((value) => value === false).length;
                          return (
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              {allowed + blocked === 0
                                ? ua.users.noOverrides
                                : `${allowed} ${ua.users.allowedOverrides} · ${blocked} ${ua.users.blockedOverrides}`}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-slate-400">{ua.users.overridesNotInList}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs flex items-center gap-1 ${user.emailVerified || user.isVerified ? "text-[#2C2DE0] dark:text-[#2C2DE0]" : "text-slate-400"}`}>
                          {user.emailVerified || user.isVerified ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Email
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${user.isUniversityVerified ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                          {user.isUniversityVerified ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Uni
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(user.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => setRoleModalUser(user)}
                          type="button"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0] hover:bg-[#2C2DE0]/20 dark:hover:bg-[#2C2DE0]/40 rounded-lg transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          {ua.users.actions.editRole}
                        </button>
                        <button
                          onClick={() => setLocksModalUser(user)}
                          type="button"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-lg transition-colors"
                        >
                          <Key className="w-3 h-3" />
                          Locks
                        </button>
                        <button
                          onClick={() => setStatusModalUser({
                            ...user,
                            requestedStatus: getCurrentStatus(user) === "active" ? "suspended" : "active",
                          })}
                          type="button"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                          <UserCheck className="w-3 h-3" />
                          {getCurrentStatus(user) === "active"
                            ? ua.users.actions.deactivate
                            : ua.users.actions.activate}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {roleModalUser && (
        <RoleChangeModal key={roleModalUser._id || roleModalUser.id} user={roleModalUser} roles={roles} onClose={() => setRoleModalUser(null)} onSave={onRoleChange} t={t} />
      )}
      {statusModalUser && (
        <StatusChangeModal key={statusModalUser._id || statusModalUser.id} user={statusModalUser} initialStatus={statusModalUser.requestedStatus} onClose={() => setStatusModalUser(null)} onSave={onStatusChange} t={t} />
      )}
      {locksModalUser && (
        <FeatureLocksModal key={locksModalUser._id || locksModalUser.id} user={locksModalUser} onClose={() => setLocksModalUser(null)} onSave={onFeatureLocks} t={t} />
      )}
      {!loading && pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {ua.users.pageOf
              .replace("{page}", String(pagination.page || filters.page || 1))
              .replace("{pages}", String(pagination.totalPages))}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onPageChange(Math.max(1, (filters.page || 1) - 1))} disabled={(filters.page || 1) <= 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">
              {ua.users.previous}
            </button>
            <button type="button" onClick={() => onPageChange(Math.min(pagination.totalPages, (filters.page || 1) + 1))} disabled={(filters.page || 1) >= pagination.totalPages} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">
              {ua.users.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AUDIT LOG TAB ────────────────────────────────────────────────────────────
const AuditLogTab = ({ t, logs, loading }) => {
  const ua = t.userAuthority;
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = useMemo(() =>
    logs.filter((l) => actionFilter === "all" || l.action === actionFilter),
    [logs, actionFilter]
  );

  const actionColors = {
    role_created: "bg-[#2C2DE0] dark:bg-[#2C2DE0]/30 text-[#2C2DE0] dark:text-[#2C2DE0]",
    role_updated: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    role_deleted: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    role_permissions_updated: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    university_verification_completed: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    user_logged_in: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{ua.auditLog.title}</h2>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]"
        >
          <option value="all">{ua.auditLog.allActions}</option>
          {Object.entries(ua.auditLog.actions).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />{ua.auditLog.loading}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500">
            <ClipboardList className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{ua.auditLog.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((log) => (
              <div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className={`flex-shrink-0 mt-0.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${actionColors[log.action] || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
                  {ua.auditLog.actions[log.action] || log.action}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-medium">{log.userId?.name || "System"}</span>
                    {" — "}
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                      {JSON.stringify(log.details).slice(0, 80)}
                    </span>
                  </p>
                  {log.performedBy && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      by {log.performedBy?.name}
                    </p>
                  )}
                </div>
                <p className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {formatRelativeTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function UserAuthorityPage() {
  const { t } = useLanguage();
  const ua = t.userAuthority;

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({ page: 1, limit: 100, search: "", role: "all", status: "all" });
  const [userPagination, setUserPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(true);
  const [pageError, setPageError] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  // IMPORTANT: sendPaginated() on the backend returns the array directly under
  // `data` (i.e. res.data.data IS the array of users/logs) — there is no
  // nested `.users` / `.auditLogs` key. sendSuccess() (used for roles and
  // permissions) DOES nest under a named key. These two response shapes are
  // different on purpose, so don't "fix" them to match each other — just
  // unwrap each one correctly, as below.
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchAdminUsers(userFilters);
      setUsers(Array.isArray(res?.data?.data) ? res.data.data : []);
      setUserPagination(res?.data?.pagination || {
        page: userFilters.page,
        totalPages: 1,
        total: Array.isArray(res?.data?.data) ? res.data.data.length : 0,
      });
    } catch (err) {
      console.error("Failed to load users:", err);
      setPageError(getErrorMessage(err, "Could not load users from the server."));
    } finally {
      setLoadingUsers(false);
    }
  }, [userFilters]);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await fetchAdminRoles();
      setRoles(res?.data?.data?.roles ?? []);
    } catch (err) {
      console.error("Failed to load roles:", err);
      setPageError(getErrorMessage(err, "Could not load roles from the server."));
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetchAdminAuditLogs();
      setAuditLogs(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, []);

  const loadData = useCallback(() => {
    setPageError(null);
    loadUsers();
    loadRoles();
    loadAuditLogs();
  }, [loadUsers, loadRoles, loadAuditLogs]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadUsers(); }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRoles();
      void loadAuditLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRoles, loadAuditLogs]);

  const handleUserFilterChange = useCallback((updates) => {
    setUserFilters((current) => ({ ...current, ...updates, page: 1 }));
  }, []);

  const handleUserPageChange = useCallback((page) => {
    setUserFilters((current) => ({ ...current, page }));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    await updateAdminUserRole(userId, newRole);
    toast.success(ua.roleModal.successMessage);
    await loadUsers();
  };

  const handleStatusChange = async (userId, newStatus, reason) => {
    await updateAdminUserStatus(userId, newStatus, reason);
    toast.success(ua.statusModal.successMessage);
    await loadUsers();
  };

  const handleFeatureLocks = async (userId, overrides) => {
    await updateAdminUserPermissions(userId, overrides);
    toast.success(ua.users.permissionsSaved);
    await loadUsers();
  };

  const tabs = [
    { id: "users", label: ua.tabs.users, icon: <Users className="w-4 h-4" />, count: userPagination.total },
    { id: "librarians", label: ua.tabs.librarians || "Librarians", icon: <Shield className="w-4 h-4" /> },
    { id: "auditLog", label: ua.tabs.auditLog, icon: <ClipboardList className="w-4 h-4" />, count: auditLogs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <span>Admin</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 dark:text-slate-200 font-medium">{ua.breadcrumb || ua.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-9 h-9 bg-[#2C2DE0] rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {ua.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{ua.subtitle}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers || loadingRoles ? "animate-spin" : ""}`} />
            {ua.retry}
          </button>
        </div>

        {pageError && (
          <div className="flex gap-2 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{pageError}</p>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl mb-6 overflow-x-auto">
          {tabs.map(({ id, label, icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                activeTab === id
                  ? "bg-[#2C2DE0] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {icon}
              {label}
              {count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <UsersTab
            t={t}
            users={users}
            roles={roles}
            loading={loadingUsers}
            pagination={userPagination}
            filters={userFilters}
            onFilterChange={handleUserFilterChange}
            onPageChange={handleUserPageChange}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            onFeatureLocks={handleFeatureLocks}
          />
        )}
        {activeTab === "auditLog" && (
          <AuditLogTab t={t} logs={auditLogs} loading={loadingAuditLogs} />
        )}
        {activeTab === "librarians" && <LibrariansTab />}
      </div>
    </div>
  );
}