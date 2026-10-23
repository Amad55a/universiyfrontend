import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReservation, getSeatBookedSlots } from "@/api/reservation";
import { DateTime } from "luxon";
import {
  OPEN_HOUR,
  CLOSE_HOUR,
  formatHoursRange,
  SOMALIA_TIME_ZONE,
  toSomaliaDateTime,
} from "@/utils/time";
import { useLanguage } from "@/hooks/useLanguage";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  QrCode,
  LayoutList,
  Pencil,
  AlertTriangle,
  Clock,
  Armchair,
  ScanLine,
} from "lucide-react";
const PrimaryButton = ({ disabled, className = "", children, ...props }) => (
  <button
    disabled={disabled}
    className={`
      py-3.5 rounded-2xl font-bold text-sm transition-all duration-150
      ${disabled
        ? "bg-gray-100 dark:bg-gray-800/60 text-gray-400 cursor-not-allowed shadow-none"
        : "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none"
      }
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);

const ALL_SLOTS = (() => {
  const s = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    s.push(`${String(h).padStart(2, "0")}:00`);
    s.push(`${String(h).padStart(2, "0")}:30`);
  }
  return s;
})();

const parseSlot = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  return { hours: h, minutes: m };
};

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

const overlapsBooking = (start, end, booking, today) => {
  const { hours: sh, minutes: sm } = parseSlot(start);
  const { hours: eh, minutes: em } = parseSlot(end);
  const slotStart = today.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  const slotEnd = today.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
  const bookingStart = toSomaliaDateTime(booking.startTime).toMillis();
  const bookingEnd = toSomaliaDateTime(booking.endTime).toMillis();
  return slotStart.toMillis() < bookingEnd && slotEnd.toMillis() > bookingStart;
};

const fetchBookedSlots = async (seatId, date) => {
  return await getSeatBookedSlots(seatId, date);
};

const DURATION_OPTIONS = [
  { label: "30 min", value: 0.5 },
  { label: "1 hr", value: 1 },
  { label: "1.5 hr", value: 1.5 },
  { label: "2 hr", value: 2 },
];

const PolicySection = ({ t }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-900 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <ShieldCheck size={13} className="text-[#2C2DE0]" />
          {t.policyTitle}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 bg-white dark:bg-gray-950">
          {t.policies.map((p, i) => (
            <p key={i} className="text-xs text-gray-400 dark:text-gray-500 flex items-start gap-2">
              <span className="text-[#2C2DE0] mt-0.5 shrink-0">✔</span>
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ReservationModal({ seat, onClose, date: initialDate, initialStartTime, initialEndTime }) {
  const { t } = useLanguage();
  const copy = t.reservation;
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState(initialStartTime || null);
  const [selectedDate, setSelectedDate] = useState(initialDate || DateTime.now().setZone(SOMALIA_TIME_ZONE).toISODate());
  const initialStart = initialDate && initialStartTime
    ? DateTime.fromISO(initialDate, { zone: SOMALIA_TIME_ZONE })
      .set({ hour: Number(initialStartTime.slice(0, 2)), minute: Number(initialStartTime.slice(3)) })
    : null;
  const initialEnd = initialDate && initialEndTime
    ? DateTime.fromISO(initialDate, { zone: SOMALIA_TIME_ZONE })
      .set({ hour: Number(initialEndTime.slice(0, 2)), minute: Number(initialEndTime.slice(3)) })
    : null;
  const initialDuration = initialStart && initialEnd
    ? initialEnd.diff(initialStart, "minutes").minutes / 60
    : 1;
  const [duration, setDuration] = useState(initialDuration || 1);
  const [step, setStep] = useState("form");
  const [qrData, setQrData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const { data: bookedSlots = [], isLoading: slotsLoading, isError: slotsError } = useQuery({
    queryKey: ["seatSlots", seat._id, selectedDate],
    queryFn: () => fetchBookedSlots(seat._id, selectedDate),
    staleTime: 0,
  });

  const now = DateTime.now().setZone(SOMALIA_TIME_ZONE);
  const today = now.toISODate();
  const bookingOpen = selectedDate > today ||
    (selectedDate === today && now.hour >= OPEN_HOUR && now.hour < CLOSE_HOUR);

  // Error banners auto-dismiss after 5s instead of sitting there forever.
  useEffect(() => {
    if (!errorMsg) return;
    const id = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(id);
  }, [errorMsg]);

  const { mutate } = useMutation({
    mutationFn: createReservation,
    onMutate: () => {
      setErrorMsg(null);
      setStep("loading");
    },
    onSuccess: (res) => {
      const { qrCode, reservation } = res;
      setQrData({
        qrCode,
        shortId: reservation._id.slice(-8).toUpperCase(),
        reservationId: reservation._id,
      });
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["seats"] });
      queryClient.invalidateQueries({ queryKey: ["todayReservations"] });
      queryClient.invalidateQueries({ queryKey: ["seatSlots", seat._id] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
    },
    onError: (err) => {
      setStep("form");
      setErrorMsg(err.response?.data?.message || "Something went wrong");
    },
  });

  const endSlot = selectedSlot ? addDuration(selectedSlot, duration) : null;
  const slotStates = ALL_SLOTS.map((slot) => {
    const end = addDuration(slot, duration);
    if (!end) return { slot, state: "closed" };
    const { hours, minutes } = parseSlot(slot);
    const slotTime = DateTime.fromISO(selectedDate, { zone: SOMALIA_TIME_ZONE })
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    if (selectedDate === today && slotTime.toMillis() <= now.toMillis()) return { slot, state: "past" };
    const taken = bookedSlots.some((b) => overlapsBooking(slot, end, b, slotTime));
    return { slot, state: taken ? "taken" : "free" };
  });
  const selectedSlotIsFree = slotStates.some(({ slot, state }) => slot === selectedSlot && state === "free");

  const handleConfirm = () => {
    if (!selectedSlot || !endSlot || !selectedSlotIsFree) return;
    mutate({
      seatId: seat._id,
      date: selectedDate,
      startTime: selectedSlot,
      endTime: endSlot,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-950 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl  dark:bg-[#2C2DE0]/10 flex items-center justify-center">
                <Armchair size={17} className="text-[#2C2DE0] dark:text-[#2C2DE0]" />
              </div>
              <div>
                <p className="font-black text-gray-900 dark:text-white text-sm leading-tight">
                  {copy.title ?? "Book a Seat"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {copy.seat ?? "Seat"} {seat.seatNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-6">

          {step === "loading" && (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="w-12 h-12 border-[3px] border-gray-100 dark:border-gray-800 border-t-[#2C2DE0] rounded-full animate-spin" />
              <p className="mt-5 font-bold text-gray-800 dark:text-gray-100 text-sm">
                {copy.confirming ?? "Confirming your reservation…"}
              </p>
            </div>
          )}

          {step === "success" && qrData && (
            <div className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl  dark:bg-[#2C2DE0]/10 flex items-center justify-center mb-4 shadow-sm shadow-[#2C2DE0] dark:shadow-none">
                  <CheckCircle2 size={30} className="text-[#2C2DE0]" />
                </div>
                <p className="font-black text-xl text-gray-900 dark:text-white">
                  {copy.reservedSuccess ?? "Seat reserved!"}
                </p>
                <p className="text-sm text-gray-400 mt-1.5">
                  {copy.seat ?? "Seat"} {seat.seatNumber} ·{" "}
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {formatSlot(selectedSlot)} – {formatSlot(endSlot)}
                  </span>
                </p>
              </div>

              {/* ── Beautified QR card ── gradient frame, corner ticks,
                  soft glow, and a "scan at entrance" badge instead of
                  the old flat white box. */}
              <div className="relative bg-gradient-to-b from-[#2C2DE0] via-white to-white dark:from-[#2C2DE0]/10 dark:via-gray-950 dark:to-gray-950 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 rounded-3xl p-6 flex flex-col items-center gap-4 overflow-hidden">
                {/* ambient glow */}
                <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-[#2C2DE0]/30 dark:bg-[#2C2DE0]/10 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 bg-[#2C2DE0]/20 dark:bg-[#2C2DE0]/10 rounded-full blur-3xl" />

                <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2C2DE0] text-white text-[10px] font-black uppercase tracking-widest shadow-sm shadow-[#2C2DE0] dark:shadow-none">
                  <ScanLine size={11} /> {copy.scanAtEntrance ?? "Scan at entrance"}
                </span>

                <div className="relative z-10 rounded-2xl p-[3px] bg-gradient-to-br from-[#2C2DE0] via-[#2C2DE0] to-[#2C2DE0] shadow-lg shadow-[#2C2DE0]/70 dark:shadow-[#2C2DE0]/30">
                  <div className="rounded-[14px] overflow-hidden bg-white p-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${qrData.qrCode}&size=172x172&ecc=M&color=111111&bgcolor=ffffff&margin=6`}
                      width={172}
                      height={172}
                      alt="QR code"
                      className="block rounded-lg"
                    />
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 bg-white/90 dark:bg-gray-900/80 backdrop-blur border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 w-full justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {copy.reservationId ?? "Reservation ID"}
                  </span>
                  <span className="font-mono font-black text-sm tracking-wider text-gray-900 dark:text-white">
                    #{qrData.shortId}
                  </span>
                </div>

              </div>

              <ul className="mt-5 space-y-3">
                <li className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LayoutList size={12} className="text-[#2C2DE0] dark:text-[#2C2DE0]" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {copy.manageInMyReservations ?? "Manage this booking any time from My Reservations."}
                  </p>
                </li>
                <li className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Pencil size={12} className="text-[#2C2DE0] dark:text-[#2C2DE0]" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {copy.cancelOrReschedule ?? "You can cancel or reschedule before check-in."}
                  </p>
                </li>
                <li className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={12} className="text-amber-500" />
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                    {copy.lateWarning ?? "Arrive within 15 minutes of your start time or the seat may be released."}
                  </p>
                </li>
              </ul>

              <PrimaryButton onClick={onClose} className="w-full mt-6">
                {copy.done ?? "Done"}
              </PrimaryButton>
            </div>
          )}

          {step === "form" && (
            <div className="pt-5 space-y-5">

              <label className="block space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {t.common.date ?? "Reservation date"}
                </span>
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    setSelectedDate(event.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>

              {!bookingOpen && (
                <div className="flex gap-2.5 items-start bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3">
                  <Clock size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {copy.bookingClosed ?? `Library reservation is available only from ${formatHoursRange()}.`}
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="flex gap-2.5 items-start bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl px-4 py-3">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
                  {copy.duration ?? "Duration"}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setDuration(opt.value); setSelectedSlot(null); }}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all duration-150 ${duration === opt.value
                        ? "bg-[#2C2DE0] border-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none"
                        : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {copy.selectTime ?? "Select Time"}
                  </p>
                  <div className="flex items-center gap-3 text-[9px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-[#2C2DE0] dark:bg-[#2C2DE0]/60 border border-[#2C2DE0] dark:border-[#2C2DE0]" />
                      {copy.free ?? "Free"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700" />
                      {copy.taken ?? "Taken"}
                    </span>
                  </div>
                </div>

                {slotsError && (
                  <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    Availability could not be loaded. Retry before reserving.
                  </p>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {slotStates.map(({ slot, state }) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        disabled={state !== "free"}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${isSelected
                          ? "bg-[#2C2DE0] text-white ring-2 ring-[#2C2DE0] dark:ring-[#2C2DE0] shadow-sm"
                          : state === "free"
                            ? "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 border border-[#2C2DE0]/20 dark:border-[#2C2DE0]/30 text-[#2C2DE0] hover:bg-[#2C2DE0]/20"
                            : state === "taken"
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed line-through"
                              : "bg-white dark:bg-gray-900 text-gray-200 dark:text-gray-700 cursor-not-allowed opacity-50"
                          }`}
                      >
                        {formatSlot(slot)}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Clock size={10} /> {copy.hours ?? formatHoursRange()}
                </p>
              </div>

              {selectedSlot && endSlot && (
                <div className="bg-[#2C2DE0]/8 dark:bg-[#2C2DE0]/10 border border-[#2C2DE0]/30 dark:border-[#2C2DE0]/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#2C2DE0]/70 dark:text-[#2C2DE0]/60 font-semibold mb-0.5">
                      {copy.yourSession ?? "Your session"}
                    </p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {formatSlot(selectedSlot)}{" "}
                      <span className="text-gray-400 font-normal">→</span>{" "}
                      {formatSlot(endSlot)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#2C2DE0]/70 dark:text-[#2C2DE0]/60 font-semibold mb-0.5">
                      {copy.seat ?? "Seat"}
                    </p>
                    <p className="text-sm font-black text-[#2C2DE0] dark:text-[#6366f1]">
                      #{seat.seatNumber}
                    </p>
                  </div>
                </div>
              )}

              <PolicySection t={copy} />

              <PrimaryButton
                onClick={handleConfirm}
                disabled={!selectedSlot || !endSlot || !selectedSlotIsFree || !bookingOpen || slotsLoading || slotsError}
                className="w-full"
              >
                {copy.confirm ?? "Confirm reservation"}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}