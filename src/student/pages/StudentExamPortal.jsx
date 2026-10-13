import React, { useState, useRef, useEffect } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Lock, Clock, ShieldCheck, Download, Loader2 } from "lucide-react";
import { openExamGuard } from "./examguardProtocol";

import "../../styles/examtheme.css";

const PRIMARY_BTN =
  "bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] " +
  "hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] " +
  "active:translate-y-1 active:shadow-none transition-all duration-150";

// Sound played once, right when the exam token successfully verifies.
// Drop the actual file at: frontend/public/sounds/cod.mp3
// (anything under /public is served at that same path, e.g.
// http://localhost:3000/sounds/cod.mp3 — no import needed).
const TOKEN_VERIFIED_SOUND_URL = "cod.mp3";

// Is THIS tab currently running inside Safe Exam Browser? Used once the
// student is already inside SEB (e.g. after the deep-link hand-off, SEB
// opens this same page) — this check lets us skip straight to the normal
// exam start instead of showing the "Start Secure Exam" launcher again.
function isInSafeExamBrowser() {
  const ua = navigator.userAgent || "";
  return /SEB[/\s]/i.test(ua) || typeof window.SafeExamBrowser !== "undefined";
}

// Converts our https(s) config URL into SEB's own deep-link scheme.
// Opening this link is what actually launches Safe Exam Browser — if SEB is
// installed, the OS hands the link to it; if not, nothing happens (no
// crash, no error page), which is exactly the signal we use below.
function toSebDeepLink(httpUrl) {
  if (httpUrl.startsWith("https://")) return "sebs://" + httpUrl.slice("https://".length);
  if (httpUrl.startsWith("http://")) return "seb://" + httpUrl.slice("http://".length);
  return httpUrl;
}

// How long we wait to see whether the OS handed off to SEB before we
// conclude "doesn't look installed" and switch the messaging accordingly.
const LAUNCH_DETECT_MS = 2200;

export default function StudentExamPortal() {
  const [tokenInput, setTokenInput] = useState(() => {
    const tokenParam = new URLSearchParams(window.location.search).get("token");
    return tokenParam ? tokenParam.trim().toUpperCase() : "";
  });
  const [examData, setExamData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [launchTicket, setLaunchTicket] = useState(null);
  const [launchTicketMessage, setLaunchTicketMessage] = useState("");

  // idle -> launching -> ("handed-off" tab loses focus, we just wait) | "not-detected"
  const [launchState, setLaunchState] = useState("idle");

  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const launchTimerRef = useRef(null);
  const ticketTimerRef = useRef(null);

  // Guards against the sound firing more than once per verified token —
  // e.g. if the component re-renders or the user backs out and re-enters.
  const hasPlayedSoundRef = useRef(false);

  useEffect(() => () => {
    clearTimeout(launchTimerRef.current);
    clearTimeout(ticketTimerRef.current);
  }, []);

  const playTokenVerifiedSound = () => {
    if (hasPlayedSoundRef.current || !inSeb) return;
    hasPlayedSoundRef.current = true;
    try {
      const audio = new Audio(TOKEN_VERIFIED_SOUND_URL);
      // Some browsers reject autoplay-with-sound outside a user gesture —
      // but this always runs inside handleValidate's submit handler, which
      // is itself a click/gesture, so this should play reliably. Swallow
      // any rejection anyway so a blocked sound never breaks the flow.
      audio.play().catch(() => { });
    } catch {
      // no-op — a missing/broken audio file should never block the exam flow
    }
  };

  const inSeb = isInSafeExamBrowser();
  const sebRequired = !!examData?.security?.sebRequired;

  // Auto-validate + auto-start when SEB opens the portal with ?token=...&autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const auto = params.get("autostart");
    if (!tokenParam) return;

    // If autostart requested, we're inside SEB, and the user is authenticated,
    // validate the token and immediately start the session.
    const tryAutoStart = async () => {
      try {
        setIsValidating(true);
        const { data } = await api.post("/exams/student/validate-token", { token: tokenParam });
        const examInfo = { ...data.data, token: tokenParam.trim().toUpperCase() };
        setExamData(examInfo);
        if (examInfo.security?.sebRequired || inSeb) {
          playTokenVerifiedSound();
        }

        if (auto === "1") {
          setIsStarting(true);
          const startRes = await api.get(`/exams/student/${examInfo.examId}/start`);
          navigate(`/exam-session/${startRes.data.data.exam._id}`, { state: { examSession: startRes.data.data } });
        }
      } catch (err) {
        // If SEB header was missing, backend returns 428 — show friendly launcher.
        if (err.response?.status === 428) {
          setExamData({ security: { sebRequired: true }, token: tokenParam.trim().toUpperCase(), title: null });
        }
      }
    };

    // Wait until auth check completes — user must be logged in inside SEB.
    if (!authLoading && user) {
      tryAutoStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleValidate = async e => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    clearTimeout(ticketTimerRef.current);
    setLaunchTicket(null);
    setLaunchTicketMessage("");

    setIsValidating(true);
    try {
      const { data } = await api.post("/exams/student/validate-token", { token: tokenInput });
      const validatedExam = { ...data.data, token: tokenInput.trim().toUpperCase() };
      setExamData(validatedExam);
      toast.success(t("exam.verifyToken") || "Token verified!");
      if (validatedExam.security?.sebRequired || inSeb) {
        playTokenVerifiedSound();
      }
    } catch (err) {
      if (err.response?.status === 428) {
        // Backend refused because this request itself didn't come from SEB —
        // can happen if sebRequired and the student pasted the token
        // straight into Chrome. Give them the same friendly launcher instead
        // of a raw error.
        setExamData({ security: { sebRequired: true }, token: tokenInput.trim().toUpperCase(), title: null });
      } else {
        toast.error(err.response?.data?.message || t("exam.invalidToken") || "Invalid token");
        setExamData(null);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartExam = async () => {
    if (!examData) return;
    setIsStarting(true);
    try {
      const { data } = await api.get(`/exams/student/${examData.examId}/start`);
      navigate(`/exam-session/${data.data.exam._id}`, { state: { examSession: data.data } });
    } catch (err) {
      if (err.response?.status === 428) {
        toast.error("Please continue this exam from inside Safe Exam Browser.");
      } else {
        toast.error(err.response?.data?.message || "Failed to start exam");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleCreateExamGuardTicket = async () => {
    if (!examData?.examId || sebRequired) return;
    clearTimeout(ticketTimerRef.current);
    setLaunchTicket(null);
    setLaunchTicketMessage("");

    try {
      const { data } = await api.post(
        `/exams/student/${examData.examId}/launch-ticket`,
        {},
        { withCredentials: true }
      );
      const issued = data?.data;
      const expiresAt = Date.parse(issued?.expiresAt);
      if (
        typeof issued?.ticket !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(issued.ticket) ||
        !Number.isFinite(expiresAt)
      ) {
        throw new Error("UniCORE returned an invalid launch ticket.");
      }

      setLaunchTicket({ value: issued.ticket, expiresAt });
      setLaunchTicketMessage("We sent a launch link to your system, but cannot confirm whether ExamGuard opened. The one-time ticket below is your manual fallback.");
      try {
        openExamGuard(issued.ticket);
      } catch {
        setLaunchTicketMessage("Automatic launch was blocked. Copy this one-time ticket and enter it in ExamGuard manually.");
      }
      ticketTimerRef.current = setTimeout(() => {
        setLaunchTicket(null);
        setLaunchTicketMessage("The launch ticket expired. Request a new one if needed.");
      }, Math.max(0, expiresAt - Date.now()));
    } catch (err) {
      setLaunchTicketMessage(
        err.response?.data?.message || err.message || "Could not create a launch ticket."
      );
    }
  };

  const handleCopyExamGuardTicket = async () => {
    if (!launchTicket || launchTicket.expiresAt <= Date.now()) {
      setLaunchTicket(null);
      setLaunchTicketMessage("The launch ticket expired. Request a new one if needed.");
      return;
    }
    try {
      await navigator.clipboard.writeText(launchTicket.value);
      setLaunchTicketMessage("Ticket copied. Paste it into ExamGuard and choose Verify Invitation before it expires.");
    } catch {
      setLaunchTicketMessage("Copy was unavailable. Select and copy the ticket manually.");
    }
  };

  // ─── "Start Secure Exam" ───────────────────────────────────────────────────
  // 1. Build the sebs:// deep link pointing at our public launch-config route.
  // 2. Navigate to it. If SEB is installed, the OS switches focus to it —
  //    we detect that via the window "blur" event and simply stop, since
  //    the student's next steps happen inside SEB, not this tab.
  // 3. If we never see a blur within LAUNCH_DETECT_MS, SEB likely isn't
  //    installed on this machine — the install link (already visible below,
  //    see render) is how they recover.
  const handleStartSecureExam = async () => {
    if (!examData?.examId) return;
    setLaunchState("launching");

    try {
      let absoluteApiBase = window.API_BASE_URL || "/api/v1";
      if (absoluteApiBase.startsWith("/")) {
        absoluteApiBase = window.location.origin + absoluteApiBase;
      }

      const { data } = await api.post(`/exams/student/${examData.examId}/launch-token`);
      const launchToken = data.data.launchToken;
      if (!launchToken) {
        throw new Error("Launch token missing from server response");
      }

      const configUrl = `${absoluteApiBase}/exams/student/seb-launch?launchToken=${encodeURIComponent(launchToken)}`;
      const deepLink = toSebDeepLink(configUrl);

      let handedOff = false;
      const onBlur = () => { handedOff = true; };
      window.addEventListener("blur", onBlur);

      const link = document.createElement("a");
      link.href = deepLink;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      clearTimeout(launchTimerRef.current);
      launchTimerRef.current = setTimeout(() => {
        window.removeEventListener("blur", onBlur);
        // If the browser still has focus after 2.2 seconds, SEB definitely did not launch 
        // (because SEB is a fullscreen kiosk app that forcefully steals focus).
        if (document.hasFocus()) {
          setLaunchState("not-detected");
        } else {
          setLaunchState(handedOff ? "handed-off" : "not-detected");
        }
      }, LAUNCH_DETECT_MS);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to launch Safe Exam Browser");
      setLaunchState("idle");
    }
  };

  return (
    <div className="exam-root min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 p-8">
        <div className="w-12 h-12 bg-[#2C2DE0]/10 rounded-xl flex items-center justify-center mb-6 text-[#1E1FAA] dark:text-[#2C2DE0]">
          <Lock className="w-6 h-6" />
        </div>

        <h1 className="font-display text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          {t("exam.title") || "University Exam Portal"}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
          {t("exam.portalDescription") || "Enter your exam token to begin your secure session. The session is monitored and recorded for academic integrity."}
        </p>

        {!examData ? (
          <form onSubmit={handleValidate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t("exam.enterToken") || "Exam token"}
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="w-full border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg p-3 text-lg tracking-wider font-mono uppercase focus:ring-[#2C2DE0] focus:border-[#2C2DE0]"
                placeholder="CS101-MID"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isValidating || !tokenInput}
              className={`
    bg-[#2C2DE0] 
    text-white 
    text-sm 
    font-bold 
    px-6
    w-full 
    py-3 
    rounded-lg
    shadow-[0_4px_0_#1E1FAA] 
    hover:translate-y-0.5 
    hover:shadow-[0_2px_0_#1E1FAA] 
    active:translate-y-1 
    active:shadow-none 
    transition-all 
    duration-150 
    group
    disabled:opacity-50
    disabled:cursor-not-allowed
  `}
            >
              {isValidating ? (t("exam.verifying") || "Verifying…") : (t("exam.verifyToken") || "Verify token")}
            </button>
          </form>
        ) : sebRequired && !inSeb ? (
          // ── Secure-exam launcher: this is the ENTIRE experience a student
          // sees for an SEB-required exam. Both possible next steps —
          // "I already have it" and "I need to install it" — are shown
          // together immediately, rather than making the student try the
          // button first and only revealing the install link on failure.
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#2C2DE0]/10 rounded-xl p-5 border border-[#2C2DE0]/20">
              <h3 className="font-display font-semibold text-lg text-[#2f6b01] dark:text-[#8fe040] mb-2">
                {examData.title || "Secure Exam"}
              </h3>
              <div className="flex items-center gap-3 text-[#2f6b01] dark:text-[#8fe040]">
                <ShieldCheck className="w-5 h-5 opacity-70" />
                <span className="font-medium" aria-label="This exam uses Safe Exam Browser">This exam uses Safe Exam Browser and the UniCORE Exam App</span>
              </div>
            </div>

            {launchState === "launching" ? (
              <button disabled className={`bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening UniCORE Exam App…
              </button>
            ) : launchState === "handed-off" ? (
              <div className="text-sm text-[#2f6b01] dark:text-[#8fe040] bg-[#2C2DE0]/10 p-4 rounded-lg border border-[#2C2DE0]/20 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                The UniCORE Exam App is opening your exam now. You can close this tab.
              </div>
            ) : (
              <>
                {launchState === "not-detected" && (
                  <div className="text-sm text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    We couldn't detect the UniCORE Exam App. Install it below, then press "Open UniCORE Exam App" again.
                  </div>
                )}

                {/* Already installed */}
                <button
                  onClick={handleStartSecureExam}
                  aria-label="Start Secure Exam"
                  className="flex items-center justify-center w-full gap-2 px-5 py-2.5 bg-[#2C2DE0] text-white text-sm font-bold rounded-lg shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Open ExamGuard
                </button>

                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                </div>

                {/* Not installed yet — always visible, not gated behind a failed attempt */}
                <a
                  href="/desktop-exam-app"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Don't have it? Download UniCORE Desktop Exam App
                </a>
              </>
            )}

            <button
              onClick={() => { setExamData(null); setLaunchState("idle"); hasPlayedSoundRef.current = false; }}
              className="w-full text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-sm font-medium"
            >
              {t("exam.cancelGoBack") || "Cancel and go back"}
            </button>
          </div>
        ) : (
          // ── Normal path: no SEB required, or we're already running inside it ──
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#2C2DE0]/10 rounded-xl p-5 border border-[#2C2DE0]/20">
              <h3 className="font-display font-semibold text-lg text-[#2f6b01] dark:text-[#8fe040] mb-4">
                {examData.title}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[#2f6b01] dark:text-[#8fe040]">
                  <Clock className="w-5 h-5 opacity-70" />
                  <span className="font-medium">{examData.duration} {t("exam.duration") || "minutes"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#2f6b01] dark:text-[#8fe040]">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#2C2DE0]/25 text-xs font-bold">
                    {examData.questionsCount}
                  </div>
                  <span className="font-medium">{examData.questionsCount} {t("exam.questions") || "questions"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#2f6b01] dark:text-[#8fe040]">
                  <ShieldCheck className="w-5 h-5 opacity-70" />
                  <span className="font-medium">{t("exam.secureSession") || "Secure session (Chrome)"}</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
              <div className="font-semibold mb-2">{t("exam.securityWarningTitle") || "Exam security notice"}</div>
              <p className="text-xs leading-relaxed">
                {t("exam.fullscreenWarning") ||
                  "This secure exam is monitored. Keep it fullscreen and avoid switching tabs, minimizing, or closing it. Exiting more than 3 times or leaving fullscreen may be logged and could auto-submit your exam."}
              </p>
            </div>

            <button
              onClick={handleStartExam}
              disabled={isStarting}
              className={`
    bg-[#2C2DE0] w-full
    text-white 
    text-sm 
    font-bold 
    px-8 
    py-3 
    rounded-lg
    flex 
    items-center 
    justify-center 
    gap-2
    shadow-[0_4px_0_#1E1FAA] 
    hover:translate-y-0.5 
    hover:shadow-[0_2px_0_#1E1FAA] 
    active:translate-y-1 
    active:shadow-none 
    transition-all 
    duration-150 
    group
    disabled:opacity-50
    disabled:cursor-not-allowed
  `}
            >
              {isStarting
                ? (t("exam.preparingSession") || "Preparing session…")
                : (t("exam.startTitle") || "Start your exam")}

              {!isStarting && <ArrowRight className="w-4 h-4" />}
            </button>

            {!sebRequired && (
              <div className="space-y-3">
                {!launchTicket ? (
                  <button
                    type="button"
                    onClick={handleCreateExamGuardTicket}
                    aria-label="Open in ExamGuard"
                    className="w-full rounded-lg border border-[#2C2DE0] bg-white px-6 py-3 text-sm font-semibold text-[#2C2DE0] transition-colors hover:bg-[#2C2DE0]/5"
                  >
                    Open UniCORE Exam App
                  </button>
                ) : (
                  <>
                    <label
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="examguard-ticket"
                    >
                      One-time launch ticket
                    </label>
                    <input
                      id="examguard-ticket"
                      aria-label="One-time ExamGuard ticket"
                      type="text"
                      readOnly
                      value={launchTicket.value}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-lg border border-[#2C2DE0] bg-white p-3 font-mono text-sm tracking-wide text-[#2C2DE0]"
                      onFocus={(event) => event.target.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyExamGuardTicket}
                      aria-label="Copy ticket"
                      className="w-full rounded-lg bg-[#2C2DE0] px-6 py-3 text-sm font-semibold text-white"
                    >
                      Copy ticket
                    </button>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      If the app did not open, open ExamGuard from your applications menu, paste this ticket, and choose Verify Invitation. The ticket expires shortly and can be redeemed only once.
                    </p>
                  </>
                )}
                {launchTicketMessage && (
                  <p className="text-center text-xs text-[#2C2DE0]" aria-live="polite">
                    {launchTicketMessage}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                clearTimeout(ticketTimerRef.current);
                setLaunchTicket(null);
                setLaunchTicketMessage("");
                setExamData(null);
              }}
              className="w-full text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-sm font-medium"
            >
              {t("exam.cancelGoBack") || "Cancel and go back"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}