import { useState, useEffect, useRef, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  QrCode, Scan, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, MapPin, Camera, CameraOff, Hash, RefreshCw,
  Shield, Calendar, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";
import DashboardCard from "@/admin/components/DashboardCard";
import { useLanguage } from "@/hooks/useLanguage";
import { fetchQrStats } from "@/api/admin";
import apiClient from "@/api/client";
import { verifyLibraryStudentQr } from "@/api/libraryStudentQrApi";


// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

const getStatusColor = (status) => ({
  pending:   { bg: "bg-amber-500/10",  text: "text-amber-500",  border: "border-amber-500/30"  },
  active:    { bg: "bg-[#2C2DE0]/10",  text: "text-[#2C2DE0]",  border: "border-[#2C2DE0]/30"  },
  completed: { bg: "bg-gray-500/10",   text: "text-gray-400",   border: "border-gray-500/30"   },
  cancelled: { bg: "bg-red-500/10",    text: "text-red-500",    border: "border-red-500/30"    },
  no_show:   { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" },
})[status] ?? { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" };

// ─── API calls ────────────────────────────────────────────────────────────────────────────
const lookupByQr  = (qrCode)        => apiClient.get(`/admin/reservations/lookup/qr/${qrCode}`);
const lookupById  = (reservationId) => apiClient.get(`/admin/reservations/lookup/id/${reservationId}`);
const adminCheckin  = (reservationId) => apiClient.post(`/admin/reservations/checkin/${reservationId}`);
const adminCheckout = (reservationId) => apiClient.post(`/admin/reservations/checkout/${reservationId}`);

const getActionReservation = (res) =>
  res?.data?.data?.reservation ?? res?.data?.reservation ?? res?.reservation ?? null;

// ─── Reservation Detail Card ──────────────────────────────────────────────────
const ReservationCard = ({ data, onCheckin, onCheckout, onReset, isActing }) => {
  const { reservation, warnings = [] } = data;
  const sc = getStatusColor(reservation.status);
  const now = new Date();
  const start = new Date(reservation.startTime);
  const end   = new Date(reservation.endTime);

  const minutesUntilStart = (start - now) / 60000;
  const minutesPastStart  = (now - start) / 60000;

  // ── Time window: only allow check-in between 15 min before and 15 min after start ──
  const tooEarly    = minutesUntilStart > 15;
  const tooLate     = minutesPastStart  > 15 && !reservation.checkedInAt;
  const sessionOver = now > end;

  const canCheckin  = ["pending", "active"].includes(reservation.status)
                      && !reservation.checkedInAt
                      && !sessionOver;

  // Admin CAN override the window but sees a warning (controlled by backend too)
  const withinWindow = !tooEarly && !tooLate;

  const canCheckout = ["pending", "active"].includes(reservation.status)
                      && !!reservation.checkedInAt;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl overflow-hidden"
    >
      {/* header strip — unchanged */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {reservation.status.replace("_", " ").toUpperCase()}
          </span>
          {reservation.checkedInAt && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0] border border-[#2C2DE0]/20">
              <CheckCircle2 size={11} /> CHECKED IN
            </span>
          )}
        </div>
        <button onClick={onReset} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* warnings from backend */}
      {warnings.length > 0 && (
        <div className="px-6 pt-4 space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex gap-2 items-start bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-5 space-y-5">
        {/* student row — unchanged */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#2C2DE0]/10 border border-[#2C2DE0]/20 flex items-center justify-center shrink-0">
            <User size={20} className="text-[#2C2DE0]" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">
              {reservation.user?.fullName || reservation.user?.name || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {reservation.user?.studentId || reservation.user?.email || "—"}
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/10" />

        {/* seat + time grid — unchanged */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Seat</p>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#2C2DE0]" />
              <p className="font-bold text-gray-900 dark:text-white text-sm">#{reservation.seat?.seatNumber}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {reservation.seat?.zone} · Floor {reservation.seat?.floor}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Time</p>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#2C2DE0]" />
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                {fmtTime(reservation.startTime)} – {fmtTime(reservation.endTime)}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(reservation.startTime)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Booking ID</p>
            <p className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
              #{String(reservation._id).slice(-8).toUpperCase()}
            </p>
          </div>
          {reservation.checkedInAt && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Checked In</p>
              <p className="font-bold text-[#2C2DE0] dark:text-[#2C2DE0] text-sm">
                {fmtTime(reservation.checkedInAt)}
              </p>
            </div>
          )}
        </div>

        {/* ── Time window status banner — shows clearly if too early/late ── */}
        {canCheckin && (
          <div className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            sessionOver
              ? "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-500"
              : tooEarly
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-black dark:text-blue-300"
              : tooLate
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-black dark:text-red-300"
              : " text-black dark:text-[#2C2DE0]"
          }`}>
            {sessionOver
              ? "Session has ended — cannot check in."
              : tooEarly
              ? `Too early — session starts in ${Math.round(minutesUntilStart)} min. Check-in opens 15 min before start.`
              : tooLate
              ? `${Math.round(minutesPastStart)} min late. Admin override allowed — student may be marked no-show.`
              : "Within check-in window."}
          </div>
        )}

        {/* actions */}
        <div className="flex gap-3 pt-1">
          {canCheckin && !sessionOver && (
            <button
              onClick={() => onCheckin(reservation._id)}
              disabled={isActing || tooEarly}
              title={tooEarly ? `Check-in opens at ${fmtTime(new Date(start - 15 * 60000))}` : ""}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                tooEarly
                  ? "bg-gray-400 cursor-not-allowed"
                  : withinWindow
                  ? "bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white"
                  : "bg-amber-500 hover:bg-amber-600"  // late override = amber
              }`}
            >
              {isActing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {tooEarly ? "Too Early" : withinWindow ? "Confirm Check-In" : "Override Check-In"}
            </button>
          )}
          {canCheckout && (
            <button
              onClick={() => onCheckout(reservation._id)}
              disabled={isActing}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-800 dark:bg-white/10 hover:bg-gray-900 dark:hover:bg-white/20 disabled:opacity-50 text-white py-3 text-sm font-bold transition-colors"
            >
              {isActing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Check Out
            </button>
          )}
          {!canCheckin && !canCheckout && (
            <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 py-3 text-sm font-medium">
              <Shield size={15} /> No action available
            </div>
          )}
        </div>
      </div>
    </Motion.div>
  );
};

// ─── Camera QR Scanner ────────────────────────────────────────────────────────
const CameraScanner = ({ onDetect, onClose, purpose, copy }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let active = true;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onerror = () => setError("QR scanner could not be loaded.");
    script.onload = () => {
      if (!active) return;
      try {
        const scanner = new window.Html5Qrcode("qr-reader-div");
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (!active) return;
            setScanning(false);
            void scanner.stop().catch((stopError) => {
              console.warn("QR scanner failed to stop after decoding.", stopError);
            });
            onDetect(decodedText);
          },
          () => {}
        ).catch((startError) => {
          console.error("QR scanner failed to start.", startError);
          setError("Could not start QR scanner.");
        });
      } catch {
        setError("QR scanner failed to initialize.");
      }
    };
    document.body.appendChild(script);

    return () => {
      active = false;
      if (scannerRef.current) {
        void scannerRef.current.stop().catch((stopError) => {
          console.warn("QR scanner failed to stop during cleanup.", stopError);
        });
      }
      document.body.removeChild(script);
    };
  }, [onDetect]);

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-[#2C2DE0]" />
          <span className="font-bold text-sm text-gray-900 dark:text-white">
            {purpose === "student" ? copy.studentIdentityMode : copy.seatReservationMode}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
        >
          <CameraOff size={14} /> Close
        </button>
      </div>

      <div className="p-4">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CameraOff size={32} className="text-gray-400" />
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 underline">
              Use manual entry instead
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* html5-qrcode renders into this div */}
            <div
              id="qr-reader-div"
              className="rounded-xl overflow-hidden"
              style={{ width: "100%" }}
            />
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-[#2C2DE0]/70 rounded-2xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-0.5 bg-[#2C2DE0]/60 animate-ping" />
              </div>
            )}
          </div>
        )}
        <p className="text-center text-xs text-gray-400 mt-3">
          {purpose === "student"
            ? copy.identityCameraHint
            : copy.reservationCameraHint}
        </p>
      </div>
    </Motion.div>
  );
};

const VerifiedStudentCard = ({ student, onReset, copy }) => {
  const department = typeof student.department === "string"
    ? student.department
    : student.department?.name || student.department?.departmentName || "—";
  const details = [
    [copy.identityStudentId, student.universityId],
    [copy.identityDepartment, department],
    [copy.identityRole, student.role],
    [copy.identitySemester, student.semester],
    [copy.identityRegistrationStatus, student.registrationStatus],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white/80 dark:bg-white/[0.04] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10">
        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
        <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">{copy.identityVerified}</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#2C2DE0]/10 flex items-center justify-center">
            <User size={22} className="text-[#2C2DE0]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">{student.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{student.universityId}</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-500 dark:text-gray-400">{copy.identityVerifiedHint}</p>
        <button type="button" onClick={onReset} className="w-full rounded-xl border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
          {copy.scanAnotherStudent}
        </button>
      </div>
    </Motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const QrCheckinPage = () => {
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const p = ap.pages.qrCheckin;

  const [mode, setMode] = useState("manual"); // "manual" | "camera"
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("qr"); // "qr" | "id"
  const [scanTarget, setScanTarget] = useState("reservation");
  const [result, setResult] = useState(null); // { reservation, warnings }
  const [actionResult, setActionResult] = useState(null); // { type, message }
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [identityError, setIdentityError] = useState(null);

 
const { data: statsRes, refetch: refetchStats } = useQuery({
  queryKey: ["admin-qr-stats"],
  queryFn: async () => {
    const res = await fetchQrStats();
    // Supports both flat and nested { stats } shapes from sendSuccess
    const body = res.data?.data ?? res.data ?? {};
    return body.stats ?? body;
  },
  refetchInterval: 15_000,
});

const stats = statsRes ?? { checkInsToday: 0, lastScan: null, recentScans: [] };
const copy = p;

  // ── LOOKUP ──
  const lookupMutation = useMutation({
    mutationFn: async (val) => {
      const trimmed = val.trim();
      const res = inputType === "qr"
        ? await lookupByQr(trimmed)
        : await lookupById(trimmed);
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setActionResult(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Reservation not found");
      setResult(null);
    },
  });

  const identityMutation = useMutation({
    onMutate: () => {
      setIdentityError(null);
      setVerifiedStudent(null);
    },
    mutationFn: async (value) => {
      const token = value.trim();
      if (!token) throw new Error("Enter or scan a student identity QR token.");
      const response = await verifyLibraryStudentQr(token);
      const body = response?.data?.data ?? response?.data;
      if (response?.data?.success === false || !body?.student) {
        throw new Error(body?.message || "Student QR could not be verified.");
      }
      return body.student;
    },
    onSuccess: (student) => {
      setVerifiedStudent(student);
      setIdentityError(null);
      setResult(null);
      toast.success(p.identityVerified);
    },
    onError: (err) => {
      const message = err.response?.data?.message || err.message || p.identityRejected;
      setVerifiedStudent(null);
      setIdentityError(message);
      toast.error(message);
    },
  });

  // ── CHECK-IN ──
  const checkinMutation = useMutation({
    mutationFn: adminCheckin,
    onSuccess: (res) => {
      const updatedReservation = getActionReservation(res);
      setActionResult({ type: "success", message: "Student checked in successfully." });
      setResult((prev) => prev
        ? {
            ...prev,
            reservation: {
              ...prev.reservation,
              ...updatedReservation,
              checkedInAt: updatedReservation?.checkedInAt ?? prev.reservation.checkedInAt ?? new Date().toISOString(),
              status: updatedReservation?.status ?? "active",
            },
          }
        : prev
      );
      refetchStats();
      toast.success("Checked in ✓");
    },
    onError: (err) => {
      setActionResult({ type: "error", message: err.response?.data?.message || "Check-in failed." });
      toast.error(err.response?.data?.message || "Check-in failed");
    },
  });

  // ── CHECK-OUT ──
  const checkoutMutation = useMutation({
    mutationFn: adminCheckout,
    onSuccess: (res) => {
      const updatedReservation = getActionReservation(res);
      setActionResult({ type: "success", message: "Student checked out." });
      setResult((prev) => prev
        ? {
            ...prev,
            reservation: {
              ...prev.reservation,
              ...updatedReservation,
              checkedOutAt: updatedReservation?.checkedOutAt ?? prev.reservation.checkedOutAt ?? new Date().toISOString(),
              status: updatedReservation?.status ?? "completed",
            },
          }
        : prev
      );
      refetchStats();
      toast.success("Checked out ✓");
    },
    onError: (err) => {
      setActionResult({ type: "error", message: err.response?.data?.message || "Checkout failed." });
    },
  });

  const isActing = checkinMutation.isPending || checkoutMutation.isPending;

  const identityMutate = identityMutation.mutate;
  const lookupMutate = lookupMutation.mutate;
  const handleScan = useCallback((value) => {
    setInputValue(value);
    setMode("manual");
    if (scanTarget === "student") identityMutate(value);
    else lookupMutate(value);
  }, [identityMutate, lookupMutate, scanTarget]);

  const handleReset = () => {
    setResult(null);
    setActionResult(null);
    setVerifiedStudent(null);
    setIdentityError(null);
    setInputValue("");
    lookupMutation.reset();
    identityMutation.reset();
  };

  return (
    <PageTransition>
      <PageHeader
        title={p.title}
        subtitle={scanTarget === "student" ? p.identitySubtitle : p.seatReservationSubtitle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          <div className="flex flex-wrap gap-2" role="group" aria-label={p.scanPurpose}>
            {[
              { key: "reservation", label: p.seatReservationMode },
              { key: "student", label: p.studentIdentityMode },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  handleReset();
                  setScanTarget(key);
                }}
                aria-pressed={scanTarget === key}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition-colors ${
                  scanTarget === key
                    ? "bg-[#2C2DE0] border-[#2C2DE0] text-white"
                    : "border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* mode toggle */}
          <div className="flex gap-2 p-1 rounded-xl bg-gray-100/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 w-fit">
            {[
              { key: "manual", label: p.manualEntry, icon: Hash },
              { key: "camera", label: p.cameraScan, icon: Camera },
            ].map((item) => {
              const ModeIcon = item.icon;
              return <button
                key={item.key}
                onClick={() => { setMode(item.key); handleReset(); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === item.key
                    ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <ModeIcon size={13} />
                {item.label}
              </button>;
            })}
          </div>

          <AnimatePresence mode="wait">

            {/* CAMERA MODE */}
            {mode === "camera" && !result && !verifiedStudent && (
              <CameraScanner
                key="camera"
                onDetect={handleScan}
                purpose={scanTarget}
                copy={p}
                onClose={() => setMode("manual")}
              />
            )}

            {/* MANUAL MODE */}
            {mode === "manual" && !result && !verifiedStudent && (
              <Motion.div
                key="manual"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl p-6 space-y-5"
              >
                {/* pulse icon */}
                <div className="flex flex-col items-center py-4">
                  <Motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-28 w-28 rounded-3xl border-2 border-dashed border-[#2C2DE0]/40 flex items-center justify-center bg-[#2C2DE0]/5"
                  >
                    <QrCode size={52} className="text-[#2C2DE0]" strokeWidth={1.25} />
                  </Motion.div>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                    {scanTarget === "student"
                      ? p.identityManualHint
                      : p.reservationManualHint}
                  </p>
                </div>

                {/* input type toggle */}
                {scanTarget === "reservation" && <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {p.lookupBy}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { key: "qr", label: p.reservationQrLabel },
                      { key: "id", label: p.reservationIdLabel },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setInputType(key)}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase transition-colors ${
                          inputType === key
                            ? "bg-[#2C2DE0] text-white"
                            : "border border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>}

                {/* input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {scanTarget === "student"
                      ? p.identityTokenLabel
                      : inputType === "qr" ? p.reservationQrLabel : p.reservationIdLabel}
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || !inputValue.trim()) return;
                      if (scanTarget === "student") identityMutation.mutate(inputValue);
                      else lookupMutation.mutate(inputValue);
                    }}
                    placeholder={scanTarget === "student"
                      ? p.identityTokenPlaceholder
                      : inputType === "qr" ? p.reservationQrPlaceholder : p.reservationIdPlaceholder}
                    className="w-full rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 font-mono"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  disabled={!inputValue.trim() || lookupMutation.isPending || identityMutation.isPending}
                  onClick={() => scanTarget === "student"
                    ? identityMutation.mutate(inputValue)
                    : lookupMutation.mutate(inputValue)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-50 py-3 text-sm font-bold text-white transition-colors"
                >
                  {lookupMutation.isPending || identityMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> {p.lookupLoading}</>
                    : <><Scan size={16} /> {scanTarget === "student" ? p.verifyStudentQr : p.lookupReservation}</>
                  }
                </button>
                {identityError && scanTarget === "student" && (
                  <div role="alert" className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {identityError}
                  </div>
                )}
              </Motion.div>
            )}

            {verifiedStudent && scanTarget === "student" && (
              <VerifiedStudentCard
                key="verified-student"
                student={verifiedStudent}
                onReset={handleReset}
                copy={copy}
              />
            )}
            {/* RESULT */}
            {result && (
              <div key="result" className="space-y-3">
                {actionResult && (
                  <Motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
                      actionResult.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {actionResult.type === "success"
                      ? <CheckCircle2 size={16} />
                      : <XCircle size={16} />
                    }
                    {actionResult.message}
                  </Motion.div>
                )}

                <ReservationCard
                  data={result}
                  onCheckin={(id) => checkinMutation.mutate(id)}
                  onCheckout={(id) => checkoutMutation.mutate(id)}
                  onReset={handleReset}
                  isActing={isActing}
                />
              </div>
            )}

          </AnimatePresence>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div className="space-y-4">
          <DashboardCard
            label={p.todayCheckins}
            value={String(stats.checkInsToday ?? 0)}
            icon={Scan}
          />
          <DashboardCard
            label={p.lastScan}
            value={stats.lastScan?.studentId || "—"}
            icon={QrCode}
          />

          {/* recent activity */}
          {stats.recentScans?.length > 0 && (
            <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                Recent Activity
              </p>
              <div className="space-y-3">
                {stats.recentScans.map((scan, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#2C2DE0]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} className="text-[#2C2DE0]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {scan.studentName || scan.studentId}
                      </p>
                      <p className="text-xs text-gray-400">
                        Seat {scan.seatNumber} · {fmtTime(scan.checkedInAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* guide */}
          <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5">
              <Shield size={12} className="text-[#2C2DE0]" /> Validation Rules
            </p>
            <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <li className="flex gap-2">
                <Clock size={12} className="mt-0.5 text-[#2C2DE0] shrink-0" />
                Check-in allowed 15 min before start
              </li>
              <li className="flex gap-2">
                <AlertTriangle size={12} className="mt-0.5 text-amber-500 shrink-0" />
                15+ min late = auto no-show risk
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={12} className="mt-0.5 text-[#2C2DE0] shrink-0" />
                Reservation must be pending or active
              </li>
              <li className="flex gap-2">
                <Calendar size={12} className="mt-0.5 text-[#2C2DE0] shrink-0" />
                Today's reservations only
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default QrCheckinPage;
