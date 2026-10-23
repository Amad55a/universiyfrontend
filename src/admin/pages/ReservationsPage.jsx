import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createElement, useMemo, useState } from "react";
import {
  CheckCheck, Ban, UserX, Eye, Clock, MapPin,
  User, Armchair, CalendarDays, Activity,
  AlertTriangle, FileText, Zap, Radio,
  TrendingUp, ShieldAlert,
} from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import DataTable from "@/admin/components/DataTable";
import FilterDropdown from "@/admin/components/FilterDropdown";
import Modal from "@/admin/components/Modal";
import ConfirmDialog from "@/admin/components/ConfirmDialog";
import StatusBadge from "@/admin/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import {
  fetchSeatReservations,
  fetchSeatReservationStats,
  fetchSeatReservation,
  unwrapSeatReservationDetail,
  adminCancelSeatReservation,
  adminForceCompleteSeatReservation,
  adminMarkNoShow,
  bulkUpdateSeatReservations,
} from "@/api/admin";
import { SOMALIA_TIME_ZONE } from "@/utils/time";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TONE = {
  pending: "yellow",
  active: "green",
  completed: "blue",
  cancelled: "gray",
  no_show: "red",
};

const STATUS_DOT = {
  pending: "bg-yellow-400",
  active: "bg-[#2C2DE0]",
  completed: "bg-blue-500",
  cancelled: "bg-gray-400",
  no_show: "bg-red-500",
};

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: SOMALIA_TIME_ZONE }) : "—";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: SOMALIA_TIME_ZONE }) : "—";

const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : "—");

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon, pulse, sub }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
    <div className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
      {createElement(Icon, { size: 18, className: "text-white" })}
      {pulse && (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-[#2C2DE0] ring-2 ring-white dark:ring-gray-900" />
      )}
    </div>
    <div>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-black text-gray-900 dark:text-white">{value ?? "—"}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  </div>
);

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10">
      {createElement(Icon, { size: 13, className: "text-gray-500 dark:text-gray-400" })}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  </div>
);

// ─── Timeline Step ────────────────────────────────────────────────────────────
const TimelineStep = ({ label, time, done, active, last }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ring-2 ${done
        ? "bg-[#2C2DE0] text-white ring-[#2C2DE0] dark:ring-[#2C2DE0]"
        : active
          ? "bg-yellow-400 text-white ring-yellow-200 dark:ring-yellow-900"
          : "bg-gray-100 text-gray-400 ring-gray-100 dark:bg-white/10 dark:text-gray-500 dark:ring-white/10"
        }`}>
        {done ? "✓" : active ? "●" : "○"}
      </div>
      {!last && (
        <div className={`mt-1 w-px flex-1 ${done ? "bg-[#2C2DE0] dark:bg-[#2C2DE0]" : "bg-gray-200 dark:bg-white/10"}`}
          style={{ height: 20 }} />
      )}
    </div>
    <div className="pb-3">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
      {time && <p className="text-[10px] text-gray-400 dark:text-gray-500">{time}</p>}
    </div>
  </div>
);

// ─── Conflict Warning ─────────────────────────────────────────────────────────
const ConflictWarning = ({ conflicts, title }) => {
  if (!conflicts?.length) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-orange-300/50 bg-orange-50 p-3.5 dark:border-orange-500/20 dark:bg-orange-500/10">
      <ShieldAlert size={15} className="mt-0.5 shrink-0 text-orange-500" />
      <div>
        <p className="text-xs font-black text-orange-700 dark:text-orange-400 mb-1.5">{title}</p>
        {conflicts.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-orange-600 dark:text-orange-300">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
            Seat {c.seat?.seatNumber} · {fmtTime(c.startTime)} – {fmtTime(c.endTime)} · {c.user?.fullName}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SeatReservationsPage = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", zone: "all", date: "today" });
  const [sort, setSort] = useState({ sortBy: "startTime", sortDir: "desc" });
  const [viewingId, setViewingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const queryParams = useMemo(
    () => ({ page, limit, search, ...filters, ...sort }),
    [page, limit, search, filters, sort]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-seat-reservations", queryParams],
    queryFn: async () => (await fetchSeatReservations(queryParams)).data,
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin-seat-reservation-stats"],
    queryFn: async () => {
      const res = await fetchSeatReservationStats();
      // sendSuccess spreads fields at top level: { success, todayTotal, ... }
      return res.data?.data ?? res.data ?? {};
    },
    refetchInterval: 30_000,
  });

  const { data: detailData, isLoading: detailLoading, isError: detailError, isFetching: detailFetching, refetch: retryDetail } = useQuery({
    queryKey: ["admin-seat-reservation-detail", viewingId],
    queryFn: async () => {
      return unwrapSeatReservationDetail(await fetchSeatReservation(viewingId));
    },
    enabled: Boolean(viewingId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-seat-reservations"] });
    queryClient.invalidateQueries({ queryKey: ["admin-seat-reservation-stats"] });
  };

  const cancelMutation = useMutation({
    mutationFn: (id) => adminCancelSeatReservation(id),
    onSuccess: () => {
      toast.success(t?.adminPanel?.toast?.reservationCancelled);
      setConfirmAction(null);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || t?.adminPanel?.toast?.error),
  });

  const forceCompleteMutation = useMutation({
    mutationFn: (id) => adminForceCompleteSeatReservation(id),
    onSuccess: () => {
      toast.success(t?.adminPanel?.toast?.reservationCompleted);
      setConfirmAction(null);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || t?.adminPanel?.toast?.error),
  });

  const noShowMutation = useMutation({
    mutationFn: (id) => adminMarkNoShow(id),
    onSuccess: () => {
      toast.success(t?.adminPanel?.toast?.reservationNoShow);
      setConfirmAction(null);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || t?.adminPanel?.toast?.error),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateSeatReservations,
    onSuccess: () => {
      toast.success(t?.adminPanel?.toast?.bulkUpdated);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || t?.adminPanel?.toast?.error),
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  const seatConflicts = useMemo(() => {
    if (!detailData || !["pending", "active"].includes(detailData.status)) return [];
    return rows.filter(
      (r) =>
        (r._id || r.id) !== (detailData._id || detailData.id) &&
        r.seat?.seatNumber === detailData.seat?.seatNumber &&
        ["pending", "active"].includes(r.status)
    );
  }, [detailData, rows]);

  const ap = t?.adminPanel;
  const p = ap?.pages?.seatReservations;
  const c = ap?.common;

  if (!p || !c) return null;

  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const stats = {
    todayTotal: statsData?.todayTotal ?? 0,
    activeNow: statsData?.activeNow ?? 0,
    pending: statsData?.pending ?? 0,
    cancelled: statsData?.cancelled ?? 0,
    completed: statsData?.completed ?? 0,
  };

  const mutationMap = {
    cancel: cancelMutation,
    forceComplete: forceCompleteMutation,
    noShow: noShowMutation,
  };

  const updateFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const openDetails = (row) => {
    const reservationId = row?._id || row?.id;
    if (!reservationId) {
      toast.error(t?.adminPanel?.toast?.error);
      return;
    }
    setViewingId(String(reservationId));
  };

  const statusLabels = {
    pending: p.statusPending,
    active: p.statusActive,
    completed: p.statusCompleted,
    cancelled: p.statusCancelled,
    no_show: p.statusNoShow,
  };

  // ── FIX 1: Only 3 zones (removed computer_lab) ───────────────────────────
  const zoneLabels = {
    general: p.zoneGeneral,
    girls_only: p.zoneGirls,
    quiet: p.zoneQuiet,
  };

  const statusOptions = [
    { value: "all", label: c.all },
    { value: "pending", label: p.statusPending },
    { value: "active", label: p.statusActive },
    { value: "completed", label: p.statusCompleted },
    { value: "cancelled", label: p.statusCancelled },
    { value: "no_show", label: p.statusNoShow },
  ];

  // ── FIX 2: Date options — "week" now means past 7 days label clarified ───
  const dateOptions = [
    { value: "today", label: p.filterToday },
    { value: "week", label: p.filterWeek },
    { value: "all", label: c.all },
  ];

  // ── FIX 3: Zone options — only 3 zones, no computer_lab ─────────────────
  const zoneOptions = [
    { value: "all", label: c.all },
    { value: "general", label: p.zoneGeneral },
    { value: "girls_only", label: p.zoneGirls },
    { value: "quiet", label: p.zoneQuiet },
  ];

  const buildTimeline = (r) => {
    if (!r) return [];
    const after = (s) =>
      ["completed", "cancelled", "no_show"].includes(r.status) ||
      (s === "pending" && ["active", "completed"].includes(r.status)) ||
      (s === "active" && r.status === "completed");

    const steps = [
      { label: p.timelineCreated, time: fmtDateTime(r.createdAt), done: true, active: false },
      { label: p.timelinePending, time: fmtTime(r.startTime), done: after("pending"), active: r.status === "pending" },
      { label: p.timelineActive, time: fmtDateTime(r.checkedInAt), done: after("active"), active: r.status === "active" },
      { label: p.timelineCompleted, time: fmtDateTime(r.checkedOutAt || (r.status === "completed" ? r.endTime : null)), done: r.status === "completed", active: false },
    ];

    if (r.status === "cancelled") {
      steps.push({ label: p.statusCancelled, time: fmtDateTime(r.cancelledAt || r.updatedAt), done: true, active: false });
    }
    if (r.status === "no_show") {
      steps.push({ label: p.statusNoShow, time: fmtDateTime(r.cancelledAt || r.updatedAt), done: true, active: false });
    }

    return steps;
  };

  const columns = [
    {
      key: "user",
      label: p.colUser,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0]/10 text-[10px] font-black text-[#2C2DE0] ring-1 ring-[#2C2DE0]/20 dark:text-[#2C2DE0]">
            {row.user?.photo || row.user?.avatar
              ? <img src={row.user.photo || row.user.avatar} alt="" className="size-full object-cover" />
              : (row.user?.fullName || "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
              {row.user?.fullName || row.user?.name || p.detailNotProvided}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {p.detailStudentId}: <span className="font-mono">{row.user?.universityId || p.detailNotProvided}</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-52">
              {row.user?.email || p.detailNotProvided}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "seat",
      label: p.colSeat,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Armchair size={13} className="text-[#2C2DE0] flex-shrink-0" />
          <span className="text-xs font-black text-gray-900 dark:text-white">
            {row.seat?.seatNumber || "—"}
          </span>
          {row.seat?.zone && (
            <StatusBadge label={zoneLabels[row.seat.zone] || row.seat.zone} tone="gray" />
          )}
        </div>
      ),
    },
    {
      key: "startTime",
      label: p.colTime,
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">
            {fmtTime(row.startTime)} – {fmtTime(row.endTime)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmtDate(row.startTime)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: p.colStatus,
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full flex-shrink-0 ${STATUS_DOT[row.status] || "bg-gray-400"} ${row.status === "active" ? "animate-pulse" : ""}`} />
          <StatusBadge label={statusLabels[row.status] || row.status} tone={STATUS_TONE[row.status]} />
        </div>
      ),
    },
    {
      key: "createdAt",
      label: p.colBookedAt,
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {fmtDateTime(row.createdAt)}
        </span>
      ),
    },
  ];

  const exportReservationsCsv = () => {
    if (!rows?.length) {
      toast.error(ap.toast.error);
      return;
    }

    const headers = [p.colUser, p.colSeat, p.colTime, p.colStatus, p.colBookedAt];
    const values = rows.map((row) => [
      row.user?.fullName || row.user?.email || "",
      row.seat?.seatNumber || "",
      `${fmtDateTime(row.startTime)} - ${fmtDateTime(row.endTime)}`,
      statusLabels[row.status] || row.status || "",
      fmtDateTime(row.createdAt),
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
    link.setAttribute("download", `reservations-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(ap.toast.exported);
  };

  const isPending = mutationMap[confirmAction?.type]?.isPending;

  return (
    <PageTransition>
      <PageHeader title={p.title} subtitle={p.subtitle} />

      {isError && <p className="mb-4 text-sm text-red-500">{ap.toast.error}</p>}

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard label={p.statsToday} value={stats.todayTotal} color="bg-gray-700 dark:bg-gray-600" icon={CalendarDays} />
        <StatCard label={p.statsActive} value={stats.activeNow} color="bg-[#2C2DE0]" icon={Radio} pulse sub={p.statsActiveSub} />
        <StatCard label={p.statsPending} value={stats.pending} color="bg-yellow-500" icon={Clock} />
        <StatCard label={p.statsCancelled} value={stats.cancelled} color="bg-red-500" icon={Ban} />
        <StatCard label={p.statsCompleted} value={stats.completed} color="bg-blue-500" icon={CheckCheck} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        // ── FIX 4: Updated search placeholder ─────────────────────────────
        searchPlaceholder={p.searchPlaceholder}
        emptyTitle={p.emptyTitle}
        emptyDescription={p.emptyDescription}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        onRowClick={openDetails}
        extraFilters={
          <>
            <FilterDropdown label={p.colStatus} options={statusOptions} value={filters.status} onChange={(v) => updateFilter("status", v)} />
            <FilterDropdown label={p.filterDate} options={dateOptions} value={filters.date} onChange={(v) => updateFilter("date", v)} />
            {/* ── FIX 5: Zone filter now only passes 3 options ─────────── */}
            <FilterDropdown label={p.colZone} options={zoneOptions} value={filters.zone} onChange={(v) => updateFilter("zone", v)} />
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
        onExport={exportReservationsCsv}
        bulkActions={[
          { key: "cancel", label: p.actionCancel, icon: <Ban size={14} />, onClick: (ids) => bulkMutation.mutate({ ids, action: "cancel" }) },
          { key: "forceComplete", label: p.actionForceComplete, icon: <CheckCheck size={14} />, onClick: (ids) => bulkMutation.mutate({ ids, action: "forceComplete" }) },
          { key: "noShow", label: p.actionNoShow, icon: <UserX size={14} />, onClick: (ids) => bulkMutation.mutate({ ids, action: "noShow" }) },
        ]}
        renderRowActions={(row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); openDetails(row); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
            >
              <Eye size={11} />
              {p.actionView}
            </button>

            {row.status === "pending" && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "cancel", id: row._id || row.id, label: p.actionCancel })}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors"
              >
                <Ban size={11} />
                {p.actionCancel}
              </button>
            )}

            {row.status === "active" && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ type: "forceComplete", id: row._id || row.id, label: p.actionForceComplete })}
                  className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-500/20 transition-colors"
                >
                  <CheckCheck size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ type: "noShow", id: row._id || row.id, label: p.actionNoShow })}
                  className="flex items-center gap-1 rounded-lg bg-orange-500/10 px-2 py-1.5 text-[10px] font-bold text-orange-600 hover:bg-orange-500/20 transition-colors"
                >
                  <UserX size={11} />
                </button>
              </>
            )}

            {["completed", "cancelled", "no_show"].includes(row.status) && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); openDetails(row); }}
                className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title={p.actionViewLogs}
              >
                <FileText size={11} />
              </button>
            )}
          </div>
        )}
      />

      {/* Detail Modal */}
      <Modal
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        title={p.detailTitle}
        description={p.detailDescription}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {detailData?.status === "pending" && (
                <button
                  type="button"
                  onClick={() => { setViewingId(null); setConfirmAction({ type: "cancel", id: detailData._id, label: p.actionCancel }); }}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/20 transition-colors"
                >
                  <Ban size={13} /> {p.actionCancel}
                </button>
              )}
              {detailData?.status === "active" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setViewingId(null); setConfirmAction({ type: "forceComplete", id: detailData._id, label: p.actionForceComplete }); }}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-500/20 transition-colors"
                  >
                    <CheckCheck size={13} /> {p.actionForceComplete}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewingId(null); setConfirmAction({ type: "noShow", id: detailData._id, label: p.actionNoShow }); }}
                    className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-500/20 transition-colors"
                  >
                    <UserX size={13} /> {p.actionNoShow}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewingId(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
            >
              {c.close || p.close}
            </button>
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-[#2C2DE0] border-t-transparent" />
          </div>
        ) : detailError ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{ap.toast.error}</p>
            <button
              type="button"
              onClick={() => retryDetail()}
              disabled={detailFetching}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
            >
              {p.retry}
            </button>
          </div>
        ) : detailData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`size-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[detailData.status]} ${detailData.status === "active" ? "animate-pulse" : ""}`} />
              <StatusBadge label={statusLabels[detailData.status] || detailData.status} tone={STATUS_TONE[detailData.status]} />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">#{detailData._id}</span>
            </div>

            <ConflictWarning conflicts={seatConflicts} title={p.conflictTitle} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-gray-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{p.sectionStudent}</p>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0]/10 text-sm font-black text-[#2C2DE0] ring-1 ring-[#2C2DE0]/20">
                    {detailData.user?.photo || detailData.user?.avatar
                      ? <img src={detailData.user.photo || detailData.user.avatar} alt="" className="size-full object-cover" />
                      : (detailData.user?.fullName || detailData.user?.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{detailData.user?.fullName || detailData.user?.name || p.detailNotProvided}</p>
                    <p className="break-all text-xs text-gray-500 dark:text-gray-400">{detailData.user?.email || p.detailNotProvided}</p>
                  </div>
                </div>
                <DetailRow icon={Zap} label={p.detailStudentId} value={detailData.user?.universityId || p.detailNotProvided} mono />
                <DetailRow icon={User} label={p.detailDepartment} value={detailData.user?.department || p.detailNotProvided} />
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{p.sectionSeat}</p>
                <DetailRow icon={Armchair} label={p.detailSeatNumber} value={detailData.seat?.seatNumber} />
                <DetailRow icon={MapPin} label={p.detailZone} value={zoneLabels[detailData.seat?.zone] || detailData.seat?.zone} />
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{p.sectionTime}</p>
                <DetailRow icon={Clock} label={p.detailStart} value={fmtDateTime(detailData.startTime)} />
                <DetailRow icon={Clock} label={p.detailEnd} value={fmtDateTime(detailData.endTime)} />
                <DetailRow icon={CalendarDays} label={p.detailBookedAt} value={fmtDateTime(detailData.createdAt)} />
                <DetailRow icon={CalendarDays} label={p.detailCheckedInAt} value={fmtDateTime(detailData.checkedInAt)} />
                {detailData.checkedOutAt && <DetailRow icon={CalendarDays} label={p.detailCheckedOutAt} value={fmtDateTime(detailData.checkedOutAt)} />}
                {detailData.cancelledAt && <DetailRow icon={CalendarDays} label={p.detailCancelledAt} value={fmtDateTime(detailData.cancelledAt)} />}
                {detailData.cancellationReason && <DetailRow icon={FileText} label={p.detailCancellationReason} value={detailData.cancellationReason} />}
              </div>

              <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{p.sectionTimeline}</p>
                {buildTimeline(detailData).map((step, i, arr) => (
                  <TimelineStep key={i} {...step} last={i === arr.length - 1} />
                ))}
                {detailData.history?.length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-3 dark:border-white/10">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{p.historyAction}</p>
                    {detailData.history.map((entry) => (
                      <p key={entry._id} className="py-1 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{p.historyActions?.[entry.action] || entry.action}</span>
                        {" · "}{fmtDateTime(entry.createdAt)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-200/50 bg-gray-50/50 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
              <FileText size={12} className="text-gray-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {p.source}:{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{p.sourceStudentPortal}</span>
              </span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">v{detailData.__v ?? "1"}</span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.label}
        description={p.confirmDescription}
        body={p.confirmDescription}
        confirmLabel={confirmAction?.label}
        loading={isPending}
        loadingLabel={p.processing}
        closeOnConfirm={false}
        onConfirm={() => mutationMap[confirmAction?.type]?.mutate(confirmAction?.id)}
      />
    </PageTransition>
  );
};

export default SeatReservationsPage;