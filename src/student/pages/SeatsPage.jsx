// SeatsGrid.jsx — Fixed
// All CTA buttons use the Duolingo-style green button.
// "Reserved now" / "next slot" checks run against the server-corrected
// current instant.

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeats } from "@/api/seats";

import { useLanguage } from "@/hooks/useLanguage";
import { RefreshCw, ChevronLeft, ChevronRight, Clock, Armchair } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useUniversityVerification } from "@/hooks/useUniversityVerification";
import { sectionWrap } from "@/shared/constants/surfaces";
import socket from "@/socket";
import { getReservationMeta, getTodayReservations } from "@/api/reservation";
import { useServerClock } from "@/hooks/Usesomaliaclock";

const PAGE_SIZE = 10;

const fetchTodayReservations = async () => {
  return await getTodayReservations();
};

const fetchReservationMeta = () => getReservationMeta();

const fmt = (d, lang = "en") =>
  new Date(d).toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit", hour12: true });

const OPEN = 7;
const CLOSE = 17;

const getAvailableSlots = (bookedSlots) => {
  const sorted = [...bookedSlots].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const free = [];
  let cursor = OPEN * 60;
  sorted.forEach((r) => {
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();
    if (startMin > cursor) free.push({ from: cursor, to: startMin });
    cursor = Math.max(cursor, endMin);
  });
  if (cursor < CLOSE * 60) free.push({ from: cursor, to: CLOSE * 60 });
  return free;
};

const minsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

// ── Seat icon ─────────────────────────────────────────────────────────────────
const SeatIconSVG = ({ color = "#2C2DE0", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="20" height="13" rx="4" fill={color} opacity="0.15" />
    <rect x="6" y="4" width="20" height="13" rx="4" stroke={color} strokeWidth="1.8" />
    <rect x="5" y="16" width="22" height="8" rx="3" fill={color} opacity="0.2" />
    <rect x="5" y="16" width="22" height="8" rx="3" stroke={color} strokeWidth="1.8" />
    <line x1="9" y1="24" x2="8" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="23" y1="24" x2="24" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M5 18 Q2 18 2 22 L2 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M27 18 Q30 18 30 22 L30 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${p === page
            ? "bg-[#2C2DE0] text-white shadow-sm shadow-[#2C2DE0] dark:shadow-none"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <ChevronRight size={15} />
      </button>
    </div>
  );
};

// ── Seat card ─────────────────────────────────────────────────────────────────
// `now` evaluates "is there a future slot" against the current demo time.
const SeatCard = ({ seat, isFullyBooked, lockedUnverified, lockedGirlsOnly, onSelect, t, verifyCopy, fmtTime, now }) => {
  const isGirlsOnly = seat.zone === "girls_only";
  const activeSlot = seat.upcomingSlots?.find((s) => s.status === "active");
  const nextSlot = seat.upcomingSlots?.find((s) => {
    try {
      return new Date(s.startTime).getTime() > now.getTime();
    } catch (e) {
      return new Date(s.startTime) > now;
    }
  });
  const isReservedNow = Boolean(activeSlot) || seat.isReserved === true;
  const isTaken = isReservedNow || isFullyBooked;
  const disabled = isTaken || isFullyBooked || lockedUnverified || lockedGirlsOnly;
  const accentColor = isTaken ? "#d1d5db" : isGirlsOnly ? "#ec4899" : "#2C2DE0";

  // ──── DEBUG: Log seat status on first render and when now changes ────────
  React.useEffect(() => {
    console.log(`🪑 [SeatCard] Seat ${seat.seatNumber}`, {
      now: now?.toISOString(),
      activeSlot: activeSlot ? { status: activeSlot.status, start: activeSlot.startTime, end: activeSlot.endTime } : null,
      nextSlot: nextSlot ? { start: nextSlot.startTime } : null,
      isReservedNow,
      isTaken,
      upcomingSlotsCount: seat.upcomingSlots?.length,
    });
  }, [now, seat._id, activeSlot, nextSlot, isReservedNow, isTaken, seat.seatNumber]);

  let statusLabel = t.available;
  if (isReservedNow && activeSlot) {
    statusLabel = t.reservedUntil(fmtTime(activeSlot.endTime));
  } else if (isFullyBooked && nextSlot) {
    statusLabel = t.reservedUntil(fmtTime(nextSlot.endTime));
  } else if (!isFullyBooked && nextSlot && seat.availableAfter) {
    statusLabel = t.availableAfter(fmtTime(seat.availableAfter));
  } else if (isFullyBooked) {
    statusLabel = t.fullyBooked;
  } else if (lockedUnverified) {
    statusLabel = verifyCopy.lockedReserve;
  } else if (lockedGirlsOnly) {
    statusLabel = t.notAvailable;
  }

  const statusDot = isTaken
    ? "bg-red-400"
    : lockedUnverified || lockedGirlsOnly ? "bg-gray-300 dark:bg-gray-600"
      : isGirlsOnly ? "bg-pink-400"
        : "bg-[#2C2DE0]";

  const ctaLabel = disabled
    ? t.notAvailable
    : lockedUnverified ? verifyCopy.lockedReserve
      : lockedGirlsOnly ? t.notAvailable
        : t.reserve;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex flex-col items-center rounded-2xl overflow-hidden
        transition-all duration-200 select-none
        ${disabled
          ? "opacity-50 cursor-not-allowed bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800"
          : isGirlsOnly
            ? "cursor-pointer bg-white dark:bg-gray-950 border border-pink-100 dark:border-pink-900/40 hover:border-pink-300 dark:hover:border-pink-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/60 dark:hover:shadow-pink-900/20"
            : "cursor-pointer bg-white dark:bg-gray-950 border border-[#2C2DE0] dark:border-[#2C2DE0]/40 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2C2DE0]/60 dark:hover:shadow-[#2C2DE0]/20"
        }
      `}
    >
      {/* Top accent stripe */}
      <div className="w-full h-1 flex-shrink-0" style={{ backgroundColor: disabled ? "#e5e7eb" : accentColor, opacity: disabled ? 0.4 : 1 }} />

      {isGirlsOnly && (
        <span className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-500 dark:text-pink-400 border border-pink-100 dark:border-pink-800/40">
          {t.girlsOnly}
        </span>
      )}

      <div className="flex flex-col items-center px-4 pt-5 pb-4 w-full">
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-200
          ${disabled ? "bg-gray-100 dark:bg-gray-900"
            : isGirlsOnly ? "bg-pink-50 dark:bg-pink-500/10 group-hover:bg-pink-100 dark:group-hover:bg-pink-500/15"
              : "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/15 group-hover:bg-[#2C2DE0]/20 dark:group-hover:bg-[#2C2DE0]/25"}
        `}>
          <SeatIconSVG color={accentColor} size={28} />
        </div>

        <p className="font-black text-gray-900 dark:text-white text-base tracking-tight leading-none">{seat.seatNumber}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-0.5">{t.seat}</p>

        <div className="flex items-center gap-1.5 mt-3">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isTaken ? "text-red-400"
            : lockedUnverified || lockedGirlsOnly ? "text-gray-400"
              : isGirlsOnly ? "text-pink-500"
                : "text-[#2C2DE0]"
            }`}>{statusLabel}</span>
        </div>

        {/* ── Duolingo-style reserve button ── */}
        <button
          disabled={disabled}
          className={`
            mt-4 w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-150
            ${disabled
              ? "bg-gray-100 dark:bg-gray-800/60 text-gray-400 cursor-not-allowed"
              : isGirlsOnly
                ? "bg-pink-500 hover:bg-pink-600 active:scale-95 text-white shadow-sm shadow-pink-200 dark:shadow-none"
                : "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none"
            }
          `}
        >
          {ctaLabel}
        </button>
      </div>

      {isGirlsOnly && !disabled && (
        <div className="w-full px-4 pb-3 -mt-1">
          <p className="text-[9px] text-pink-400 dark:text-pink-500 text-center leading-tight">{t.girlsOnlyHint}</p>
        </div>
      )}
    </div>
  );
};

// ── Reserved table ────────────────────────────────────────────────────────────
const ReservedTable = ({ reservations, isLoading, lang, t, common }) => {
  const [page, setPage] = useState(1);

  const seatMap = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      const seatId = r.seat?._id || r.seat;
      const seatNum = r.seat?.seatNumber ?? "—";
      if (!seatId) return;
      if (!map[seatId]) map[seatId] = { seatNumber: seatNum, zone: r.seat?.zone ?? "general", slots: [] };
      map[seatId].slots.push(r);
    });
    return Object.values(map).sort((a, b) => a.seatNumber - b.seatNumber);
  }, [reservations]);

  if (isLoading) return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!seatMap.length) return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
        <SeatIconSVG color="#9ca3af" size={26} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{t.noReservedToday}</p>
      <p className="text-gray-400 text-xs mt-1">{t.allSeatsAvailable}</p>
    </div>
  );

  const totalPages = Math.ceil(seatMap.length / PAGE_SIZE);
  const pageRows = seatMap.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-gray-900/80">
              <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t.seat}</th>
              <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t.time}</th>
              <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Available slots</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
            {pageRows.map((seatRow) => {
              const freeSlots = getAvailableSlots(seatRow.slots);
              return (
                <tr key={seatRow.seatNumber} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 flex items-center justify-center flex-shrink-0">
                        <SeatIconSVG color="#f87171" size={18} />
                      </div>
                      <div>
                        <span className="font-black text-gray-900 dark:text-white text-sm">{t.seat} {seatRow.seatNumber}</span>
                        {seatRow.zone === "girls_only" && (
                          <span className="ml-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-500 dark:text-pink-400">{t.girlsOnly}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      {seatRow.slots.map((r) => (
                        <div key={r._id} className="flex items-center gap-1.5">
                          <Clock size={10} className="text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                            {fmt(r.startTime, lang)} – {fmt(r.endTime, lang)}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${r.status === "active"
                            ? "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 text-[#2C2DE0]"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-500"
                            }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {freeSlots.length === 0
                      ? <span className="text-[11px] font-black uppercase tracking-wide text-red-400">{t.fullyBooked}</span>
                      : <div className="flex flex-col gap-1">
                        {freeSlots.map((slot, i) => (
                          <span key={i} className="text-[11px] font-bold text-[#2C2DE0] dark:text-[#2C2DE0] whitespace-nowrap">
                            {minsToTime(slot.from)} – {minsToTime(slot.to)}
                          </span>
                        ))}
                      </div>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {seatMap.length > PAGE_SIZE && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, isLoading, variant }) => {
  const variants = {
    default: { number: "text-gray-900 dark:text-white", bg: "bg-white dark:bg-gray-950", border: "border-gray-100 dark:border-gray-800", dot: null },
    available: { number: "text-[#2C2DE0]", bg: "bg-[#2C2DE0]/8 dark:bg-[#2C2DE0]/5", border: "border-[#2C2DE0]/30 dark:border-[#2C2DE0]/40", dot: "bg-[#2C2DE0]" },
    reserved: { number: "text-red-400", bg: "bg-red-50/50 dark:bg-red-500/5", border: "border-red-100 dark:border-red-900/30", dot: "bg-red-400" },
  };
  const v = variants[variant] || variants.default;
  return (
    <div className={`${v.bg} border ${v.border} rounded-2xl px-5 py-4 text-center transition-all`}>
      {v.dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${v.dot} mb-2`} />}
      <p className={`text-3xl font-black tracking-tight ${v.number}`}>{isLoading ? "—" : value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{label}</p>
    </div>
  );
};

// ── Main SeatsGrid ────────────────────────────────────────────────────────────
const SeatsGrid = () => {
  const { language, t } = useLanguage();
  const seatsText = t.seats;
  const verifyCopy = t.universityVerification;

  const { needsVerification, canBookGirlsZone, isUniversityVerified } = useUniversityVerification();

  // 1. All standard React state hooks first
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 2. React Query data hooks second
  const { data: seats = [], isLoading: seatsLoading, refetch, isFetching } =
    useQuery({ queryKey: ["seats"], queryFn: getSeats });

  const { data: todayReservations = [], isLoading: reservationsLoading, refetch: refetchReservations } =
    useQuery({ queryKey: ["todayReservations"], queryFn: fetchTodayReservations, staleTime: 30_000 });

  const { data: reservationMeta } = useQuery({
    queryKey: ["reservationMeta"],
    queryFn: fetchReservationMeta,
    refetchInterval: 60_000,
  });

  // Server-synced, ticking clock — every "is this reserved now / is there
  // a future slot" check in this file and in SeatCard reads from this
  // instead of `new Date()`. This was previously missing entirely, which
  // crashed the page (`now` was referenced below but never defined).
  const now = useServerClock(reservationMeta?.serverTime);

  // ──── DEBUG: Log time information ────────────────────────────────────────
  useEffect(() => {
    if (now && reservationMeta?.serverTime) {
      console.log("🕐 [SeatsPage] TIME DEBUG", {
        clientTime: new Date().toISOString(),
        somaliaClock: now?.toISOString(),
        serverTime: reservationMeta.serverTime,
        timestamp: now?.getTime(),
      });
    }
  }, [now, reservationMeta?.serverTime]);





  const bookingHour = now.getHours();
  const bookingOpen = bookingHour >= OPEN && bookingHour < CLOSE;
  useEffect(() => {
    const refresh = () => {
      refetch();
      refetchReservations();
    };
    socket.on("reservation:created", refresh);
    socket.on("reservation:updated", refresh);
    socket.on("reservation:cancelled", refresh);
    socket.on("seat:updated", refresh);
    return () => {
      socket.off("reservation:created", refresh);
      socket.off("reservation:updated", refresh);
      socket.off("reservation:cancelled", refresh);
      socket.off("seat:updated", refresh);
    };
  }, [refetch, refetchReservations]);


  const isApiLoading = seatsLoading || reservationsLoading;

  // 3. First useMemo hook
  const bookingsBySeatId = useMemo(() => {
    const map = {};
    if (!todayReservations) return map;
    todayReservations.forEach((r) => {
      const id = r.seat?._id || r.seat;
      if (!id) return;
      const key = String(id);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [todayReservations]);

  // 4. Second useMemo hook
  const seatMap = useMemo(() => {
    return seats;
  }, [seats]);

  const isReservedNow = (seat) => seat.isReserved === true || seat.upcomingSlots?.some((s) => s.status === "active");
  const isFullyBookedToday = (seat) => {
    if (isReservedNow(seat)) return true;
    const bookings = bookingsBySeatId[String(seat._id)] || [];
    return bookings.length > 0 && getAvailableSlots(bookings).length === 0;
  };

  const filteredSeats = useMemo(() => {
    if (filter === "available") return seats.filter((s) => !isFullyBookedToday(s));
    if (filter === "reserved") return seats.filter(isFullyBookedToday);
    return seats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, bookingsBySeatId, filter]);

  // Content-area skeleton only — sidebar and header stay visible via StudentLayout
  const showContentSkeleton = isApiLoading || loading;

  if (!showContentSkeleton && !seatMap.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 text-sm font-semibold">{t.noReservedToday}</p>
      </div>
    );
  }

  const totalSeats = seats.length;
  const reservedCount = seats.filter(isFullyBookedToday).length;
  const availableCount = totalSeats - reservedCount;

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };
  const handleRefetch = () => { refetch(); refetchReservations(); };

  const totalPages = Math.ceil(filteredSeats.length / PAGE_SIZE);
  const pageSeats = filteredSeats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ──── DEBUG: Log seat statistics ─────────────────────────────────────────
  useEffect(() => {
    console.log("📊 [SeatsPage] SEAT STATISTICS", {
      now: now?.toISOString(),
      totalSeats,
      availableCount,
      reservedCount,
      filteredSeatsCount: filteredSeats.length,
      currentFilter: filter,
      currentPage: page,
      pageSeats: pageSeats.map((s) => ({
        number: s.seatNumber,
        zone: s.zone,
        fullyBooked: isFullyBookedToday(s),
        upcomingSlotsCount: s.upcomingSlots?.length,
      })),
    });
  }, [now, totalSeats, availableCount, reservedCount, filteredSeats, filter, page, pageSeats, isFullyBookedToday]);

  const filterOptions = [
    { key: "all", label: seatsText.all },
    { key: "available", label: seatsText.available },
    { key: "reserved", label: seatsText.reserved },
  ];

  return (
    <section className={`${sectionWrap} mt-8 sm:mt-10 pb-12 w-full`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#2C2DE0] flex items-center justify-center">
              <SeatIconSVG color="#ffffff" size={16} />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{seatsText.seatMap}</h2>
          </div>
          <p className="text-xs text-gray-400 font-medium ml-9.5">
            {loading ? t.common.loading : seatsText.seatsAvailable(availableCount, totalSeats)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-xl gap-0.5">
            {filterOptions.map((f) => (
              <button key={f.key} onClick={() => handleFilterChange(f.key)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-150 ${filter === f.key
                  ? "bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}>{f.label}</button>
            ))}
          </div>
          <button onClick={handleRefetch}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white  dark:hover:bg-[#]/10 border bg-[#2C2DE0] dark:border-gray-800   text-sm font-bold  hover:translate-y-0.5  active:translate-y-1 active:shadow-none transition-all duration-150 group">
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Booking hours notice */}
      {!bookingOpen && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl px-4 py-3 mb-5">
          <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
            {seatsText.bookingClosed}
          </p>
        </div>
      )}

      {/* Girls-only notice */}
      <div className="flex items-start gap-3 bg-pink-50 dark:bg-pink-500/8 border border-pink-100 dark:border-pink-900/30 rounded-2xl px-4 py-3 mb-5">
        <div className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-pink-500 text-xs font-black leading-none">♀</span>
        </div>
        <p className="text-xs text-pink-600 dark:text-pink-400 font-medium leading-relaxed">{seatsText.girlsOnlyHint}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label={seatsText.totalSeats} value={totalSeats} loading={loading} variant="default" />
        <StatCard label={seatsText.available} value={availableCount} loading={loading} variant="available" />
        <StatCard label={seatsText.reserved} value={reservedCount} loading={loading} variant="reserved" />
      </div>

      {/* Content */}
      {showContentSkeleton ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-52 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : filter === "reserved" ? (
        <ReservedTable reservations={todayReservations} isLoading={reservationsLoading} lang={language} t={seatsText} common={t.common} />
      ) : (
        <>
          {filteredSeats.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mx-auto mb-4">
                <SeatIconSVG color="#9ca3af" size={26} />
              </div>
              <p className="text-gray-400 text-sm font-semibold">
                {filter === "available" ? seatsText.noAvailable : seatsText.noSeatsFound}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {pageSeats.map((seat) => {
                  const isGirlsOnly = seat.zone === "girls_only";
                  const lockedGirlsOnly = isGirlsOnly && isUniversityVerified && !canBookGirlsZone;
                  return (
                    <SeatCard
                      key={seat._id}
                      seat={seat}
                      isFullyBooked={isFullyBookedToday(seat)}
                      lockedUnverified={needsVerification}
                      lockedGirlsOnly={lockedGirlsOnly}
                      now={now}
                      onSelect={() => {
                        if (!bookingOpen) { toast.error(seatsText.bookingClosed); return; }
                        if (needsVerification) { toast.error(verifyCopy.reservationBlocked); return; }
                        if (lockedGirlsOnly) { toast.error(seatsText.girlsOnlyBlocked); return; }
                        if (!isFullyBookedToday(seat)) setSelectedSeat(seat);
                      }}
                      t={seatsText}
                      verifyCopy={verifyCopy}
                      fmtTime={(d) => fmt(d, language)}
                    />
                  );
                })}
              </div>
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-5">
                {seatsText.showing((page - 1) * PAGE_SIZE + 1, Math.min(page * PAGE_SIZE, filteredSeats.length), filteredSeats.length)}
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </>
      )}

      {selectedSeat && bookingOpen && (
        <ReservationModal
          seat={selectedSeat}
          onClose={() => { setSelectedSeat(null); refetch(); refetchReservations(); }}
        />
      )}
    </section>
  );
}

export default SeatsGrid;
