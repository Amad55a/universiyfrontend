import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeats } from "@/api/seats";
import { useLanguage } from "@/hooks/useLanguage";
import { Armchair, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import ReservationModal from "./ReservationModal";
import { getTodayReservations } from "@/api/reservation";
import { toast } from "sonner";
import { useUniversityVerification } from "@/hooks/useUniversityVerification";

const PAGE_SIZE = 10;

const fetchTodayReservations = async () => {
  return await getTodayReservations();
};

const fmt = (d, lang = "en") =>
  new Date(d).toLocaleTimeString(lang === "so" ? "so-SO" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const OPEN = 7;
const CLOSE = 17;

const getAvailableSlots = (bookedSlots) => {
  const sorted = [...bookedSlots].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );
  const free = [];
  let cursor = OPEN * 60;
  sorted.forEach((r) => {
    const startMin = new Date(r.startTime).getHours() * 60 + new Date(r.startTime).getMinutes();
    const endMin = new Date(r.endTime).getHours() * 60 + new Date(r.endTime).getMinutes();
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

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${p === page
            ? "bg-[#2C2DE0] text-white shadow-sm shadow-[#2C2DE0] dark:shadow-none"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SeatCard — unchanged
// ─────────────────────────────────────────────────────────────────────────────
const SeatCard = ({
  seat,
  isFullyBooked,
  lockedUnverified,
  lockedGirlsOnly,
  onSelect,
  t,
  verifyCopy,
}) => {
  const isReservedNow =
    seat.status === "reserved" ||
    seat.isReserved === true;
  const disabled =
    isFullyBookedToday(seat) ||
    lockedUnverified ||
    lockedGirlsOnly;
  const isGirlsOnly = seat.zone === "girls_only";

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-white dark:bg-gray-950 border rounded-2xl p-5 flex flex-col items-center transition-all duration-200 ${disabled
        ? "border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed"
        : isGirlsOnly
          ? "border-pink-100 dark:border-pink-900/50 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-lg hover:shadow-pink-100/50 dark:hover:shadow-pink-900/20 cursor-pointer"
          : "border-[#2C2DE0] dark:border-[#2C2DE0]/50 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0] hover:shadow-lg hover:shadow-[#2C2DE0]/50 dark:hover:shadow-[#2C2DE0]/20 cursor-pointer"
        }`}
    >
      {isGirlsOnly && (
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
          {t.girlsOnly}
        </span>
      )}
      <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isReservedNow || isFullyBooked
        ? "bg-red-50 dark:bg-red-500/10 text-red-400"
        : disabled
          ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
          : "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 text-[#2C2DE0]"
        }`}>
        {isReservedNow || isFullyBooked
          ? t.taken
          : lockedUnverified
            ? verifyCopy.lockedReserve
            : lockedGirlsOnly
              ? t.notAvailable
              : t.free}
      </span>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isReservedNow || isFullyBooked
        ? "bg-gray-100 dark:bg-gray-800"
        : "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/10 group-hover:bg-[#2C2DE0]/20 dark:group-hover:bg-[#2C2DE0]/20"
        }`}>
        <Armchair
          size={22}
          strokeWidth={1.5}
          className={isReservedNow || isFullyBooked ? "text-gray-300 dark:text-gray-600" : "text-[#2C2DE0]"}
        />
      </div>
      <p className="font-bold text-gray-900 dark:text-white text-sm">
        {t.seat} {seat.seatNumber}
      </p>
      {isGirlsOnly && (
        <p className="text-[10px] text-pink-500 dark:text-pink-400 mt-1 text-center leading-tight">
          {t.girlsOnlyHint}
        </p>
      )}
      <button
        disabled={disabled}
        className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all duration-150 ${disabled
          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
          : isGirlsOnly
            ? "bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white shadow-[0_4px_0_#9d174d] hover:translate-y-0.5 hover:shadow-[0_2px_0_#9d174d] active:translate-y-1 active:shadow-none"
            : "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none"
          }`}
      >
        {isReservedNow || isFullyBooked
          ? t.notAvailable
          : lockedUnverified
            ? verifyCopy.lockedReserve
            : lockedGirlsOnly
              ? t.notAvailable
              : t.reserve}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ReservedTable — grouped by seat, shows booked + available time slots
// ─────────────────────────────────────────────────────────────────────────────
const ReservedTable = ({ reservations, isLoading, lang, t, common }) => {
  const [page, setPage] = useState(1);

  // Group reservations by seat
  const seatMap = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      const seatId = r.seat?._id || r.seat;
      const seatNum = r.seat?.seatNumber ?? "—";
      if (!seatId) return;
      if (!map[seatId]) {
        map[seatId] = {
          seatNumber: seatNum,
          zone: r.seat?.zone ?? "general",
          slots: [],
        };
      }
      map[seatId].slots.push(r);
    });
    return Object.values(map).sort((a, b) => a.seatNumber - b.seatNumber);
  }, [reservations]);

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (!seatMap.length) return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
        <Armchair size={22} className="text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-gray-400 text-sm font-medium">{t.noReservedToday}</p>
      <p className="text-gray-400 text-xs mt-1">{t.allSeatsAvailable}</p>
    </div>
  );

  const totalPages = Math.ceil(seatMap.length / PAGE_SIZE);
  const pageRows = seatMap.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {t.seat}
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {t.time}
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                Available slots
              </th>

            </tr>
          </thead>
          <tbody>
            {pageRows.map((seatRow, index) => {
              const freeSlots = getAvailableSlots(seatRow.slots);
              return (
                <tr
                  key={seatRow.seatNumber}
                  className={`border-b border-gray-50 dark:border-gray-900 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors ${index % 2 !== 0 ? "bg-gray-50/30 dark:bg-gray-900/20" : ""
                    }`}
                >
                  {/* Seat */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                        <Armchair size={13} className="text-red-400" strokeWidth={1.5} />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {t.seat} {seatRow.seatNumber}
                      </span>
                      {seatRow.zone === "girls_only" && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
                          {t.girlsOnly}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Booked slots */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      {seatRow.slots.map((r) => (
                        <div key={r._id} className="flex items-center gap-1.5">
                          <Clock size={11} className="text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {fmt(r.startTime, lang)} – {fmt(r.endTime, lang)}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.status === "active"
                            ? "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 text-[#2C2DE0]"
                            : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500"
                            }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Available slots */}
                  <td className="px-4 py-4 hidden sm:table-cell">
                    {freeSlots.length === 0 ? (
                      <span className="text-xs text-red-400 font-medium">Fully booked</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {freeSlots.map((slot, i) => (
                          <span key={i} className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0] font-medium whitespace-nowrap">
                            {minsToTime(slot.from)} – {minsToTime(slot.to)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>


                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {seatMap.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SeatsGrid
// ─────────────────────────────────────────────────────────────────────────────
const SeatsGrid = () => {
  const { language, t } = useLanguage();
  const seatsText = t.seats;
  const verifyCopy = t.universityVerification;
  const { needsVerification, canBookGirlsZone, isUniversityVerified } = useUniversityVerification();
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const {
    data: seats = [],
    isLoading: seatsLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["seats"],
    queryFn: getSeats,
  });

  const {
    data: todayReservations = [],
    isLoading: reservationsLoading,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: ["todayReservations"],
    queryFn: fetchTodayReservations,
    staleTime: 30_000,
  });

  const isLoading = seatsLoading || reservationsLoading;

  // Taken only when 7:00 AM–5:00 PM has no free gap (same logic as ReservedTable)
  const bookingsBySeatId = useMemo(() => {
    const map = {};
    todayReservations.forEach((r) => {
      const id = r.seat?._id || r.seat;
      if (!id) return;
      const key = String(id);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [todayReservations]);

  const isReservedNow = (seat) =>
    seat.status === "reserved" ||
    seat.status === "occupied" ||
    seat.isReserved === true;

  const isFullyBookedToday = (seat) => {
    const bookings = bookingsBySeatId[String(seat._id)] || [];

    // if no bookings → seat is available
    if (bookings.length === 0) return false;

    // check if FULL TIME RANGE is covered
    const freeSlots = getAvailableSlots(bookings);

    return freeSlots.length === 0;
  };

  const totalSeats = seats.length;
  const reservedCount = seats.filter(isFullyBookedToday).length;
  const availableCount = totalSeats - reservedCount;

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };
  const handleRefetch = () => { refetch(); refetchReservations(); };

  const filteredSeats = useMemo(() => {
    if (filter === "available") return seats.filter((s) => !isFullyBookedToday(s));
    if (filter === "reserved") return seats.filter(isFullyBookedToday);
    return seats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, bookingsBySeatId, filter]);

  const totalPages = Math.ceil(filteredSeats.length / PAGE_SIZE);
  const pageSeats = filteredSeats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="max-w-6xl mx-auto mt-10 px-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{seatsText.seatMap}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? t.common.loading : seatsText.seatsAvailable(availableCount, totalSeats)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {[
              { key: "all", label: seatsText.all },
              { key: "available", label: seatsText.available },
              { key: "reserved", label: seatsText.reserved },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${filter === f.key
                  ? "bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefetch}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0]/10 dark:hover:bg-[#2C2DE0]/10 transition-all duration-150 group"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <p className="text-xs text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-900/40 rounded-xl px-4 py-2.5 mb-4 text-center font-medium">
        {seatsText.girlsOnlyHint}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: seatsText.totalSeats, value: totalSeats, color: "text-gray-900 dark:text-white" },
          { label: seatsText.available, value: availableCount, color: "text-[#2C2DE0]" },
          { label: seatsText.reserved, value: reservedCount, color: "text-red-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-center"
          >
            <p className={`text-2xl font-black ${stat.color}`}>
              {isLoading ? "—" : stat.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>

      ) : filter === "reserved" ? (
        <ReservedTable
          reservations={todayReservations}
          isLoading={reservationsLoading}
          lang={language}
          t={seatsText}
          common={t.common}
        />

      ) : (
        <>
          {filteredSeats.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {filter === "available" ? seatsText.noAvailable : seatsText.noSeatsFound}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {pageSeats.map((seat) => {
                  const isGirlsOnly = seat.zone === "girls_only";
                  const lockedGirlsOnly =
                    isGirlsOnly &&
                    isUniversityVerified &&
                    !canBookGirlsZone;

                  return (
                    <SeatCard
                      key={seat._id}
                      seat={seat}
                      isFullyBooked={isFullyBookedToday(seat)}
                      lockedUnverified={needsVerification}
                      lockedGirlsOnly={lockedGirlsOnly}
                      onSelect={() => {
                        if (needsVerification) {
                          toast.error(verifyCopy.reservationBlocked);
                          return;
                        }
                        if (lockedGirlsOnly) {
                          toast.error(seatsText.girlsOnlyBlocked);
                          return;
                        }
                        if (!isFullyBookedToday(seat)) setSelectedSeat(seat);
                      }}
                      t={seatsText}
                      verifyCopy={verifyCopy}
                    />
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-gray-400 mt-4">
                {seatsText.showing((page - 1) * PAGE_SIZE + 1, Math.min(page * PAGE_SIZE, filteredSeats.length), filteredSeats.length)}
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </>
      )}

      {selectedSeat && (
        <ReservationModal
          seat={selectedSeat}
          onClose={() => {
            setSelectedSeat(null);
            refetch();
            refetchReservations();
          }}
        />
      )}
    </section>
  );
};

export default SeatsGrid;
