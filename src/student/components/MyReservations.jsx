import { getMyReservations } from "@/api/myreservation";
import { getSeatBookedSlots, extendReservation, rescheduleReservation, cancelReservation } from "@/api/reservation";
import { OPEN_HOUR, CLOSE_HOUR } from "@/utils/time";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, Clock, Armchair, Inbox, X, RefreshCw,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  QrCode, Timer, AlertTriangle, Zap, Hourglass, ChevronDown,
  Plus, ScanLine,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { sectionWrap } from "@/shared/constants/surfaces";
import { useUniversityVerification } from "@/hooks/useUniversityVerification";
import socket from "@/socket";
// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const ALL_SLOTS = (() => {
  const s = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    s.push(`${String(h).padStart(2, "0")}:00`);
    s.push(`${String(h).padStart(2, "0")}:30`);
  }
  return s;
})();

const parseSlot = (slot) => { const [h, m] = slot.split(":").map(Number); return { hours: h, minutes: m }; };
const formatSlot = (slot) => {
  const { hours, minutes } = parseSlot(slot);
  const period = hours < 12 ? "AM" : "PM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
};

const addDuration = (slot, durationHours) => {
  const { hours, minutes } = parseSlot(slot);
  const total = hours * 60 + minutes + durationHours * 60;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  if (endH > CLOSE_HOUR || (endH === CLOSE_HOUR && endM > 0)) return null;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

const slotToMin = (slot) => { const { hours, minutes } = parseSlot(slot); return hours * 60 + minutes; };

const overlapsBooking = (slotStart, slotEnd, booking, today) => {
  const { hours: sh, minutes: sm } = parseSlot(slotStart);
  const { hours: eh, minutes: em } = parseSlot(slotEnd);
  const slotStartInstant = new Date(today);
  slotStartInstant.setHours(sh, sm, 0, 0);
  const slotEndInstant = new Date(today);
  slotEndInstant.setHours(eh, em, 0, 0);
  const bookingStart = new Date(booking.startTime).getTime();
  const bookingEnd = new Date(booking.endTime).getTime();
  return slotStartInstant.getTime() < bookingEnd && slotEndInstant.getTime() > bookingStart;
};

const isSameBooking = (b, reservation) =>
  new Date(b.startTime).getTime() === new Date(reservation.startTime).getTime() &&
  new Date(b.endTime).getTime() === new Date(reservation.endTime).getTime();

const fetchBookedSlots = async (seatId) => {
  return await getSeatBookedSlots(seatId);
};

const fmt = (date, language = "en") =>
  new Date(date).toLocaleTimeString(language === "so" ? "so-SO" : "en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const fmtDate = (date, language = "en") =>
  new Date(date).toLocaleDateString(language === "so" ? "so-SO" : "en-US", { weekday: "short", month: "short", day: "numeric" });

// ─────────────────────────────────────────────────────────────────────────────
// Countdown display
// ─────────────────────────────────────────────────────────────────────────────
const CountdownDisplay = ({ startTime, endTime, t, now }) => {
  const currentNow = now ?? new Date();
  const diff = new Date(endTime).getTime() - currentNow.getTime();
  if (diff <= 0) return null;
  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const urgent = h === 0 && m < 15;
  const critical = h === 0 && m < 5;
  const sessionTotal = (new Date(endTime) - new Date(startTime)) / 1000;
  const pct = Math.max(0, Math.min(1, total / sessionTotal));
  const R = 20;
  const circ = 2 * Math.PI * R;
  const dash = circ * pct;

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-4 shadow-sm ${critical ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
      : urgent ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
        : "bg-[#2C2DE0] border-[#2C2DE0]"
      }`}>
      <div className="relative flex-shrink-0 w-12 h-12">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
          <circle cx="24" cy="24" r={R} fill="none" strokeWidth="3.5"
            className={critical ? "stroke-red-200 dark:stroke-red-800" : urgent ? "stroke-orange-200 dark:stroke-orange-800" : "stroke-white/25"} />
          <circle cx="24" cy="24" r={R} fill="none" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className={`transition-all duration-1000 ${critical ? "stroke-red-500" : urgent ? "stroke-orange-500" : "stroke-white"}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Timer size={14} className={critical ? "text-red-500 animate-pulse" : urgent ? "text-orange-500" : "text-white"} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${critical ? "text-red-500" : urgent ? "text-orange-500" : "text-white/75"}`}>
          {critical ? (t.myReservations?.endingSoon ?? "Ending soon!") : urgent ? (t.myReservations?.lessThan15 ?? "Less than 15 min left") : (t.myReservations?.sessionActive ?? "Session active")}
        </p>
        <div className="flex items-baseline gap-0.5">
          {h > 0 && <><span className={`text-xl font-black font-mono tabular-nums ${critical ? "text-red-600 dark:text-red-400" : urgent ? "text-orange-600 dark:text-orange-400" : "text-white"}`}>{pad(h)}</span><span className={`text-xs mx-0.5 ${critical ? "text-red-400" : urgent ? "text-orange-400" : "text-white/60"}`}>h</span></>}
          <span className={`text-xl font-black font-mono tabular-nums ${critical ? "text-red-600 dark:text-red-400" : urgent ? "text-orange-600 dark:text-orange-400" : "text-white"}`}>{pad(m)}</span>
          <span className={`text-xs mx-0.5 ${critical ? "text-red-400" : urgent ? "text-orange-400" : "text-white/60"}`}>m</span>
          <span className={`text-xl font-black font-mono tabular-nums ${critical ? "text-red-600 dark:text-red-400" : urgent ? "text-orange-600 dark:text-orange-400" : "text-white"}`}>{pad(s)}</span>
          <span className={`text-xs mx-0.5 ${critical ? "text-red-400" : urgent ? "text-orange-400" : "text-white/60"}`}>s</span>
          <span className={`text-xs font-medium ml-1 ${critical ? "text-red-400" : urgent ? "text-orange-400" : "text-white/70"}`}>{t.myReservations?.remaining ?? "remaining"}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QR image — gradient frame + white inset + scan badge, reused by both
// the active-session card and the pending-card toggle.
// ─────────────────────────────────────────────────────────────────────────────
const QrImage = ({ token, size = 148 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&ecc=M&margin=8`}
    alt="QR" width={size} height={size} className="block rounded-lg" />
);

const QrFrame = ({ token, size = 148, badgeText }) => (
  <div className="relative flex flex-col items-center gap-3 w-full">
    {badgeText && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full  text-black text-[10px] font-black uppercase tracking-widest shadow-sm shadow-[#2C2DE0] dark:shadow-none">
        <ScanLine size={11} /> {badgeText}
      </span>
    )}
    <div className="">
      <div className="rounded-[14px] overflow-hidden bg-white p-2">
        <QrImage token={token} size={size} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Duration options helper
// ─────────────────────────────────────────────────────────────────────────────
const getDurationOptions = (t) => [
  { label: t.reservation.dur30, value: 0.5 },
  { label: t.reservation.dur1, value: 1 },
  { label: t.reservation.dur1h, value: 1.5 },
  { label: t.reservation.dur2, value: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXTEND MODAL — for ACTIVE reservations only
// ─────────────────────────────────────────────────────────────────────────────
const ExtendModal = ({ reservation, onClose }) => {
  const { t } = useLanguage();
  const copy = t.myReservations;
  const queryClient = useQueryClient();

  const [choice, setChoice] = useState(null); // 30 or 60
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  // Error banner auto-dismisses after 5s.
  useEffect(() => {
    if (!errorMsg) return;
    const id = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(id);
  }, [errorMsg]);

  const alreadyExtended = (reservation.extensionCount ?? 0) >= 1;

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async (extensionMinutes) =>
      extendReservation(reservation._id, extensionMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
      toast.success(copy.extendSuccess ?? "Session extended!");
      setSuccess(true);
      setTimeout(onClose, 1600);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || copy.rescheduleFailed || "Something went wrong");
    },
  });

  const previewNewEnd = choice
    ? new Date(new Date(reservation.endTime).getTime() + choice * 60 * 1000)
    : null;

  const wouldExceedClose = (minutes) => {
    const closeTime = new Date(reservation.endTime);
    closeTime.setHours(CLOSE_HOUR, 0, 0, 0);
    const newEnd = new Date(new Date(reservation.endTime).getTime() + minutes * 60 * 1000);
    return newEnd > closeTime;
  };

  const options = [
    { label: "+ 30 min", value: 30 },
    { label: "+ 1 hr", value: 60 },
  ].map((opt) => ({
    ...opt,
    exceedsClose: wouldExceedClose(opt.value),
  }));

  const handleExtend = () => {
    if (!choice) return;
    setErrorMsg(null);
    mutate(choice);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm bg-white dark:bg-gray-950 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden">

        {success ? (
          <div className="py-14 flex flex-col items-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 flex items-center justify-center mb-4">
              <CheckCircle2 size={30} className="text-[#2C2DE0]" />
            </div>
            <p className="text-base font-black text-gray-900 dark:text-white">{copy.extendSuccess ?? "Session extended!"}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{copy.extendTitle ?? "Extend session"}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {copy.extendSub ?? "Current end"}: <span className="font-bold text-gray-600 dark:text-gray-300">{fmt(reservation.endTime)}</span>
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <X size={15} />
              </button>
            </div>

            <div className="px-5 py-5 flex flex-col gap-4">

              {alreadyExtended && (
                <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    {copy.extendLimitReached ?? "You have already extended this reservation once. Make a new reservation for more time."}
                  </p>
                </div>
              )}

              {!alreadyExtended && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {options.map((opt) => {
                      const blocked = opt.exceedsClose;
                      const selected = choice === opt.value;
                      const newEndPreview = !blocked
                        ? new Date(new Date(reservation.endTime).getTime() + opt.value * 60 * 1000)
                        : null;
                      return (
                        <button
                          key={opt.value}
                          disabled={blocked}
                          onClick={() => { setChoice(opt.value); setErrorMsg(null); }}
                          className={`relative flex flex-col items-center justify-center py-5 rounded-2xl border transition-all font-bold text-sm ${selected
                            ? "bg-[#2C2DE0] border-[#2C2DE0] text-white shadow-sm shadow-[#2C2DE0] dark:shadow-none"
                            : blocked
                              ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
                            }`}
                        >
                          <Plus size={16} className="mb-1" />
                          <span>{opt.label}</span>
                          {newEndPreview && (
                            <span className={`text-[10px] mt-1 font-normal ${selected ? "text-[#2C2DE0]" : "text-gray-400"}`}>
                              → {fmt(newEndPreview)}
                            </span>
                          )}
                          {blocked && (
                            <span className="text-[9px] mt-1 font-normal text-red-400 px-1 text-center leading-tight">
                              {copy.exceedsClose ?? "Exceeds closing time"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {choice && previewNewEnd && (
                    <div className="bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">{copy.newEndTime ?? "New end time"}</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {fmt(reservation.startTime)} → <span className="text-[#2C2DE0] dark:text-[#2C2DE0]">{fmt(previewNewEnd)}</span>
                      </p>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-500">{errorMsg}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                      {copy.cancelBtn ?? "Cancel"}
                    </button>
                    <button onClick={handleExtend} disabled={isLoading || !choice}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group">
                      {isLoading ? (copy.rescheduling ?? "Saving…") : (copy.extendConfirm ?? "Extend")}
                    </button>
                  </div>
                </>
              )}

              {alreadyExtended && (
                <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-all">
                  {copy.cancelBtn ?? "Close"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE SLOT EDITOR — for PENDING reservations only
// `now` is the shared, real, corrected clock passed down from the page.
// ─────────────────────────────────────────────────────────────────────────────
const InlineSlotEditor = ({ reservation, now, onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const copy = t.myReservations;
  const resCopy = t.reservation;
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration, setDuration] = useState(1);
  const [errorMsg, setErrorMsg] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!errorMsg) return;
    const id = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(id);
  }, [errorMsg]);

  const seatId = reservation.seat?._id ?? reservation.seat;
  const endSlot = selectedSlot ? addDuration(selectedSlot, duration) : null;

  const { data: bookedSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["seatSlots", seatId, "edit"],
    queryFn: () => fetchBookedSlots(seatId),
    enabled: !!seatId,
    staleTime: 0,
  });

  const others = useMemo(
    () => bookedSlots.filter((b) => !isSameBooking(b, reservation)),
    [bookedSlots, reservation]
  );

  useEffect(() => { setSelectedSlot(null); setErrorMsg(null); setConfirmed(false); }, [duration]);

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async ({ slotIndex, durationSlots }) =>
      rescheduleReservation(reservation._id, { slotIndex, durationSlots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
      queryClient.invalidateQueries({ queryKey: ["seatSlots", seatId] });
      toast.success(copy.reschedSuccess ?? "Reservation updated!");
      onSuccess?.();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || copy.rescheduleFailed || "Something went wrong");
      setConfirmed(false);
    },
  });

  const handleSave = () => {
    if (!selectedSlot || !endSlot) return;

    if (reservation.qrCode && !confirmed) { setConfirmed(true); return; }

    if (others.some((b) => overlapsBooking(selectedSlot, endSlot, b))) {
      setErrorMsg(copy.slotTaken ?? "That slot is no longer available."); setConfirmed(false); return;
    }

    setErrorMsg(null);
    const slotIndex = ALL_SLOTS.indexOf(selectedSlot);
    const durationSlots = Math.round(duration / 0.5);
    mutate({ slotIndex, durationSlots });
  };

  const slotStates = ALL_SLOTS.map((slot) => {
    const end = addDuration(slot, duration);
    if (!end) return { slot, state: "closed" };
    const { hours, minutes } = parseSlot(slot);
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    if (slotTime <= now) return { slot, state: "past" };
    if (!loadingSlots && others.some((b) => overlapsBooking(slot, end, b, now))) return { slot, state: "taken" };
    return { slot, state: "free" };
  });

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <p className="text-xs font-black text-gray-800 dark:text-white">{copy.rescheduleTitle ?? "Reschedule"}</p>
        <button onClick={onCancel} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{copy.duration ?? "Duration"}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {getDurationOptions(t).map((opt) => (
              <button key={opt.value}
                onClick={() => { setDuration(opt.value); setSelectedSlot(null); setConfirmed(false); }}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${duration === opt.value
                  ? "bg-[#2C2DE0] border-[#2C2DE0] text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#2C2DE0]"
                  }`}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.newTime ?? "New time"}</p>
            <span className="flex items-center gap-2 text-[9px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#2C2DE0] dark:bg-[#2C2DE0]/60 border border-[#2C2DE0] dark:border-[#2C2DE0]" />{resCopy.free ?? "Free"}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700" />{resCopy.taken ?? "Taken"}</span>
            </span>
          </div>

          {loadingSlots ? (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {slotStates.map(({ slot, state }) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button key={slot} disabled={state !== "free"}
                    onClick={() => { setSelectedSlot(slot); setErrorMsg(null); setConfirmed(false); }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${isSelected
                      ? "bg-[#2C2DE0] text-white ring-2 ring-[#2C2DE0] dark:ring-[#2C2DE0] shadow-sm"
                      : state === "taken"
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed line-through"
                        : state === "past"
                          ? "bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40"
                          : state === "closed"
                            ? "bg-white dark:bg-gray-800 text-gray-200 dark:text-gray-700 cursor-not-allowed border border-dashed border-gray-200 dark:border-gray-700"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-[#2C2DE0]/30 dark:border-[#2C2DE0]/40 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
                      }`}
                  >{formatSlot(slot)}</button>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><Clock size={10} />{resCopy.hours}</p>
        </div>

        {selectedSlot && endSlot && (
          <div className="bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-gray-400 mb-0.5">{copy.newSession ?? "New session"}</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{formatSlot(selectedSlot)} → {formatSlot(endSlot)}</p>
          </div>
        )}

        {confirmed && reservation.qrCode && selectedSlot && endSlot && (
          <div className="flex gap-2 items-start bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl px-3 py-3">
            <AlertCircle size={13} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-0.5">{copy.qrRescheduleConfirmTitle ?? "This will invalidate your current QR code"}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">{copy.qrRescheduleNotice ?? "A new QR code will be issued for the new time."}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-3 py-3">
            <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-500">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all">
            {copy.cancelBtn ?? "Cancel"}
          </button>
          <button onClick={handleSave} disabled={isLoading || !selectedSlot || !endSlot}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all ${confirmed ? "bg-yellow-500 hover:bg-yellow-600" : "bg-[#2C2DE0] hover:bg-[#2C2DE0]"
              } text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group`}
          >
            {isLoading ? (copy.rescheduling ?? "Saving…") : confirmed ? (copy.confirmYes ?? "Yes, confirm") : (copy.saveTime ?? "Save time")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel confirm strip
// ─────────────────────────────────────────────────────────────────────────────
const CancelConfirm = ({ reservationId, hasQr, onDone, onAbort }) => {
  const { t } = useLanguage();
  const copy = t.myReservations;
  const queryClient = useQueryClient();

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: () => cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
      queryClient.invalidateQueries({ queryKey: ["seatSlots"] });
      toast.success(copy.cancelSuccess ?? "Reservation cancelled.");
      onDone();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || copy.cancelFailed || "Could not cancel.");
      onAbort();
    },
  });

  return (
    <div className="mt-3 rounded-2xl border overflow-hidden border-red-200 dark:border-red-500/20">
      {hasQr && (
        <div className="flex gap-2 items-start px-4 py-3 bg-yellow-50 dark:bg-yellow-500/10 border-b border-yellow-200 dark:border-yellow-500/20">
          <AlertTriangle size={13} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">{copy.qrCancelNotice ?? "Your QR code will be invalidated."}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10">
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{copy.confirmCancel ?? "Cancel this reservation?"}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onAbort} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all">
            {t.common.no ?? "No"}
          </button>
          <button onClick={() => mutate()} disabled={isLoading} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all">
            {isLoading ? (copy.cancelling ?? "Cancelling…") : (copy.yesCancel ?? "Yes, cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE CARD — `now` is the shared, real, corrected clock from the page.
// ─────────────────────────────────────────────────────────────────────────────
const ActiveCard = ({ r, canManage, now }) => {
  const { t, language } = useLanguage();
  const copy = t.myReservations;
  const [expanded, setExpanded] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const shortId = r._id?.slice(-8).toUpperCase();
  const sessionNotEnded = new Date(r.endTime) > now;
  const canExtend = (r.extensionCount ?? 0) < 1 && sessionNotEnded;

  return (
    <>
      {/* Container - Clean Border & Soft Neutral Shadow */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow">

        {/* Header - Gradient Blue Primary */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 pt-4 pb-4 text-left transition-opacity hover:opacity-95"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-wide">{t.common.active ?? "Active"}</p>
                {/* Fixed Contrast Bug: text-blue-100 */}
                <p className="text-blue-100 text-xs font-medium">{t.seats?.seat ?? "Seat"} {r.seat?.seatNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(r.extensionCount ?? 0) >= 1 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-sm">
                  {copy.extendedBadge ?? "Extended"}
                </span>
              )}
              <span className="bg-white/20 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">
                #{shortId}
              </span>
              <ChevronDown size={16} className={`text-white/80 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-white/80 text-xs">
            <CalendarDays size={11} /><span>{fmtDate(r.startTime, language)}</span>
            <span className="opacity-40">·</span>
            <Clock size={11} /><span className="font-bold">{fmt(r.startTime, language)} – {fmt(r.endTime, language)}</span>
          </div>
        </button>

        {/* Content Body */}
        {expanded && (
          <div className="px-5 py-4 flex flex-col gap-4 text-white">

            {sessionNotEnded && <CountdownDisplay startTime={r.startTime} endTime={r.endTime} t={t} now={now} />}

            {/* QR Section - Soft Gray Neutral Background */}
            {r.qrCode && (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-4 text-black">
                <QrFrame token={r.qrCode} size={160} badgeText={"erghj"} />
                <div className="w-full flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.reservationId ?? "Reservation ID"}</span>
                  <span className="text-xs font-mono font-black text-gray-900 dark:text-white tracking-wider">#{shortId}</span>
                </div>
                <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 leading-relaxed">{copy.qrHint ?? "Show this QR code at the library entrance to check in."}</p>
              </div>
            )}

            {/* Action Buttons */}
            {canManage && !confirmCancel && (
              <div className="flex gap-2">
                {canExtend && (
                  <button
                    onClick={() => setExtendOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-black dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all"
                  >
                    <Plus size={12} />{copy.extendBtn ?? "Extend"}
                  </button>
                )}
                {!canExtend && sessionNotEnded && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 cursor-not-allowed">
                    <Plus size={12} />{copy.extendLimitShort ?? "Extended once"}
                  </div>
                )}
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all"
                >
                  <X size={12} />{copy.cancelBtn ?? "Cancel"}
                </button>
              </div>
            )}

            {confirmCancel && (
              <CancelConfirm reservationId={r._id} hasQr={!!r.qrCode} onDone={() => setConfirmCancel(false)} onAbort={() => setConfirmCancel(false)} />
            )}
          </div>
        )}
      </div>

      {extendOpen && (
        <ExtendModal reservation={r} onClose={() => setExtendOpen(false)} />
      )}
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// PENDING CARD — cancel and edit only. `now` is the shared, real,
// corrected clock.
// ─────────────────────────────────────────────────────────────────────────────
const PendingCard = ({ r, canManage, now }) => {
  const { t, language } = useLanguage();
  const copy = t.myReservations;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const shortId = r._id?.slice(-8).toUpperCase();
  const sessionNotEnded = new Date(r.endTime) > now;

  const start = new Date(r.startTime);
  const minutesUntilCheckin = (start.getTime() - now.getTime()) / 60000;
  const checkinWindowOpen = minutesUntilCheckin <= 15;

  return (
    <div className="rounded-2xl border border-yellow-200 dark:border-yellow-700/50 bg-white dark:bg-gray-950 overflow-hidden">

      <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-yellow-500" />

      <div className="px-5 py-4">

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Hourglass size={17} className="text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-bold text-gray-900 dark:text-white text-sm">{t.seats?.seat ?? "Seat"} {r.seat?.seatNumber}</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{t.common.pending ?? "Pending"}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400"><CalendarDays size={11} />{fmtDate(r.startTime, language)}</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />{fmt(r.startTime, language)} – {fmt(r.endTime, language)}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-1">#{shortId}</p>
          </div>
        </div>

        {checkinWindowOpen && sessionNotEnded && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl  dark:bg-[#2C2DE0]/10 border dark:border-[#2C2DE0]/20">
            <CheckCircle2 size={12} className="text-[#2C2DE0] flex-shrink-0" />
            <p className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0] font-medium">
              {copy.checkinWindowOpen ?? "Check-in is now open. Show your QR code at the library entrance."}
            </p>
          </div>
        )}

        {r.qrCode && !editOpen && (
          <div className="mt-3">
            <button onClick={() => setQrOpen((p) => !p)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${qrOpen
                ? " dark:bg-[#2C2DE0]/10 border-[#2C2DE0] dark:border-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]"
                : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
                }`}>
              <span className="flex items-center gap-2"><QrCode size={13} />{copy.showQr ?? "Show QR code"}</span>
              <span className={`text-[10px] transition-transform duration-200 ${qrOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {qrOpen && (
              <div className="mt-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center gap-3">
                <QrFrame token={r.qrCode} size={148} />
                <div className="w-full flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.reservationId ?? "Reservation ID"}</span>
                  <span className="text-xs font-mono font-black text-gray-900 dark:text-white tracking-wider">#{shortId}</span>
                </div>
                <p className="text-[10px] text-center text-gray-400 leading-relaxed">{copy.qrHint ?? "Show this QR code at the library entrance to check in."}</p>
              </div>
            )}
          </div>
        )}

        {editOpen && (
          <InlineSlotEditor
            reservation={r}
            now={now}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        )}

        {canManage && !confirmCancel && !editOpen && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => setConfirmCancel(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 transition-all">
              <X size={12} />{copy.cancelBtn ?? "Cancel"}
            </button>
            {!checkinWindowOpen && sessionNotEnded && (
              <button onClick={() => { setEditOpen(true); setQrOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#2C2DE0] dark:text-[#2C2DE0] bg-[#2C2DE0] text-white dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 hover:bg-[#2C2DE0] transition-all">
                <RefreshCw size={12} />{copy.rescheduleBtn ?? "Reschedule"}
              </button>
            )}
          </div>
        )}

        {confirmCancel && (
          <CancelConfirm reservationId={r._id} hasQr={!!r.qrCode} onDone={() => setConfirmCancel(false)} onAbort={() => setConfirmCancel(false)} />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY CARD — compact read-only
// ─────────────────────────────────────────────────────────────────────────────
const HistoryCard = ({ r }) => {
  const { t, language } = useLanguage();
  const shortId = r._id?.slice(-8).toUpperCase();
  const styles = {
    completed: { dot: "bg-gray-400", badge: "bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700", label: t.common.completed },
    cancelled: { dot: "bg-red-400", badge: "bg-red-50 dark:bg-red-500/10 text-red-400 border-red-100 dark:border-red-500/20", label: t.common.cancelled },
    no_show: { dot: "bg-orange-400", badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-400 border-orange-100 dark:border-orange-500/20", label: t.common.noShow ?? "No-show" },
  };
  const style = styles[r.status] || styles.completed;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
        <Armchair size={16} strokeWidth={1.5} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">{t.seats?.seat ?? "Seat"} {r.seat?.seatNumber}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{fmtDate(r.startTime, language)}</span>
          <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-400">{fmt(r.startTime, language)} – {fmt(r.endTime, language)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />{style.label}
        </span>
        <span className="text-[10px] font-mono text-gray-300 dark:text-gray-700">#{shortId}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useLanguage();
  const copy = t.myReservations;
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push("..."); pages.push(totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1); pages.push("..."); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); pages.push("..."); pages.push(currentPage - 1); pages.push(currentPage); pages.push(currentPage + 1); pages.push("..."); pages.push(totalPages); }
    return pages;
  };
  return (
    <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
        <ChevronLeft size={16} /><span className="hidden sm:inline">{copy.previous ?? "Previous"}</span>
      </button>
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, idx) =>
          page === "..." ? <span key={`e-${idx}`} className="px-2 text-gray-400">…</span> : (
            <button key={page} onClick={() => onPageChange(page)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === page ? "bg-[#2C2DE0] text-white shadow-sm" : "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"}`}
            >{page}</button>
          )
        )}
      </div>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
        <span className="hidden sm:inline">{copy.next ?? "Next"}</span><ChevronRight size={16} />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page — use current browser time for demo
// ─────────────────────────────────────────────────────────────────────────────
const MyReservations = () => {
  const { t } = useLanguage();
  const { isUniversityVerified } = useUniversityVerification();
  const copy = t.myReservations;
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["myReservations"],
    queryFn: getMyReservations,
  });

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleReservationUpdated = (data) => {
      queryClient.setQueryData(["myReservations"], (old = []) =>
        old.map((r) => (r._id === data._id ? { ...r, ...data } : r))
      );
    };

    const handleCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
    };

    socket.on("reservation:updated", handleReservationUpdated);
    socket.on("reservation:cancelled", handleReservationUpdated);
    socket.on("reservation:created", handleCreated);

    return () => {
      socket.off("reservation:updated", handleReservationUpdated);
      socket.off("reservation:cancelled", handleReservationUpdated);
      socket.off("reservation:created", handleCreated);
    };
  }, [queryClient]);

  const sorted = useMemo(() => {
    const order = { active: 0, pending: 1, completed: 2, cancelled: 3, no_show: 4 };
    return [...data].sort((a, b) => {
      const od = (order[a.status] ?? 5) - (order[b.status] ?? 5);
      return od !== 0 ? od : new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [data]);

  const counts = useMemo(() => sorted.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}), [sorted]);

  const liveItems = sorted.filter((r) => r.status === "active" || r.status === "pending");
  const historyItems = sorted.filter((r) => r.status !== "active" && r.status !== "pending");
  const totalPages = Math.ceil(historyItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentHistory = historyItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <section className={`${sectionWrap} max-w-2xl mt-6 pb-16`}>

      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">{copy.title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {isLoading ? t.common.loading : data.length > 0 ? `${data.length} ${copy.totalLabel ?? "reservations"}` : copy.noReservations}
        </p>
      </div>

      {!isLoading && data.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "active", label: t.common.active, dot: "bg-[#2C2DE0]" },
            { key: "pending", label: t.common.pending, dot: "bg-yellow-400" },
            { key: "completed", label: t.common.completed, dot: "bg-gray-400" },
            { key: "cancelled", label: t.common.cancelled, dot: "bg-red-400" },
          ].map(({ key, label, dot }) =>
            counts[key] > 0 ? (
              <span key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{counts[key]} {label}
              </span>
            ) : null
          )}
        </div>
      )}

      {isLoading && <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />)}</div>}
      {error && <div className="py-10 text-center text-sm text-red-400">{copy.loadErr}</div>}

      {!isLoading && !error && data.length === 0 && (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4"><Inbox size={22} className="text-gray-300 dark:text-gray-600" /></div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{copy.empty}</p>
          <p className="text-gray-400 text-xs mt-1 mb-6">{copy.emptySub}</p>
          <Link to="/seats" className="bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-[#2C2DE0] dark:shadow-none">{copy.goSeats ?? "Browse seats"}</Link>
        </div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <>
          {liveItems.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {liveItems.map((r) =>
                r.status === "active"
                  ? <ActiveCard key={r._id} r={r} canManage={isUniversityVerified} now={now} />
                  : <PendingCard key={r._id} r={r} canManage={isUniversityVerified} now={now} />
              )}
            </div>
          )}

          {historyItems.length > 0 && (
            <>
              {liveItems.length > 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{copy.history ?? "History"}</span>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                {currentHistory.map((r) => <HistoryCard key={r._id} r={r} />)}
              </div>
              {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </>
          )}
        </>
      )}

      <div className="mt-10 text-center">
        <Link to="/dashboard" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors">{copy.backHome}</Link>
      </div>
    </section>
  );
};

export default MyReservations;
