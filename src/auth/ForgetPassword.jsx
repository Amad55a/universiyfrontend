// src/features/auth/forgot-password/ForgotPassword.jsx
import {
  Eye, EyeOff, ArrowRight, CheckCircle2, Loader2,
  AlertCircle, Lock,
} from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import api from "@/api/client";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";

const PW_CHECKS = [
  { id: "len", test: (p) => p.length >= 8 },
  { id: "upper", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", test: (p) => /[a-z]/.test(p) },
  { id: "digit", test: (p) => /[0-9]/.test(p) },
  { id: "special", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function calcStrength(score, t) {
  if (score === 0) return null;
  if (score <= 2) return { label: t("auth.passwordStrengthWeak"), bars: 1, bar: "bg-red-500", text: "text-red-500" };
  if (score === 3) return { label: t("auth.passwordStrengthFair"), bars: 2, bar: "bg-orange-400", text: "text-orange-400" };
  if (score === 4) return { label: t("auth.passwordStrengthGood"), bars: 3, bar: "bg-yellow-500", text: "text-yellow-500" };
  return { label: t("auth.passwordStrengthStrong"), bars: 4, bar: "bg-[#2C2DE0]", text: "text-[#2C2DE0]" };
}

const PasswordStrengthMeter = ({ password, t }) => {
  if (!password) return null;

  const checks   = PW_CHECKS.map((c) => ({ ...c, met: c.test(password) }));
  const score    = checks.filter((c) => c.met).length;
  const strength = calcStrength(score, t);

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                strength && i < strength.bars
                  ? strength.bar
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
        {strength && (
          <span className={`text-[11px] font-bold shrink-0 ${strength.text}`}>
            {strength.label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${
              c.met
                ? "text-[#2C2DE0] dark:text-[#2C2DE0]"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {c.met ? (
              <CheckCircle2 size={10} className="shrink-0" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full border border-current shrink-0 opacity-40" />
            )}
            <span>{t(`auth.passwordRule${c.id}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Dot-grid background ──────────────────────────────────────────────────────
const DotGrid = () => (
  <div
    className="absolute inset-0 opacity-[0.07]"
    style={{
      backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    }}
  />
);

// ─── Small logo mark ──────────────────────────────────────────────────────────
const LogoMark = ({ size = 9 }) => (
  <div className={`w-${size} h-${size} rounded-xl bg-[#2C2DE0] flex items-center justify-center shadow-sm shadow-[#2C2DE0]`}>
    <svg width={size === 9 ? 18 : 28} height={size === 9 ? 18 : 28} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="7" rx="1" fill="white" opacity="0.9" />
      <rect x="9" y="2" width="5" height="4" rx="1" fill="white" opacity="0.6" />
      <rect x="9" y="8" width="5" height="6" rx="1" fill="white" opacity="0.9" />
      <rect x="2" y="11" width="5" height="3" rx="1" fill="white" opacity="0.6" />
    </svg>
  </div>
);

// ─── Step pill indicator ──────────────────────────────────────────────────────
const StepPill = ({ n, active, done }) => (
  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
    done
      ? "bg-[#2C2DE0] text-white"
      : active
        ? "bg-[#2C2DE0] text-white ring-4 ring-[#2C2DE0]/20"
        : "bg-gray-100 dark:bg-gray-800 text-gray-400"
  }`}>
    {done ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
    ) : n}
  </div>
);

// ─── Error alert ──────────────────────────────────────────────────────────────
const ErrorAlert = ({ msg, className = "" }) => (
  <div className={`flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 anim-fadeup mb-4 ${className}`}>
    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
    <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{msg}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ForgotPassword = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const resetLinkParams = new URLSearchParams(location.hash.slice(1));
  const linkedEmail = resetLinkParams.get("email");
  const linkedCode = resetLinkParams.get("code");

  // step: "email" | "sending" | "verify" | "success"
  const [step, setStep]               = useState(() => linkedEmail && linkedCode ? "verify" : "email");
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [resetPending, setResetPending] = useState(false);
  const resetPendingRef = useRef(false);

  const [email, setEmail]           = useState(linkedEmail || "");
  const [code, setCode]             = useState(linkedCode || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [resetError, setResetError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    if (!linkedEmail || !linkedCode) return;

    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [linkedCode, linkedEmail, location.pathname, location.search, navigate]);

  // Rotate loading text
  useEffect(() => {
    if (step !== "sending") return;
    const iv = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [step]);

  const sendingTexts  = [t("auth.sendingResetCode1"), t("auth.sendingResetCode2"), t("auth.sendingResetCode3")];
  const loadingText   = sendingTexts[loadingPhase];

  // ── Step 1: Send reset code ───────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) { setEmailError(t("auth.fillAllFields")); return; }

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setEmailError("Please complete the human verification.");
      return;
    }

    setEmailError("");
    setStep("sending");
    setLoadingPhase(0);

    try {
      await api.post("/auth/forgot-password", { email, turnstileToken }, { withCredentials: true });
      // Transition directly to verify — no extra animating state needed
      setStep("verify");
    } catch (err) {
      setTurnstileToken(null);
      setCaptchaResetKey((key) => key + 1);
      setEmailError(err.response?.data?.message || t("auth.genericError"));
      setStep("email");
    }
  };

  // ── Step 2: Verify code + set new password ────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (resetPendingRef.current) return;

    if (!code || !newPassword || !confirmPw) {
      setResetError(t("auth.fillAllFields")); return;
    }
    if (newPassword !== confirmPw) {
      setResetError(t("auth.passwordMismatch")); return;
    }
    if (newPassword.length < 8) {
      setResetError(t("auth.passwordShort")); return;
    }

    // Mirror backend strength check before hitting the server
    const checks = PW_CHECKS.map((c) => c.test(newPassword));
    if (!checks.every(Boolean)) {
      setResetError(t("auth.passwordStrongRequirement"));
      return;
    }

    setResetError("");
    resetPendingRef.current = true;
    setResetPending(true);

    try {
      await api.post("/auth/reset-password", { email, code, newPassword });
      setStep("success");
      toast.success(t("auth.resetSuccess"));
      setTimeout(() => {
        navigate("/login");
      }, 2400);
    } catch (err) {
      setResetError(err.response?.data?.message || t("auth.resetFailed"));
    } finally {
      resetPendingRef.current = false;
      setResetPending(false);
    }
  };

  const handleResend = async () => {
  
    setStep("sending");
    setLoadingPhase(0);
    try {
      await api.post("/auth/forgot-password", { email, turnstileToken }, { withCredentials: true });
      setStep("verify");
      toast.success(t("auth.codeResent"));
    } catch (err) {
      setResetError(err.response?.data?.message || t("auth.resendFailed"));
      setStep("verify");
    }
  };

  const forgotSideSteps = t("auth.forgotSideSteps");

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">

      {/* ══ LEFT: Form ══════════════════════════════════════════════════════════ */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
        <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">

          {/* ── SUCCESS ─────────────────────────────────────────────────────── */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-8 anim-fadeup">
              <div className="w-20 h-20 rounded-2xl bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 flex items-center justify-center mb-5 anim-scalein">
                <CheckCircle2 size={40} className="text-[#2C2DE0]" />
              </div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">
                {t("auth.passwordResetDone")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("auth.redirectingToLoginAfterReset")}
              </p>
              <div className="mt-8 w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full bg-[#2C2DE0] rounded-full anim-progress" />
              </div>
            </div>
          )}

          {/* ── LOADING (sending / verifying) ───────────────────────────────── */}
          {step === "sending" && (
            <div className="flex flex-col items-center text-center py-12 anim-fadeup">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] dark:border-[#2C2DE0]" />
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] border-t-transparent animate-spin" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  className="absolute inset-0 m-auto text-[#2C2DE0]">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white min-h-6 anim-textswap">
                {loadingText}
              </p>
              <div className="flex gap-1 mt-5">
                {[0, 1, 2].map((i) => (
                  <span key={i}
                    className="w-2 h-2 rounded-full bg-[#2C2DE0] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: EMAIL ────────────────────────────────────────────────── */}
          {step === "email" && (
            <div className="anim-fadeup">
              <div className="flex items-center gap-2 mb-6">
                <StepPill n={1} active />
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                <StepPill n={2} active={false} />
              </div>

              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.forgotTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
                {t("auth.forgotSubtitle")}
              </p>

              {emailError && <ErrorAlert msg={emailError} />}

              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgot-email" className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    {t("common.email")}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder={t("auth.emailPlaceholder")}
                    autoFocus
                    className="forgot-email-input w-full appearance-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
                  />
                </div>

                <TurnstileCaptcha
                  key={captchaResetKey}
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                />

                <button
  type="submit"
  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
>
  {t("auth.sendResetCode")}
  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
</button>
              </form>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                {t("auth.haveAccount")}{" "}
                <Link to="/login" className="text-[#2C2DE0] dark:text-[#2C2DE0] font-semibold hover:underline">
                  {t("auth.signInLink")}
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: CODE + NEW PASSWORD ──────────────────────────────────── */}
          {step === "verify" && (
            <div className="anim-slidein">
              <div className="flex items-center gap-2 mb-6">
                <StepPill n={1} done />
                <div className="h-px flex-1 bg-[#2C2DE0]" />
                <StepPill n={2} active />
              </div>

              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.resetPasswordTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.resetPasswordSubtitle")}
              </p>

              {/* Locked email badge */}
              <div className="mt-4 mb-1 flex items-center gap-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-[#2C2DE0] shrink-0">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                <span className="text-xs font-mono font-bold tracking-widest text-gray-800 dark:text-gray-100">
                  {email}
                </span>
              </div>

              {resetError && <ErrorAlert msg={resetError} className="mt-4" />}

              <form onSubmit={handleReset} className="mt-4 flex flex-col gap-4">

                {/* Verification code */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-code" className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    {t("auth.resetCodeLabel")}
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setResetError(""); }}
                    placeholder={t("auth.resetCodePlaceholder")}
                    maxLength={6}
                    autoFocus
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-[0.3em] text-center text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all uppercase"
                  />
                  <p className="text-[11px] text-gray-400">{t("auth.codeHint")}</p>
                </div>

                {/* New password + strength meter */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    {t("auth.newPasswordLabel")}
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setResetError(""); }}
                      placeholder={t("auth.passwordMinPlaceholder")}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* ── Strength meter ── */}
                  <PasswordStrengthMeter password={newPassword} t={t} />
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    {t("auth.confirmPasswordLabel")}
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => { setConfirmPw(e.target.value); setResetError(""); }}
                      placeholder={t("auth.confirmPasswordLabel")}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Confirm match indicator */}
                  {confirmPw && (
                    <p className={`text-[11px] font-medium flex items-center gap-1 ${
                      newPassword === confirmPw
                        ? "text-[#2C2DE0] dark:text-[#2C2DE0]"
                        : "text-red-500"
                    }`}>
                      {newPassword === confirmPw ? (
                        <><CheckCircle2 size={10} /> {t("auth.passwordsMatch")}</>
                      ) : (
                        <><AlertCircle size={10} /> {t("auth.passwordsDontMatch")}</>
                      )}
                    </p>
                  )}
                </div>
{/* 1. Reset Password */}
<button
  type="submit"
  disabled={!code.trim() || !newPassword || !confirmPw || resetPending}
  aria-busy={resetPending}
  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
>
  {resetPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
  {t("auth.resetPassword")}
  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
</button>
</form>

              {/* Resend */}
              <div className="mt-5 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t("auth.forgotDidntReceive")}
                </p>
                <button
                  onClick={handleResend}
                  className="text-xs font-semibold text-[#2C2DE0] dark:text-[#2C2DE0] hover:underline"
                >
                  {t("auth.forgotResendCode")}
                </button>
              </div>

              {/* Back */}
              <button 
                onClick={() => { setStep("email"); setCode(""); setResetError(""); }}
                className="w-full mt-4 text-center text-xs text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] font-semibold transition-colors"
              >
                ← {t("auth.forgotBackToEmail")}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ══ RIGHT: Brand panel ══════════════════════════════════════════════════ */}
      <div className="hidden md:flex w-1/2 bg-black dark:bg-gray-950 flex-col justify-center items-center px-14 text-center relative overflow-hidden">
        <DotGrid />
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2C2DE0]" />

        {/* Decorative rings */}
        <div className="absolute w-120 h-120 rounded-full border border-[#2C2DE0]/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute w-85 h-85 rounded-full border border-[#2C2DE0]/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#2C2DE0] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#2C2DE0]/30">
            <LogoMark size={14} />
          </div>
          <h2 className="text-2xl font-black text-white leading-tight">
            {t("auth.forgotSideTitle")}
          </h2>
          <p className="text-gray-400 mt-4 text-sm leading-relaxed">
            {t("auth.forgotSideDescription")}
          </p>

          <div className="mt-8 flex flex-col gap-3 text-left">
            {(Array.isArray(forgotSideSteps) ? forgotSideSteps : []).map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#2C2DE0] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-gray-300 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[#2C2DE0]/10 border border-[#2C2DE0]/20 rounded-2xl px-5 py-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-1">
              {t("auth.forgotSecurityNote")}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t("auth.forgotSecurityBody")}
            </p>
          </div>

          <p className="mt-8 text-gray-500 dark:text-gray-400 italic text-sm">{t("auth.forgotQuote")}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400 text-xs">{t("auth.forgotQuoteAuthor")}</p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .forgot-email-input:focus {
          outline: 2px solid #2C2DE0;
          outline-offset: 2px;
          border-color: #2C2DE0;
        }
        @keyframes fadeup {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slidein {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scalein {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes textswap {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .anim-fadeup   { animation: fadeup   0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-slidein  { animation: slidein  0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-scalein  { animation: scalein  0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .anim-progress { animation: progress 2.4s linear forwards; }
        .anim-textswap { animation: textswap 0.85s ease infinite; }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
