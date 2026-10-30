import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Pencil, Trash2, Armchair } from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import DataTable from "@/admin/components/DataTable";
import FilterDropdown from "@/admin/components/FilterDropdown";
import Modal from "@/admin/components/Modal";
import ConfirmDialog from "@/admin/components/ConfirmDialog";
import StatusBadge from "@/admin/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { SOMALIA_TIME_ZONE } from "@/utils/time";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAdminSeats,
  createAdminSeat,
  updateAdminSeat,
  deleteAdminSeat,
  bulkUpdateAdminSeats,
  bulkGenerateAdminSeats,
} from "@/api/admin";

const emptyForm = { seatNumber: "", zone: "general", section: "", description: "", status: "available" };
const formatBookingTime = (value) => value
  ? new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SOMALIA_TIME_ZONE,
  })
  : "—";
const formatBookingDate = (value) => value
  ? new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: SOMALIA_TIME_ZONE,
  })
  : "—";

const SeatsPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const ap = t.adminPanel;
  const p = ap.pages.seats;
  const c = ap.common;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ zone: "all" });
  const [sort, setSort] = useState({ sortBy: "seatNumber", sortDir: "asc" });

  const [editingSeat, setEditingSeat] = useState(null);
  const [creatingSeat, setCreatingSeat] = useState(false);
  const [generatingSeats, setGeneratingSeats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [genForm, setGenForm] = useState({ prefix: "A", start: 1, end: 20, zone: "general" });
  const [genErrors, setGenErrors] = useState({});

  const queryParams = useMemo(
    () => ({ page, limit, search, ...filters, ...sort }),
    [page, limit, search, filters, sort]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-seats", queryParams],
    queryFn: async () => {
      const res = await fetchAdminSeats(queryParams);
      return res.data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-seats"] });
  const getErr = (e) => e?.response?.data?.message || ap.toast.error;

  const createMutation = useMutation({
    mutationFn: createAdminSeat,
    onSuccess: () => { toast.success(ap.toast.seatCreated); setCreatingSeat(false); setForm(emptyForm); setFormErrors({}); invalidate(); },
    onError: (e) => toast.error(getErr(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAdminSeat(id, payload),
    onSuccess: () => { toast.success(ap.toast.seatUpdated); setEditingSeat(null); setFormErrors({}); invalidate(); },
    onError: (e) => toast.error(getErr(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSeat,
    onSuccess: () => { toast.success(ap.toast.seatDeleted); setDeleteTarget(null); invalidate(); },
    onError: (e) => toast.error(getErr(e)),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateAdminSeats,
    onSuccess: () => { toast.success(ap.toast.bulkUpdated); invalidate(); },
    onError: (e) => toast.error(getErr(e)),
  });

  const generateMutation = useMutation({
    mutationFn: bulkGenerateAdminSeats,
    onSuccess: (res) => { toast.success(res?.data?.message || ap.toast.seatsGenerated); setGeneratingSeats(false); setGenForm({ prefix: "A", start: 1, end: 20, zone: "general" }); invalidate(); },
    onError: (e) => toast.error(getErr(e)),
  });

  const validateForm = () => {
    const errors = {};
    if (!form.seatNumber.trim()) errors.seatNumber = p.validation.seatNumberRequired;
    if (!["general", "girls_only"].includes(form.zone)) errors.zone = p.validation.zoneInvalid;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateGen = () => {
    const errors = {};
    if (!genForm.prefix.trim()) errors.prefix = p.validation.prefixRequired;
    if (genForm.start < 1) errors.start = p.validation.startInvalid;
    if (genForm.end < genForm.start) errors.end = p.validation.endInvalid;
    if (genForm.end - genForm.start > 200) errors.end = p.validation.maxSeats;
    setGenErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = () => {
    if (!validateForm()) return;
    if (editingSeat) updateMutation.mutate({ id: editingSeat._id || editingSeat.id, payload: form });
    else createMutation.mutate(form);
  };

  const openEdit = (seat) => {
    setEditingSeat(seat);
    setForm({
      seatNumber: seat.seatNumber || "",
      zone: seat.zone || "general",
      section: seat.section || "",
      description: seat.description || "",
      status: seat.status || (seat.isActive ? "available" : "unavailable"),
    });
    setFormErrors({});
  };

  const updateFilter = (key, value) => { setFilters((p) => ({ ...p, [key]: value })); setPage(1); };

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const zoneLabels = { general: p.zoneGeneral, girls_only: p.zoneGirls };

  const zoneOptions = [
    { value: "all", label: c.all },
    { value: "general", label: p.zoneGeneral },
    { value: "girls_only", label: p.zoneGirls },
  ];

  const inputClass = "w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-white/5 dark:text-white";
  const selectClass = "w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#2C2DE0]/40 focus:ring-2 focus:ring-[#2C2DE0]/20 dark:border-white/10 dark:bg-gray-950 dark:text-white";
  const labelClass = "space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300";
  const errorClass = "text-[11px] font-semibold text-red-500";

  const columns = [
    {
      key: "seatNumber",
      label: p.colSeatNumber,
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
          <Armchair size={15} className="text-[#2C2DE0]" />
          <span className="text-sm tabular-nums">{row.seatNumber}</span>
        </span>
      ),
    },
    {
      key: "zone",
      label: p.colZone,
      sortable: true,
      render: (row) => (
        <StatusBadge
          label={zoneLabels[row.zone] || row.zone}
          tone={row.zone === "girls_only" ? "orange" : "blue"}
        />
      ),
    },
    {
      key: "isActive",
      label: p.colPhysicalStatus,
      render: (row) => (
        <StatusBadge
          label={row.status === "maintenance" ? "Under maintenance" : row.isActive ? p.seatInService : p.seatOutOfService}
          tone={row.status === "maintenance" ? "orange" : row.isActive ? "green" : "gray"}
        />
      ),
    },
    {
      key: "historicalReservations",
      label: p.colHistoricalReservations,
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {row.historicalReservations ?? 0}
        </span>
      ),
    },
    {
      key: "todayReservations",
      label: p.colTodayReservations,
      render: (row) => (
        <span
          title={p.todayReservationCountHelp}
          className={`text-xs font-bold ${row.todayReservations > 0 ? "text-[#2C2DE0] dark:text-[#2C2DE0]" : "text-gray-400"}`}
        >
          {row.todayReservations ?? 0}
        </span>
      ),
    },
    {
      key: "currentOrNextBooking",
      label: p.colCurrentNextBooking,
      render: (row) => row.currentOrNextBooking ? (
        <div className="min-w-28">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {formatBookingTime(row.currentOrNextBooking.startTime)} – {formatBookingTime(row.currentOrNextBooking.endTime)}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {formatBookingDate(row.currentOrNextBooking.startTime)}
          </p>
          <StatusBadge
            label={p.reservationStatuses?.[row.currentOrNextBooking.status] || row.currentOrNextBooking.status}
            tone={row.currentOrNextBooking.status === "active" ? "green" : "yellow"}
          />
        </div>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-400">{p.noUpcomingBookings}</span>
      ),
    },
  ];

  const exportSeatsCsv = () => {
    if (!rows?.length) {
      toast.error(ap.toast.error);
      return;
    }

    const headers = [p.colSeatNumber, p.colZone, p.colPhysicalStatus, p.colHistoricalReservations, p.colTodayReservations, p.colCurrentNextBooking];
    const values = rows.map((row) => [
      row.seatNumber || "",
      zoneLabels[row.zone] || row.zone || "",
      row.isActive ? p.seatInService : p.seatOutOfService,
      row.historicalReservations ?? 0,
      row.todayReservations ?? 0,
      row.currentOrNextBooking
        ? `${formatBookingDate(row.currentOrNextBooking.startTime)} ${formatBookingTime(row.currentOrNextBooking.startTime)} - ${formatBookingTime(row.currentOrNextBooking.endTime)} (${row.currentOrNextBooking.status})`
        : p.noUpcomingBookings,
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
    link.setAttribute("download", `seats-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(ap.toast.exported);
  };

  return (
    <PageTransition>
      <PageHeader title={p.title} subtitle={p.subtitle} />
      {isError && <p className="mb-4 text-sm text-red-500">{ap.toast.error}</p>}

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchPlaceholder={p.searchPlaceholder}
        emptyTitle={p.emptyTitle}
        emptyDescription={p.emptyDescription}
        onAdd={() => { setForm(emptyForm); setFormErrors({}); setCreatingSeat(true); }}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        extraFilters={
          <FilterDropdown label={p.colZone} options={zoneOptions} value={filters.zone} onChange={(v) => updateFilter("zone", v)} />
        }
        headerActions={isAdmin ? (
          <button
            onClick={() => setGeneratingSeats(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#2C2DE0]/30 bg-[#2C2DE0]/10 px-3 py-2 text-xs font-bold text-[#2C2DE0] transition-colors hover:bg-[#2C2DE0]/20 dark:text-[#2C2DE0]"
          >
            {p.bulkGenerate}
          </button>
        ) : null}
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          rowsPerPage: limit,
          onPageChange: setPage,
          onRowsPerPageChange: (n) => { setLimit(n); setPage(1); },
        }}
        onExport={exportSeatsCsv}
        onBulkDelete={isAdmin ? (ids) => bulkMutation.mutate({ ids, action: "softDelete" }) : undefined}
        renderRowActions={(row) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/admin/seats/${row._id || row.id}/timeline`)}
              className="flex items-center gap-1 rounded-lg bg-[#2C2DE0]/10 px-2 py-1 text-[10px] font-bold text-[#2C2DE0] hover:bg-[#2C2DE0]/20 dark:text-[#2C2DE0] transition-colors"
            >
              <CalendarClock size={11} />
              {p.actionTimeline}
            </button>
            <button
              onClick={() => openEdit(row)}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 transition-colors"
            >
              <Pencil size={11} />
              {c.edit}
            </button>
            {isAdmin && (
              <button
                onClick={() => setDeleteTarget(row)}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={11} />
                {c.delete}
              </button>
            )}
          </div>
        )}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={Boolean(editingSeat) || creatingSeat}
        onClose={() => { setEditingSeat(null); setCreatingSeat(false); setFormErrors({}); }}
        title={editingSeat ? p.editTitle : p.createTitle}
        description={editingSeat ? p.editDescription : p.createDescription}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setEditingSeat(null); setCreatingSeat(false); setFormErrors({}); }}
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
        <div className="grid gap-4">
          <label className={labelClass}>
            {p.colSeatNumber}
            <input
              className={inputClass}
              value={form.seatNumber}
              onChange={(e) => setForm((f) => ({ ...f, seatNumber: e.target.value }))}
              placeholder="A-101"
              disabled={Boolean(editingSeat)}
            />
            {formErrors.seatNumber && <span className={errorClass}>{formErrors.seatNumber}</span>}
          </label>
          <label className={labelClass}>
            Section / location
            <input className={inputClass} value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} placeholder="Floor or section" />
          </label>
          <label className={labelClass}>
            Service status
            <select className={selectClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="maintenance">Under maintenance</option>
            </select>
          </label>
          <label className={labelClass}>
            Description
            <textarea className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </label>
          <label className={labelClass}>
            {p.colZone}
            <select
              className={selectClass}
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
            >
              <option value="general">{p.zoneGeneral}</option>
              <option value="girls_only">{p.zoneGirls}</option>
            </select>
            {formErrors.zone && <span className={errorClass}>{formErrors.zone}</span>}
          </label>
        </div>
      </Modal>

      {/* Bulk Generate Modal */}
      <Modal
        open={generatingSeats}
        onClose={() => { setGeneratingSeats(false); setGenErrors({}); }}
        title={p.generateTitle}
        description={p.generateDescription}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setGeneratingSeats(false); setGenErrors({}); }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              disabled={generateMutation.isPending}
              onClick={() => { if (validateGen()) generateMutation.mutate(genForm); }}
              className="rounded-xl bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#2C2DE0]/20 transition-colors hover:bg-[#2C2DE0] disabled:opacity-60"
            >
              {generateMutation.isPending ? p.generating : p.generateAction}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#2C2DE0]/20 bg-[#2C2DE0]/5 px-3 py-2 sm:col-span-2">
            <span className="text-xs font-semibold text-[#2C2DE0] dark:text-[#2C2DE0]">
              {p.generatePreview}: {genForm.prefix}-{genForm.start} → {genForm.prefix}-{genForm.end} ({Math.max(0, genForm.end - genForm.start + 1)} {p.seatsCount})
            </span>
          </div>
          <label className={labelClass}>
            {p.prefix}
            <input className={inputClass} value={genForm.prefix} onChange={(e) => setGenForm((f) => ({ ...f, prefix: e.target.value }))} />
            {genErrors.prefix && <span className={errorClass}>{genErrors.prefix}</span>}
          </label>
          <label className={labelClass}>
            {p.colZone}
            <select className={selectClass} value={genForm.zone} onChange={(e) => setGenForm((f) => ({ ...f, zone: e.target.value }))}>
              <option value="general">{p.zoneGeneral}</option>
              <option value="girls_only">{p.zoneGirls}</option>
            </select>
          </label>
          <label className={labelClass}>
            {p.startNumber}
            <input type="number" min="1" className={inputClass} value={genForm.start} onChange={(e) => setGenForm((f) => ({ ...f, start: Number(e.target.value) }))} />
            {genErrors.start && <span className={errorClass}>{genErrors.start}</span>}
          </label>
          <label className={labelClass}>
            {p.endNumber}
            <input type="number" min="1" className={inputClass} value={genForm.end} onChange={(e) => setGenForm((f) => ({ ...f, end: Number(e.target.value) }))} />
            {genErrors.end && <span className={errorClass}>{genErrors.end}</span>}
          </label>
        </div>
      </Modal>

      {/* Delete Confirm */}
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
        onConfirm={() => deleteMutation.mutate(deleteTarget._id || deleteTarget.id)}
      />
    </PageTransition>
  );
};

export default SeatsPage;