import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  GraduationCap, Link2, Link2Off,
  CheckCircle2, XCircle, Users,
} from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import DataTable from "@/admin/components/DataTable";
import FilterDropdown from "@/admin/components/FilterDropdown";
import Modal from "@/admin/components/Modal";
import ConfirmDialog from "@/admin/components/ConfirmDialog";
import StatusBadge from "@/admin/components/StatusBadge";
import UniversityStudentActionDropdown from "@/admin/components/UniversityStudentActionDropdown";
import { useLanguage } from "@/hooks/useLanguage";
import {
  fetchUniversityStudents,
  createUniversityStudent,
  updateUniversityStudent,
  deleteUniversityStudent,
  bulkUpdateUniversityStudents,
} from "@/api/admin";

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  universityId: "",
  fullName: "",
  gender: "Male",
  semester: 1,
  department: "",
  role: "student",
  status: "active",
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, tone = "green" }) => {
  const toneMap = {
    green: "bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0]",
    gray: "bg-gray-500/10  text-gray-600  dark:text-gray-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10  text-blue-600  dark:text-blue-400",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3">
      <div className={`flex size-9 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-black text-gray-900 dark:text-white">{value ?? "—"}</p>
      </div>
    </div>
  );
};

// ─── Audit timeline (inline) ──────────────────────────────────────────────────
// Shows createdAt / updatedAt / isClaimed timeline inside the edit modal
const AuditTimeline = ({ row, t }) => {
  const events = [
    { label: t.created, date: row?.createdAt, icon: CheckCircle2, tone: "text-[#2C2DE0]" },
    { label: t.updated, date: row?.updatedAt, icon: CheckCircle2, tone: "text-blue-500" },
    { label: t.claimed, date: row?.isClaimed ? row?.updatedAt : null, icon: row?.isClaimed ? Link2 : Link2Off, tone: row?.isClaimed ? "text-[#2C2DE0]" : "text-gray-400" },
  ];
  return (
    <div className="mt-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {t.auditTimeline}
      </p>
      <ol className="flex flex-col gap-3">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <e.icon size={14} className={`mt-0.5 flex-shrink-0 ${e.tone}`} />
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{e.label}</p>
              <p className="text-[11px] text-gray-400">
                {e.date ? new Date(e.date).toLocaleString() : t.notAvailable}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const UniversityStudentsPage = () => {
  const { t } = useLanguage();

  /*
    Translation keys expected (tell your translator to add these):
    t.adminPanel.pages.universityStudents.title
    t.adminPanel.pages.universityStudents.subtitle
    t.adminPanel.pages.universityStudents.searchPlaceholder
    t.adminPanel.pages.universityStudents.emptyTitle
    t.adminPanel.pages.universityStudents.emptyDescription
    t.adminPanel.pages.universityStudents.createTitle
    t.adminPanel.pages.universityStudents.createDescription
    t.adminPanel.pages.universityStudents.editTitle
    t.adminPanel.pages.universityStudents.editDescription
    t.adminPanel.pages.universityStudents.deleteTitle
    t.adminPanel.pages.universityStudents.deleteDescription
    t.adminPanel.pages.universityStudents.deleting
    t.adminPanel.pages.universityStudents.saving
    t.adminPanel.pages.universityStudents.universityId
    t.adminPanel.pages.universityStudents.fullName
    t.adminPanel.pages.universityStudents.gender
    t.adminPanel.pages.universityStudents.semester
    t.adminPanel.pages.universityStudents.department
    t.adminPanel.pages.universityStudents.status
    t.adminPanel.pages.universityStudents.email
    t.adminPanel.pages.universityStudents.emailLinked
    t.adminPanel.pages.universityStudents.isClaimed
    t.adminPanel.pages.universityStudents.claimed
    t.adminPanel.pages.universityStudents.unclaimed
    t.adminPanel.pages.universityStudents.notAvailable
    t.adminPanel.pages.universityStudents.created
    t.adminPanel.pages.universityStudents.updated
    t.adminPanel.pages.universityStudents.auditTimeline
    t.adminPanel.pages.universityStudents.statusActive
    t.adminPanel.pages.universityStudents.statusInactive
    t.adminPanel.pages.universityStudents.statusGraduated
    t.adminPanel.pages.universityStudents.genderMale
    t.adminPanel.pages.universityStudents.genderFemale
    t.adminPanel.pages.universityStudents.genderOther
    t.adminPanel.pages.universityStudents.totalStudents
    t.adminPanel.pages.universityStudents.claimedCount
    t.adminPanel.pages.universityStudents.unclaimedCount
    t.adminPanel.pages.universityStudents.activeCount
    t.adminPanel.pages.universityStudents.actions.markClaimed
    t.adminPanel.pages.universityStudents.actions.markUnclaimed
    t.adminPanel.pages.universityStudents.validation.universityIdRequired
    t.adminPanel.pages.universityStudents.validation.fullNameRequired
    t.adminPanel.pages.universityStudents.validation.genderRequired
    t.adminPanel.pages.universityStudents.validation.semesterRequired
    t.adminPanel.pages.universityStudents.validation.departmentRequired
  */
  const p = t.adminPanel.pages.universityStudents;
  const c = t.adminPanel.common;
  const ap = t.adminPanel;

  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    semester: "all",
    gender: "all",
    role: "all",
    status: "all",
    isClaimed: "all",
    department: "",
  });
  const [sort, setSort] = useState({ sortBy: "createdAt", sortDir: "desc" });
  const [editingRow, setEditingRow] = useState(null);
  const [creatingRow, setCreatingRow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const queryParams = useMemo(
    () => ({ page, limit, search, ...filters, ...sort }),
    [page, limit, search, filters, sort]
  );

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-university-students", queryParams],
    queryFn: async () => {
      const res = await fetchUniversityStudents(queryParams);
      return res.data;
    },
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const stats = data?.stats ?? {};

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-university-students"] });

  const getErr = (err) => err?.response?.data?.message || ap.toast.error;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createUniversityStudent,
    onSuccess: () => { toast.success(ap.toast.userCreated); setCreatingRow(false); setForm(emptyForm); setFormErrors({}); invalidate(); },
    onError: (err) => toast.error(getErr(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUniversityStudent(id, payload),
    onSuccess: () => { toast.success(ap.toast.userUpdated); setEditingRow(null); setFormErrors({}); invalidate(); },
    onError: (err) => toast.error(getErr(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUniversityStudent,
    onSuccess: () => { toast.success(ap.toast.userDeleted); setDeleteTarget(null); invalidate(); },
    onError: (err) => toast.error(getErr(err)),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateUniversityStudents,
    onSuccess: () => { toast.success(ap.toast.bulkUpdated); invalidate(); },
    onError: (err) => toast.error(getErr(err)),
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!form.universityId.trim()) errors.universityId = p.validation.universityIdRequired;
    if (!form.fullName.trim()) errors.fullName = p.validation.fullNameRequired;
    if (!form.gender) errors.gender = p.validation.genderRequired;
    if (!form.semester || form.semester < 1 || form.semester > 12)
      errors.semester = p.validation.semesterRequired;
    if (!form.department.trim()) errors.department = p.validation.departmentRequired;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = () => {
    if (!validateForm()) return;
    if (editingRow) updateMutation.mutate({ id: editingRow.id, payload: form });
    else createMutation.mutate(form);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      universityId: row.universityId || "",
      fullName: row.fullName || "",
      gender: row.gender || "Male",
      semester: row.semester || 1,
      department: row.department || "",
      role: row.role || "student",

      email: row.email || row.emailLinked || "",
    });
    setFormErrors({});
  };

  const openCreate = () => { setForm(emptyForm); setFormErrors({}); setCreatingRow(true); };

  const statusTones = { active: "green", inactive: "gray", graduated: "blue" };
  const statusLabels = { active: p.statusActive, inactive: p.statusInactive, graduated: p.statusGraduated };

  const exportTableCsv = () => {
    if (!rows?.length) {
      toast.error(ap.toast.error);
      return;
    }

    const headers = [
      p.universityId,
      p.fullName,
      p.gender,
      p.semester,
      p.department,
      p.role,
      p.status,
      p.isClaimed,
      p.email,
      p.claimedBy || "Claimed by",
    ];

    const values = rows.map((row) => {
      const claimedBy = row.claimedBy
        ? `${row.claimedBy.fullName || ""}${row.claimedBy.email ? ` (${row.claimedBy.email})` : ""}`.trim()
        : "";
      return [
        row.universityId || "",
        row.fullName || "",
        genderLabels[row.gender] || row.gender || "",
        row.semester ?? "",
        row.department || "",
        row.role ? (row.role === "student" ? p.roleStudent || "Student" : row.role === "teacher" ? p.roleTeacher || "Teacher" : row.role) : "",
        statusLabels[row.status] || row.status || "",
        row.isClaimed ? p.claimed : p.unclaimed,
        row.email || row.emailLinked || row.claimedBy?.email || "",
        claimedBy,
      ];
    });

    const escapeCell = (cell) => {
      const value = String(cell ?? "");
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csv = [headers, ...values]
      .map((rowData) => rowData.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `registry-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(ap.toast.exported);
  };

  // ── Status / option maps ───────────────────────────────────────────────────
  const genderLabels = { Male: p.genderMale, Female: p.genderFemale, Other: p.genderOther };

  // ── Filter options ─────────────────────────────────────────────────────────
  const semesterOptions = [
    { value: "all", label: c.all },
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${p.semester} ${i + 1}` })),
  ];
  const genderOptions = [
    { value: "all", label: c.all },
    { value: "Male", label: p.genderMale },
    { value: "Female", label: p.genderFemale },
    { value: "Other", label: p.genderOther },
  ];
  const roleOptions = [
    { value: "all", label: c.all },
    { value: "student", label: p.roleStudent || "Student" },
    { value: "teacher", label: p.roleTeacher || "Teacher" },
    { value: "librarian", label: "Librarian" },
  ];

  const claimedOptions = [
    { value: "all", label: c.all },
    { value: "true", label: p.claimed },
    { value: "false", label: p.unclaimed },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "avatar",
      label: "",
      render: (row) => (
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0]/10 text-xs font-bold text-[#2C2DE0] ring-1 ring-[#2C2DE0]/20 dark:text-[#2C2DE0]">
          {(row.fullName || "").slice(0, 2).toUpperCase()}
        </div>
      ),
    },
    {
      key: "universityId",
      label: p.universityId,
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
          {row.universityId}
        </span>
      ),
    },
    { key: "fullName", label: p.fullName, sortable: true },
    {
      key: "gender", label: p.gender, sortable: true,
      render: (row) => genderLabels[row.gender] || row.gender
    },
    {
      key: "semester", label: p.semester, sortable: true,
      render: (row) => `${p.semester} ${row.semester}`
    },
    { key: "department", label: p.department, sortable: true },
    {
      key: "role",
      label: p.role,
      sortable: true,
      render: (row) => row.role ? (row.role === "student" ? p.roleStudent || "Student" : row.role === "teacher" ? p.roleTeacher || "Teacher" : row.role) : "—",
    },

    {
      key: "isClaimed",
      label: p.isClaimed,
      render: (row) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.isClaimed
          ? "bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0]"
          : "bg-gray-500/10  text-gray-500  dark:text-gray-400"
          }`}>
          {row.isClaimed ? <Link2 size={11} /> : <Link2Off size={11} />}
          {row.isClaimed ? p.claimed : p.unclaimed}
        </span>
      ),
    },
    {
      key: "emailLinked",
      label: p.emailLinked,
      render: (row) => {
        const email = row.emailLinked || row.email || row.claimedBy?.email;
        return email ? email : <span className="text-gray-400">—</span>;
      },
    },
    {
      key: "claimedBy",
      label: p.claimedBy || "Claimed by",
      render: (row) => {
        if (row.claimedBy?.fullName) return `${row.claimedBy.fullName}${row.claimedBy.email ? ` (${row.claimedBy.email})` : ""}`;
        return row.claimedBy?.email || <span className="text-gray-400">—</span>;
      },
    },
    {
      key: "createdAt",
      label: p.created,
      sortable: true,
      render: (row) => {
        try {
          const date = new Date(row.createdAt);
          return date.getTime() ? date.toLocaleDateString() : p.notAvailable;
        } catch {
          return p.notAvailable;
        }
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <PageHeader title={p.title} subtitle={p.subtitle} />

      {isError && <p className="mb-4 text-sm text-red-500">{ap.toast.error}</p>}

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label={p.totalStudents} value={stats.total} tone="green" />
        <StatCard icon={Link2} label={p.claimedCount} value={stats.claimed} tone="blue" />
        <StatCard icon={Link2Off} label={p.unclaimedCount} value={stats.unclaimed} tone="gray" />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchPlaceholder={p.searchPlaceholder}
        emptyTitle={p.emptyTitle}
        emptyDescription={p.emptyDescription}
        onAdd={openCreate}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        onSortChange={(nextSort) => { setSort(nextSort); setPage(1); }}
        extraFilters={
          <>
            <FilterDropdown
              label={p.semester}
              options={semesterOptions}
              value={filters.semester}
              onChange={(v) => updateFilter("semester", v)}
            />
            <FilterDropdown
              label={p.gender}
              options={genderOptions}
              value={filters.gender}
              onChange={(v) => updateFilter("gender", v)}
            />
            <FilterDropdown
              label={p.role}
              options={roleOptions}
              value={filters.role}
              onChange={(v) => updateFilter("role", v)}
            />

            <FilterDropdown
              label={p.isClaimed}
              options={claimedOptions}
              value={filters.isClaimed}
              onChange={(v) => updateFilter("isClaimed", v)}
            />
          </>
        }
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          rowsPerPage: limit,
          onPageChange: setPage,
          onRowsPerPageChange: (n) => { setLimit(n); setPage(1); },
        }}
        onExport={exportTableCsv}
        onBulkDelete={(ids) => bulkMutation.mutate({ ids, action: "softDelete" })}
        bulkActions={[
          {
            key: "mark-claimed",
            label: p.actions.markClaimed,
            icon: <Link2 size={14} />,
            onClick: (ids) => bulkMutation.mutate({ ids, action: "markClaimed", value: true }),
          },
          {
            key: "mark-unclaimed",
            label: p.actions.markUnclaimed,
            icon: <Link2Off size={14} />,
            onClick: (ids) => bulkMutation.mutate({ ids, action: "markClaimed", value: false }),
          },
        ]}
        onRowClick={(row) => setDetailRow(row)}
        renderRowActions={(row) => (
          <UniversityStudentActionDropdown
            labels={{
              ...p.actions,
              actions: c.actions,
              edit: c.edit,
              delete: c.delete,
              viewDetails: p.viewDetails || c.view,
            }}
            student={row}
            onView={(student) => setDetailRow(student)}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onToggleClaimed={(student) => {
              bulkMutation.mutate({
                ids: [student.id],
                action: "markClaimed",
                value: !student.isClaimed,
              });
            }}
          />
        )}
      />

      {/* ── Create / Edit modal ── */}
      <Modal
        open={Boolean(editingRow) || creatingRow}
        onClose={() => { setEditingRow(null); setCreatingRow(false); }}
        title={editingRow ? p.editTitle : p.createTitle}
        description={editingRow ? p.editDescription : p.createDescription}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setEditingRow(null); setCreatingRow(false); setFormErrors({}); }}
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

          {/* University ID */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.universityId}
            <input
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white font-mono uppercase"
              value={form.universityId}
              onChange={(e) => setForm((f) => ({ ...f, universityId: e.target.value.toUpperCase() }))}
              placeholder="e.g. UNISO-2024-001"
            />
            {formErrors.universityId && <span className="text-[11px] font-semibold text-red-500">{formErrors.universityId}</span>}
          </label>

          {/* Full name */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.fullName}
            <input
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            {formErrors.fullName && <span className="text-[11px] font-semibold text-red-500">{formErrors.fullName}</span>}
          </label>

          {/* Gender */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.gender}
            <select
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-gray-950 dark:text-white"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="Male">{p.genderMale}</option>
              <option value="Female">{p.genderFemale}</option>
            </select>
            {formErrors.gender && <span className="text-[11px] font-semibold text-red-500">{formErrors.gender}</span>}
          </label>

          {/* Semester */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.semester}
            <input
              type="number" min={1} max={12}
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.semester}
              onChange={(e) => setForm((f) => ({ ...f, semester: Number(e.target.value) }))}
            />
            {formErrors.semester && <span className="text-[11px] font-semibold text-red-500">{formErrors.semester}</span>}
          </label>

          {/* Department */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.department}
            <input
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g. Computer Science"
            />
            {formErrors.department && <span className="text-[11px] font-semibold text-red-500">{formErrors.department}</span>}
          </label>

          {/* Role */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.role}
            <select
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-gray-950 dark:text-white"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="student">{p.roleStudent || "Student"}</option>
              <option value="teacher">{p.roleTeacher || "Teacher"}</option>
            </select>
          </label>

          {/* Email */}
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {p.email}
            <input
              className="w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={form.email || ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="e.g. student@example.com"
            />
          </label>


        </div>

        {/* Audit timeline (edit only) */}
        {editingRow && <AuditTimeline row={editingRow} t={p} />}
      </Modal>

      {/* ── Detail / view modal ── */}
      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title={detailRow?.fullName || ""}
        description={detailRow?.universityId || ""}
        size="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setDetailRow(null); openEdit(detailRow); }}
              className="rounded-xl bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#2C2DE0]/20 hover:bg-[#2C2DE0] transition-colors"
            >
              {c.edit}
            </button>
            <button
              type="button"
              onClick={() => setDetailRow(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
            >
              {c.cancel}
            </button>
          </div>
        }
      >
        {detailRow && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: p.universityId, value: detailRow.universityId },
              { label: p.fullName, value: detailRow.fullName },
              { label: p.gender, value: genderLabels[detailRow.gender] || detailRow.gender },
              { label: p.semester, value: `${p.semester} ${detailRow.semester}` },
              { label: p.department, value: detailRow.department },
              { label: p.role, value: detailRow.role ? (detailRow.role === "student" ? p.roleStudent || "Student" : detailRow.role === "teacher" ? p.roleTeacher || "Teacher" : detailRow.role) : "—" },
              {
                label: p.isClaimed, value: (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${detailRow.isClaimed ? "bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0]" : "bg-gray-500/10 text-gray-500 dark:text-gray-400"}`}>
                    {detailRow.isClaimed ? <Link2 size={11} /> : <Link2Off size={11} />}
                    {detailRow.isClaimed ? p.claimed : p.unclaimed}
                  </span>
                )
              },
              { label: p.email, value: detailRow.email || detailRow.emailLinked || detailRow.claimedBy?.email || "—" },
              { label: p.claimedBy || "Claimed by", value: detailRow.claimedBy ? `${detailRow.claimedBy.fullName || detailRow.claimedBy.email}${detailRow.claimedBy.email && detailRow.claimedBy.fullName ? ` (${detailRow.claimedBy.email})` : ""}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</p>
              </div>
            ))}
            <div className="sm:col-span-2">
              <AuditTimeline row={detailRow} t={p} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete confirm ── */}
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

export default UniversityStudentsPage;