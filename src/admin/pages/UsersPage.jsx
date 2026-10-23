import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, CheckCircle2 } from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import DataTable from "@/admin/components/DataTable";
import FilterDropdown from "@/admin/components/FilterDropdown";
import Modal from "@/admin/components/Modal";
import ConfirmDialog from "@/admin/components/ConfirmDialog";
import StatusBadge from "@/admin/components/StatusBadge";
import UserActionDropdown from "@/admin/components/UserActionDropdown";
import { useLanguage } from "@/hooks/useLanguage";
import {
  bulkUpdateAdminUsers,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateAdminUserUniversityVerification,
} from "@/api/admin";

const emptyForm = {
  fullName: "",
  email: "",
  studentId: "",
  password: "",
  confirmPassword: "",
  role: "student",
  accountStatus: "active",
  emailVerified: true,
  universityVerified: false,
};

const getUniversityVerification = (user) => {
  if (user?.isUniversityVerified === true || user?.universityVerified === true) return true;
  if (user?.isUniversityVerified === false || user?.universityVerified === false) return false;
  return null;
};

const UsersPage = () => {
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const p = ap.pages.users;
  const c = ap.common;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    role: "all",
    accountStatus: "all",
    emailVerified: "all",
    universityVerified: "all",
  });
  const [sort, setSort] = useState({ sortBy: "createdAt", sortDir: "desc" });
  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = useMemo(
    () => ({ page, limit, search, ...filters, ...sort }),
    [page, limit, search, filters, sort]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users", queryParams],
    queryFn: async () => {
      const res = await fetchAdminUsers(queryParams);
      return res.data;
    },
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const validateForm = () => {
    const errors = {};
    const passwordRequired = creatingUser;
    const hasPassword = Boolean(form.password);

    if (!form.fullName.trim()) errors.fullName = p.validation.fullNameRequired;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = p.validation.emailInvalid;
    if (!["student", "admin", "librarian", "teacher", "authority"].includes(form.role)) errors.role = p.validation.roleInvalid;
    if (!["active", "suspended", "banned", "pending"].includes(form.accountStatus)) errors.accountStatus = p.validation.statusInvalid;
    if (passwordRequired || hasPassword) {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
        errors.password = p.validation.passwordStrong;
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = p.validation.passwordMatch;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = () => {
    if (!validateForm()) return;
    const payload = { ...form };
    delete payload.confirmPassword;
    if (!payload.password) delete payload.password;
    if (editingUser && getUniversityVerification(editingUser) === null) {
      delete payload.universityVerified;
    }

    if (editingUser) updateMutation.mutate({ id: editingUser.id, payload });
    else createMutation.mutate(payload);
  };

  const getErrorMessage = (error) => error?.response?.data?.message || ap.toast.error;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAdminUser(id, payload),
    onSuccess: () => {
      toast.success(ap.toast.userUpdated);
      setEditingUser(null);
      setFormErrors({});
      invalidateUsers();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success(ap.toast.userCreated);
      setCreatingUser(false);
      setForm(emptyForm);
      setFormErrors({});
      invalidateUsers();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const quickMutation = useMutation({
    mutationFn: ({ type, id, value }) => {
      if (type === "role") return updateAdminUserRole(id, value);
      if (type === "status") return updateAdminUserStatus(id, value);
      return updateAdminUserUniversityVerification(id, value);
    },
    onSuccess: () => {
      toast.success(ap.toast.userUpdated);
      invalidateUsers();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      toast.success(ap.toast.userDeleted);
      setDeleteTarget(null);
      invalidateUsers();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateAdminUsers,
    onSuccess: () => {
      toast.success(ap.toast.bulkUpdated);
      invalidateUsers();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const roleOptions = [
    { value: "all", label: c.all },
    { value: "student", label: p.roleStudent },
    { value: "teacher", label: "Teacher" },
    { value: "librarian", label: "Librarian" },
    { value: "authority", label: "Authority" },
    { value: "admin", label: p.roleAdmin },
  ];

  const statusOptions = [
    { value: "all", label: c.all },
    { value: "active", label: p.statusActive },
    { value: "suspended", label: p.statusSuspended },
    { value: "banned", label: p.statusBanned },
    { value: "pending", label: p.statusPending },
  ];

  const booleanOptions = [
    { value: "all", label: c.all },
    { value: "true", label: p.verified },
    { value: "false", label: p.notVerified },
  ];

  const badgeLabel = (map, key) => map[key] || key;
  const roleLabels = { student: p.roleStudent, admin: p.roleAdmin, teacher: "Teacher", librarian: "Librarian", authority: "Authority" };
  const statusLabels = {
    active: p.statusActive,
    suspended: p.statusSuspended,
    banned: p.statusBanned,
    pending: p.statusPending,
  };
  const statusTones = { active: "green", suspended: "gray", banned: "red", pending: "yellow" };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      studentId: user.studentId || "",
      password: "",
      confirmPassword: "",
      role: user.role || "student",
      accountStatus: user.accountStatus || "active",
      emailVerified: Boolean(user.emailVerified),
      universityVerified: getUniversityVerification(user) === true,
    });
    setFormErrors({});
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setCreatingUser(true);
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns = [
    {
      key: "avatar",
      label: p.avatar,
      render: (row) => (
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0]/10 text-xs font-bold text-[#2C2DE0] ring-1 ring-[#2C2DE0]/20 dark:text-[#2C2DE0]">
          {row.avatar ? (
            <img src={row.avatar} alt={row.fullName || p.avatar} className="size-full object-cover" />
          ) : (
            (row.fullName || row.email || "").slice(0, 2).toUpperCase()
          )}
        </div>
      ),
    },
    { key: "fullName", label: p.fullName, sortable: true },
    { key: "email", label: p.email, sortable: true },
    { key: "universityId", label: p.studentId, sortable: true, render: (row) => row.universityId || p.notAvailable },
    {
      key: "role",
      label: p.role,
      sortable: true,
      render: (row) => <StatusBadge label={badgeLabel(roleLabels, row.role)} tone={row.role === "admin" ? "green" : "gray"} />,
    },
    {
      key: "emailVerified",
      label: p.emailVerification,
      render: (row) => <StatusBadge label={row.emailVerified ? p.verified : p.pending} tone={row.emailVerified ? "green" : "yellow"} />,
    },
    {
      key: "universityVerified",
      label: p.universityVerification,
      render: (row) => {
        const verified = getUniversityVerification(row);
        return (
          <StatusBadge
            label={verified === true ? p.verified : verified === false ? p.notVerified : p.verificationRequired}
            tone={verified === true ? "green" : verified === false ? "orange" : "yellow"}
          />
        );
      },
    },
    {
      key: "accountStatus",
      label: p.accountStatus,
      sortable: true,
      render: (row) => <StatusBadge label={badgeLabel(statusLabels, row.accountStatus)} tone={statusTones[row.accountStatus]} />,
    },
    {
      key: "lastLogin",
      label: p.lastLogin,
      sortable: true,
      render: (row) => (row.lastLogin ? new Date(row.lastLogin).toLocaleString() : p.notAvailable),
    },
  ];

  const exportUsersCsv = () => {
    if (!rows?.length) {
      toast.error(ap.toast.error);
      return;
    }

    const headers = [p.fullName, p.email, p.studentId, p.role, p.emailVerification, p.universityVerification, p.accountStatus, p.lastLogin];

    const values = rows.map((row) => [
      row.fullName || "",
      row.email || "",
      row.universityId || "",
      roleLabels[row.role] || row.role || "",
      row.emailVerified ? p.verified : p.notVerified,
      row.universityVerified ? p.verified : p.notVerified,
      statusLabels[row.accountStatus] || row.accountStatus || "",
      row.lastLogin ? new Date(row.lastLogin).toLocaleString() : "",
    ]);

    const escapeCell = (cell) => {
      const value = String(cell ?? "");
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csv = [headers, ...values].map((r) => r.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(ap.toast.exported);
  };

  return (
    <PageTransition>
      <PageHeader title={p.title} subtitle={p.subtitle} />
      {isError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>{ap.toast.error}</span>
          <button type="button" onClick={() => refetch()} className="shrink-0 font-semibold underline underline-offset-2">
            {p.retry}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchPlaceholder={p.searchPlaceholder}
        searchClassName="sm:max-w-none sm:min-w-[260px] sm:flex-1"
        searchDebounceMs={300}
        emptyTitle={p.emptyTitle}
        emptyDescription={p.emptyDescription}
        onAdd={openCreate}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setPage(1);
        }}
        toolbarFilters={
          <>
            <FilterDropdown label={p.role} options={roleOptions} value={filters.role} onChange={(value) => updateFilter("role", value)} />
            <FilterDropdown label={p.accountStatus} options={statusOptions} value={filters.accountStatus} onChange={(value) => updateFilter("accountStatus", value)} />
            <FilterDropdown label={p.emailVerification} options={booleanOptions} value={filters.emailVerified} onChange={(value) => updateFilter("emailVerified", value)} />
            <FilterDropdown label={p.universityVerification} options={booleanOptions} value={filters.universityVerified} onChange={(value) => updateFilter("universityVerified", value)} />
          </>
        }
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          rowsPerPage: limit,
          onPageChange: setPage,
          onRowsPerPageChange: (nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          },
        }}
        onExport={exportUsersCsv}
        onBulkDelete={(ids) => bulkMutation.mutate({ ids, action: "softDelete" })}
        bulkActions={[
          {
            key: "verify-university",
            label: p.actions.verifyUniversity,
            icon: <CheckCircle2 size={14} />,
            onClick: (ids) => bulkMutation.mutate({ ids, action: "universityVerification", value: true }),
          },
          {
            key: "suspend",
            label: p.actions.suspend,
            icon: <Ban size={14} />,
            onClick: (ids) => bulkMutation.mutate({ ids, action: "status", value: "suspended" }),
          },
        ]}
        onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
        renderRowActions={(row) => (
          <UserActionDropdown
            labels={{ ...p.actions, actions: c.actions, delete: c.delete }}
            user={row}
            onView={(user) => navigate(`/admin/users/${user.id}`)}
            onEdit={openEdit}
            onPromote={(user) => quickMutation.mutate({ type: "role", id: user.id, value: "admin" })}
            onSuspend={(user) => quickMutation.mutate({ type: "status", id: user.id, value: "suspended" })}
            onVerify={(user) => quickMutation.mutate({ type: "universityVerification", id: user.id, value: true })}
            onDelete={setDeleteTarget}
          />
        )}
      />

      <Modal
        open={Boolean(editingUser) || creatingUser}
        onClose={() => {
          setEditingUser(null);
          setCreatingUser(false);
        }}
        title={editingUser ? p.editTitle : p.createTitle}
        description={editingUser ? p.editDescription : p.createDescription}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setCreatingUser(false);
                setFormErrors({});
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              disabled={updateMutation.isPending || createMutation.isPending}
              onClick={submitForm}
              className="rounded-xl bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#2C2DE0]/20 transition-colors hover:bg-[#2C2DE0] disabled:cursor-not-allowed disabled:opacity-60 text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            >
              {updateMutation.isPending || createMutation.isPending ? p.saving : c.save}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.fullName}
            <input className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            {formErrors.fullName && <span className="text-[11px] font-semibold text-red-500">{formErrors.fullName}</span>}
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.email}
            <input className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            {formErrors.email && <span className="text-[11px] font-semibold text-red-500">{formErrors.email}</span>}
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.studentId}
            <input className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white" value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {creatingUser ? p.password : p.newPassword}
            <input
              type="password"
              autoComplete="new-password"
              placeholder={editingUser ? p.passwordOptional : p.passwordPlaceholder}
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
            {formErrors.password && <span className="text-[11px] font-semibold text-red-500">{formErrors.password}</span>}
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.confirmPassword}
            <input
              type="password"
              autoComplete="new-password"
              placeholder={p.confirmPasswordPlaceholder}
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
            {formErrors.confirmPassword && <span className="text-[11px] font-semibold text-red-500">{formErrors.confirmPassword}</span>}
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.role}
            <select className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-gray-950 dark:text-white" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="student">{p.roleStudent}</option>
              <option value="teacher">Teacher</option>
              <option value="librarian">Librarian</option>
              <option value="authority">Authority</option>
              <option value="admin">{p.roleAdmin}</option>
            </select>
            {formErrors.role && <span className="text-[11px] font-semibold text-red-500">{formErrors.role}</span>}
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.accountStatus}
            <select className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-gray-950 dark:text-white" value={form.accountStatus} onChange={(event) => setForm((current) => ({ ...current, accountStatus: event.target.value }))}>
              <option value="active">{p.statusActive}</option>
              <option value="suspended">{p.statusSuspended}</option>
              <option value="banned">{p.statusBanned}</option>
              <option value="pending">{p.statusPending}</option>
            </select>
            {formErrors.accountStatus && <span className="text-[11px] font-semibold text-red-500">{formErrors.accountStatus}</span>}
          </label>
          <div className="grid gap-3 rounded-xl border border-gray-200/70 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              {p.emailVerification}
              <input type="checkbox" checked={form.emailVerified} onChange={(event) => setForm((current) => ({ ...current, emailVerified: event.target.checked }))} className="rounded border-gray-300 text-[#2C2DE0] focus:ring-[#2C2DE0]/30" />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              {p.universityVerification}
              <input type="checkbox" checked={form.universityVerified} disabled={Boolean(editingUser && getUniversityVerification(editingUser) === null)} onChange={(event) => setForm((current) => ({ ...current, universityVerified: event.target.checked }))} className="rounded border-gray-300 text-[#2C2DE0] focus:ring-[#2C2DE0]/30 disabled:cursor-not-allowed disabled:opacity-60" />
              {editingUser && getUniversityVerification(editingUser) === null && (
                <span className="text-[11px] text-amber-600">{p.verificationRequired}</span>
              )}
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={p.deleteTitle}
        description={p.deleteDescription}
        body={p.deleteDescription}
        confirmLabel={c.delete}
        loading={deleteMutation.isPending}
        loadingLabel={p.deleting}
        closeOnConfirm={false}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </PageTransition>
  );
};

export default UsersPage;
