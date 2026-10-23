import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Armchair, User, Clock, CalendarDays } from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import StatusBadge from "@/admin/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { fetchAdminSeat, fetchSeatTimeline } from "@/api/admin";
import { SOMALIA_TIME_ZONE, toSomaliaDateTime } from "@/utils/time";

// ─── Constants ────────────────────────────────────────────────────────────────
const OPEN_HOUR  = 7;
const CLOSE_HOUR = 17;
const TOTAL_MINS = (CLOSE_HOUR - OPEN_HOUR) * 60; // 600 mins

const STATUS_COLOR = {
  active:    { bar: "bg-[#2C2DE0]",  text: "text-[#2C2DE0] dark:text-[#2C2DE0]",  badge: "green",  label: "active" },
  pending:   { bar: "bg-blue-500",   text: "text-blue-700 dark:text-blue-400",    badge: "blue",   label: "pending" },
  completed: { bar: "bg-gray-400",   text: "text-gray-600 dark:text-gray-400",    badge: "gray",   label: "completed" },
  cancelled: { bar: "bg-red-300",    text: "text-red-500",                         badge: "red",    label: "cancelled" },
  no_show:   { bar: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", badge: "orange", label: "no_show" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toMinutes = (date) => {
  const d = toSomaliaDateTime(date);
  return (d.hour - OPEN_HOUR) * 60 + d.minute;
};

const fmt = (date) =>
  new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: SOMALIA_TIME_ZONE });

const fmtDate = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: SOMALIA_TIME_ZONE });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ─── Hour labels ──────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => {
  const h = OPEN_HOUR + i;
  return { h, label: `${h > 12 ? h - 12 : h}${h >= 12 ? "PM" : "AM"}` };
});

// ─── Slot Detail Panel ────────────────────────────────────────────────────────
const SlotDetail = ({ slot, labels, onClose }) => {
  if (!slot) return null;
  const color = STATUS_COLOR[slot.status] || STATUS_COLOR.completed;
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/80">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{labels.slotDetail}</span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`size-2.5 rounded-full ${color.bar}`} />
          <StatusBadge label={labels[color.label] || slot.status} tone={color.badge} />
        </div>
        <div className="flex items-start gap-2">
          <User size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400">{labels.student}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{slot.user?.fullName || slot.user?.name || "—"}</p>
            <p className="text-[10px] text-gray-500">{slot.user?.universityId || slot.user?.email || ""}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400">{labels.timeRange}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(slot.startTime)} – {fmt(slot.endTime)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400">{labels.bookedAt}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {new Date(slot.createdAt).toLocaleString("en-US", { timeZone: SOMALIA_TIME_ZONE })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Timeline Bar ─────────────────────────────────────────────────────────────
const TimelineBar = ({ reservations, onSlotClick, selectedId }) => {
  return (
    <div className="relative">
      {/* Hour grid lines */}
      <div className="relative flex h-16 overflow-hidden rounded-2xl border border-gray-200/70 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]">
        {/* Free background */}
        <div className="absolute inset-0 flex">
          {HOURS.slice(0, -1).map(({ h }) => (
            <div
              key={h}
              className="flex-1 border-r border-gray-200/50 dark:border-white/5"
            />
          ))}
        </div>

        {/* Reservation blocks */}
        {reservations.map((r) => {
          const startMin = clamp(toMinutes(r.startTime), 0, TOTAL_MINS);
          const endMin   = clamp(toMinutes(r.endTime),   0, TOTAL_MINS);
          const left  = (startMin / TOTAL_MINS) * 100;
          const width = ((endMin - startMin) / TOTAL_MINS) * 100;
          const color = STATUS_COLOR[r.status] || STATUS_COLOR.completed;
          const isSelected = selectedId === (r._id || r.id);

          return (
            <button
              key={r._id || r.id}
              onClick={() => onSlotClick(r)}
              style={{ left: `${left}%`, width: `${width}%` }}
              className={`absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-xl px-1 transition-all ${color.bar} ${
                isSelected ? "opacity-100 ring-2 ring-white ring-offset-1" : "opacity-80 hover:opacity-100"
              }`}
              title={`${r.user?.fullName || "?"} · ${fmt(r.startTime)}–${fmt(r.endTime)}`}
            >
              {width > 8 && (
                <span className="truncate text-[9px] font-black text-white">
                  {r.user?.fullName?.split(" ")[0] || "?"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hour labels below */}
      <div className="mt-1 flex">
        {HOURS.map(({ h, label }) => (
          <div
            key={h}
            className="flex-1 text-center text-[9px] font-semibold text-gray-400 dark:text-gray-500"
            style={{ marginLeft: h === OPEN_HOUR ? 0 : undefined }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Free Slots Computation ───────────────────────────────────────────────────
const computeFreeSlots = (reservations) => {
  const sorted = [...reservations]
    .filter((r) => !["cancelled"].includes(r.status))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const free = [];
  let cursor = OPEN_HOUR * 60;

  for (const r of sorted) {
    const start = toMinutes(r.startTime) + OPEN_HOUR * 60;
    const end   = toMinutes(r.endTime)   + OPEN_HOUR * 60;
    if (start > cursor) {
      free.push({ from: cursor, to: start });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < CLOSE_HOUR * 60) free.push({ from: cursor, to: CLOSE_HOUR * 60 });

  return free.map(({ from, to }) => {
    const fmtM = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const period = h >= 12 ? "PM" : "AM";
      const hh = h > 12 ? h - 12 : h || 12;
      return `${hh}:${String(m).padStart(2, "0")} ${period}`;
    };
    return { label: `${fmtM(from)} – ${fmtM(to)}` };
  });
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SeatTimelinePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const p  = ap.pages.seatTimeline;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const selectedDay = toSomaliaDateTime(selectedDate);
  const dateStr = selectedDay.toISODate();

  const { data: seatData } = useQuery({
    queryKey: ["admin-seat", id],
    queryFn: async () => {
      const res = await fetchAdminSeat(id);
      return res.data.data;
    },
  });

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ["seat-timeline", id, dateStr],
    queryFn: async () => {
      const res = await fetchSeatTimeline(id, dateStr);
      return res.data;
    },
  });

  const reservations = useMemo(() => timelineData?.reservations ?? [], [timelineData?.reservations]);
  const freeSlots    = useMemo(() => computeFreeSlots(reservations), [reservations]);

  const goDay = (delta) => {
    setSelectedDate(selectedDay.plus({ days: delta }).toJSDate());
    setSelectedSlot(null);
  };

  const isToday = dateStr === toSomaliaDateTime(new Date()).toISODate();

  const zoneLabel = { general: p.zoneGeneral, girls_only: p.zoneGirls };

  const statusLabels = {
    active:    p.statusActive,
    pending:   p.statusPending,
    completed: p.statusCompleted,
    cancelled: p.statusCancelled,
    no_show:   p.statusNoShow,
    slotDetail: p.slotDetail,
    student:    p.student,
    timeRange:  p.timeRange,
    bookedAt:   p.bookedAt,
  };

  return (
    <PageTransition>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl border border-gray-200/70 bg-white/60 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Armchair size={18} className="text-[#2C2DE0]" />
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white">
              {seatData ? `${p.title} · ${seatData.seatNumber}` : p.title}
            </h1>
            {seatData && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {zoneLabel[seatData.zone] || seatData.zone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date navigator */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goDay(-1)}
            className="flex size-8 items-center justify-center rounded-xl border border-gray-200/70 bg-white/60 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200/70 bg-white/60 px-4 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <CalendarDays size={14} className="text-[#2C2DE0]" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(selectedDate)}</span>
            {isToday && (
              <span className="rounded-full bg-[#2C2DE0]/10 px-2 py-0.5 text-[10px] font-black text-[#2C2DE0] dark:text-[#2C2DE0]">
                {p.today}
              </span>
            )}
          </div>
          <button
            onClick={() => goDay(1)}
            className="flex size-8 items-center justify-center rounded-xl border border-gray-200/70 bg-white/60 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <button
          onClick={() => { setSelectedDate(new Date()); setSelectedSlot(null); }}
          className="rounded-xl bg-[#2C2DE0]/10 px-3 py-2 text-xs font-bold text-[#2C2DE0] hover:bg-[#2C2DE0]/20 dark:text-[#2C2DE0] transition-colors"
        >
          {p.goToday}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline + list */}
        <div className="space-y-6 lg:col-span-2">
          {/* Visual bar */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {p.timelineLabel}
            </p>
            {isLoading ? (
              <div className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
            ) : (
              <TimelineBar
                reservations={reservations}
                onSlotClick={setSelectedSlot}
                selectedId={selectedSlot?._id || selectedSlot?.id}
              />
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { color: "bg-[#2C2DE0]",  label: p.statusActive },
                { color: "bg-blue-500",   label: p.statusPending },
                { color: "bg-gray-400",   label: p.statusCompleted },
                { color: "bg-orange-400", label: p.statusNoShow },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-gray-200 dark:bg-white/20" />
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{p.free}</span>
              </div>
            </div>
          </div>

          {/* Reservation list */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {p.reservationsLabel} ({reservations.length})
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">{p.noReservations}</p>
            ) : (
              <div className="space-y-2">
                {reservations
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map((r) => {
                    const color = STATUS_COLOR[r.status] || STATUS_COLOR.completed;
                    const isSelected = selectedSlot?._id === r._id;
                    return (
                      <button
                        key={r._id || r.id}
                        onClick={() => setSelectedSlot(isSelected ? null : r)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? "border-[#2C2DE0]/30 bg-[#2C2DE0]/5 dark:border-[#2C2DE0]/20"
                            : "border-gray-200/70 bg-white/40 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                        }`}
                      >
                        <div className={`size-2.5 shrink-0 rounded-full ${color.bar}`} />
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                              {r.user?.fullName || r.user?.name || "—"}
                            </p>
                            <p className="text-[10px] text-gray-400">{r.user?.universityId || r.user?.email || ""}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {fmt(r.startTime)} – {fmt(r.endTime)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge label={statusLabels[r.status] || r.status} tone={color.badge} />
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Slot detail */}
          {selectedSlot ? (
            <SlotDetail
              slot={selectedSlot}
              labels={{ ...statusLabels }}
              onClose={() => setSelectedSlot(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200/70 bg-white/40 p-8 text-gray-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-500">
              <Clock size={24} className="opacity-40" />
              <p className="text-xs font-semibold">{p.clickSlotHint}</p>
            </div>
          )}

          {/* Free slots */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {p.freeSlots} ({freeSlots.length})
            </p>
            {freeSlots.length === 0 ? (
              <p className="text-xs text-gray-400">{p.fullyBooked}</p>
            ) : (
              <div className="space-y-1.5">
                {freeSlots.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
                  >
                    <span className="size-2 rounded-full bg-gray-300 dark:bg-white/20" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day summary */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {p.daySummary}
            </p>
            <div className="space-y-2">
              {[
                { label: p.totalReservations, value: reservations.length },
                { label: p.statusActive,      value: reservations.filter((r) => r.status === "active").length,    color: "text-[#2C2DE0] dark:text-[#2C2DE0]" },
                { label: p.statusPending,     value: reservations.filter((r) => r.status === "pending").length,   color: "text-blue-600 dark:text-blue-400" },
                { label: p.statusCompleted,   value: reservations.filter((r) => r.status === "completed").length, color: "text-gray-500" },
                { label: p.freeSlots,         value: freeSlots.length,                                            color: "text-gray-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={`text-xs font-black ${color || "text-gray-900 dark:text-white"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SeatTimelinePage;