import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { createElement, useMemo } from "react";
import { Armchair, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Info, Loader2, ShieldCheck } from "lucide-react";
import useLanguage from "@/hooks/useLanguage";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getReservationMeta } from "@/api/reservation";
import { useServerClock } from "@/hooks/Usesomaliaclock";
import { issueLibraryStudentQr } from "@/api/libraryStudentQrApi";

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
const fetchMyQr = async () => {
  const res = await axios.get("/api/checkin/my-qr");
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const STATUS_CONFIG = {
  pending: {
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20",
    dot: "bg-yellow-400 animate-pulse",
    iconEn: "Waiting for check-in",
    iconSo: "Sugaysa galitaanka",
  },
  active: {
    color: "text-[#2C2DE0] dark:text-[#2C2DE0]",
    bg: "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border-[#2C2DE0] dark:border-[#2C2DE0]/20",
    dot: "bg-[#2C2DE0] animate-pulse",
    iconEn: "You are checked in",
    iconSo: "Waxaad gashay",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Countdown to start time — uses server-corrected now so a bad device clock
// does not make the countdown run too fast or too slow.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// QR Image — uses free API to render the token as a QR image
// ─────────────────────────────────────────────────────────────────────────────
const QrImage = ({ token, size = 200, alt = "Reservation QR Code" }) => {
  return (
    <div
      role="img"
      aria-label={alt}
      className="rounded-2xl border-2 border-gray-100 bg-white p-2 shadow-lg dark:border-gray-800"
    >
      <QRCodeSVG value={token} size={size} level="M" marginSize={2} />
    </div>
  );
};

const StudentIdentityQrCard = ({ isSo }) => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["libraryStudentIdentityQr"],
    queryFn: async () => {
      const response = await issueLibraryStudentQr();
      const body = response?.data?.data ?? response?.data;
      if (response?.data?.success === false || !body?.token) {
        throw new Error(body?.message || "Student identity QR is unavailable.");
      }
      return body;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: false,
  });
  const expiresAt = data?.expiresAt ? new Date(data.expiresAt) : null;
  const expiryLabel = expiresAt && !Number.isNaN(expiresAt.getTime())
    ? expiresAt.toLocaleTimeString(isSo ? "so-SO" : "en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="mb-5 overflow-hidden rounded-3xl border border-[#2C2DE0]/20 bg-white dark:bg-gray-950 shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#2C2DE0]/10 bg-[#2C2DE0]/5 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#2C2DE0]/10 text-[#2C2DE0]">
          <ShieldCheck size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-gray-900 dark:text-white">
            {isSo ? "QR Aqoonsiga Ardayga" : "Student Identity QR"}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {isSo
              ? "Aqoonsiga maktabadda; wuu dhacayaa, kana duwan QR-ka kursiga."
              : "For library identity verification. Expires soon and is separate from your seat reservation QR."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={isSo ? "Cusboonaysii QR-ka aqoonsiga" : "Refresh student identity QR"}
          className="flex size-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex flex-col items-center px-5 py-5 text-center">
        {isLoading ? (
          <Loader2 className="my-12 size-7 animate-spin text-[#2C2DE0]" />
        ) : error ? (
          <div className="py-5">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {isSo
                ? "QR-ka aqoonsiga hadda lama heli karo. Mar kale isku day."
                : "Student identity QR is unavailable. Please try again."}
            </p>
            <button type="button" onClick={() => refetch()} className="mt-3 rounded-xl bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white">
              {isSo ? "Mar kale isku day" : "Try again"}
            </button>
          </div>
        ) : data?.token ? (
          <>
            <QrImage token={data.token} size={180} alt={isSo ? "QR aqoonsiga ardayga" : "Student identity QR code"} />
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {isSo ? "Tus koodhkan maktabadda." : "Present this code to a librarian."}
            </p>
            {expiryLabel && (
              <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {isSo ? `Wuxuu dhacayaa ${expiryLabel}` : `Expires at ${expiryLabel}`}
              </p>
            )}
          </>
        ) : (
          <p role="alert" className="py-6 text-sm text-red-600 dark:text-red-400">
            {isSo ? "Jawaabta server-ku ma lahayn QR aqoonsi sax ah." : "The server did not return a valid identity QR."}
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const MyQrCode = () => {
  const { language } = useLanguage();
  const isSo = language === "so";

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["myQr"],
    queryFn: fetchMyQr,
    staleTime: 30_000,
    retry: false,
  });

  const { data: reservationMeta } = useQuery({
    queryKey: ["reservationMeta"],
    queryFn: getReservationMeta,
    staleTime: 30_000,
  });
  const now = useServerClock(reservationMeta?.serverTime);

  const countdown = useMemo(() => {
    const target = data?.reservation?.startTime;
    if (!target || !now) return null;
    const diff = new Date(target).getTime() - now.getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  }, [data?.reservation?.startTime, now]);

  // ── No reservation ────────────────────────────────────────────────────────
  if (!isLoading && error?.response?.status === 404) {
    return (
      <div className="max-w-md mx-auto mt-10 px-6 pb-16">
        <StudentIdentityQrCard isSo={isSo} />
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
            <Armchair size={24} className="text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-base font-black text-gray-900 dark:text-white mb-1">
            {isSo ? "Ma lihid reservation hadda" : "No active reservation"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {isSo
              ? "Marka aad kursi qabsato, QR-ka kursiga wuxuu halkan ka soo muuqanayaa."
              : "Once you reserve a seat, your seat-reservation QR will appear here."}
          </p>
          <Link
            to="/seats"
            className="inline-flex items-center gap-2 bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-[#2C2DE0] dark:shadow-none"
          >
            {isSo ? "Qabso Kursi" : "Reserve a Seat"}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6 space-y-4">
        <StudentIdentityQrCard isSo={isSo} />
        <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-3xl animate-pulse" />
        <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto mt-10 px-6 pb-16">
        <StudentIdentityQrCard isSo={isSo} />
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {isSo ? "QR-ka kursiga hadda lama heli karo." : "Your seat-reservation QR is unavailable."}
        </div>
      </div>
    );
  }

  const { qrCode, reservation } = data;
  const statusConf = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
  const isActive = reservation.status === "active";
  const isPending = reservation.status === "pending";

  return (
    <section className="max-w-md mx-auto mt-10 px-6 pb-16">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            {isSo ? "QR-ka Kursiga" : "Seat Reservation QR"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isSo ? "Koodhkan wuxuu xaqiijiyaa boos qabsashada kursiga." : "This code is for your seat reservation and check-in only."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2C2DE0] hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/10 transition-all"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      <StudentIdentityQrCard isSo={isSo} />

      {/* Main QR card */}
      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">

        {/* Status banner */}
        <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${statusConf.bg}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConf.dot}`} />
          <p className={`text-xs font-bold ${statusConf.color}`}>
            {isSo ? statusConf.iconSo : statusConf.iconEn}
          </p>
        </div>

        {/* QR code */}
        <div className="flex flex-col items-center px-6 py-8 gap-4">
          {isActive ? (
            // Active — green border glow
            <div className="rounded-2xl p-1 bg-gradient-to-br from-[#2C2DE0] to-[#2C2DE0] shadow-lg shadow-[#2C2DE0] dark:shadow-[#2C2DE0]/30">
              <QrImage token={qrCode} size={200} />
            </div>
          ) : (
            <QrImage token={qrCode} size={200} />
          )}

          {/* Reservation info */}
          <div className="w-full space-y-2.5 mt-2">
            <InfoRow
              icon={Armchair}
              label={isSo ? "Kursi" : "Seat"}
              value={`Seat ${reservation.seat?.seatNumber}`}
            />
            <InfoRow
              icon={Clock}
              label={isSo ? "Waqtiga" : "Time"}
              value={`${fmt(reservation.startTime)} – ${fmt(reservation.endTime)}`}
            />
            {reservation.checkedInAt && (
              <InfoRow
                icon={CheckCircle2}
                label={isSo ? "La galay" : "Checked in"}
                value={fmt(reservation.checkedInAt)}
                green
              />
            )}
          </div>
        </div>

        {/* Countdown — show only for pending */}
        {isPending && countdown && (
          <div className="mx-5 mb-5 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20 rounded-2xl px-4 py-3.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-1">
              {isSo ? "Waqtiga bilaabmayaasha" : "Starts in"}
            </p>
            <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300 tabular-nums">
              {countdown}
            </p>
          </div>
        )}

        {/* Active — session info */}
        {isActive && (
          <div className="mx-5 mb-5 bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 rounded-2xl px-4 py-3.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0] dark:text-[#2C2DE0] mb-0.5">
              {isSo ? "Xilligaagu wuu socdaa" : "Session active"}
            </p>
            <p className="text-sm font-bold text-[#2C2DE0] dark:text-[#2C2DE0]">
              {isSo ? "Ka bax marka aad dhameyso" : "Leave when you're done"}
            </p>
          </div>
        )}
      </div>

      {/* Rules box */}
      <div className="mt-4 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {isSo ? "Xeerarka galitaanka" : "Check-in rules"}
            </p>
            {[
              isSo
                ? "Soo gal 15 daqiiqo gudahood waqtiga bilowga ama reservationku si otomaatig ah ayuu u baajiyaa."
                : "Arrive within 15 minutes of your start time or your reservation is auto-cancelled.",
              isSo
                ? "Tus QR-kaaga ama ID-gaaga marka aad gashayso."
                : "Show your QR code or student ID at the entrance.",
              isSo
                ? "Ha qaadanin waqti ka badan waxaad reserved yeelatay."
                : "Do not stay longer than your reserved time.",
            ].map((rule, i) => (
              <p key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start gap-1.5">
                <span className="text-[#2C2DE0] font-black flex-shrink-0 mt-0.5">·</span>
                {rule}
              </p>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
};

const InfoRow = ({ icon: Icon, label, value, green }) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
      {createElement(Icon, {
        size: 13,
        className: green ? "text-[#2C2DE0]" : "text-gray-400",
        strokeWidth: 1.5,
      })}
    </div>
    <div className="flex-1 flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${green ? "text-[#2C2DE0] dark:text-[#2C2DE0]" : "text-gray-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  </div>
);

export default MyQrCode;
