// src/features/auth/signup/SignupPage.jsx
import {
  Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import VerifyEmailStep from "./VerifyEmailStep";
import api from "@/api/client";
import { buildGoogleAuthUrl } from "@/api/baseUrl";
import GoogleOneTap from "@/components/GoogleOneTap";
import { Helmet } from "react-helmet-async";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import { toast } from "sonner";

// ─── Duolingo-style Google button ────────────────────────────────────────────
function DuolingoGoogleButton({ onClick, label }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        transform: pressed ? "translateY(3px)" : "translateY(0)",
        boxShadow: pressed
          ? "0 1px 0 #b0b0b0, inset 0 1px 0 rgba(255,255,255,0.3)"
          : "0 4px 0 #b0b0b0, inset 0 1px 0 rgba(255,255,255,0.3)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      className="mt-6 w-full flex items-center justify-center gap-3
        border border-gray-200 dark:border-gray-600
        bg-white dark:bg-gray-800
        rounded-2xl py-3
        text-sm font-bold text-gray-700 dark:text-gray-100
        select-none cursor-pointer
        active:outline-none focus:outline-none
        hover:bg-gray-50 dark:hover:bg-gray-750"
    >
      {/* Official Google G */}
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.4 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.9-4.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.4 4.5 24 4.5c-7.7 0-14.4 4.4-17.7 10.2z" />
        <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.7 26.7 37.5 24 37.5c-5.3 0-9.8-3.6-11.3-8.5l-6.6 5.1C9.5 41 16.3 45.5 24 45.5z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.4 36.1 44.5 31 44.5 25c0-1.5-.2-3-.9-4.5z" />
      </svg>
      {label}
    </button>
  );
}

// ─── Password strength engine ─────────────────────────────────────────────────
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

// ─── PasswordStrengthMeter ────────────────────────────────────────────────────
const PasswordStrengthMeter = ({ password, t }) => {
  if (!password) return null;

  const checks = PW_CHECKS.map((c) => ({ ...c, met: c.test(password) }));
  const score = checks.filter((c) => c.met).length;
  const strength = calcStrength(score, t);

  return (
    <div className="mt-2.5">
      {/* 4-segment bar + label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength && i < strength.bars
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

      {/* 2-column requirements checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${c.met
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

// ─── SignupPage ───────────────────────────────────────────────────────────────
const SignupPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);


  // step: "register" | "sending" | "verify"
  const [step, setStep] = useState("register");
  const [loadingPhase, setLoadingPhase] = useState(0);

  const [registerData, setRegisterData] = useState({ name: "", username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  // Clear form on mount / back-nav
  useEffect(() => {
    const clear = () => setRegisterData({ name: "", username: "", email: "", password: "" });
    clear();
    window.addEventListener("pageshow", clear);
    return () => window.removeEventListener("pageshow", clear);
  }, []);

  // Cycle loading text
  useEffect(() => {
    if (step !== "sending") return;
    const iv = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [step]);

  const handleRegisterChange = (e) => {
    setRegisterData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setRegisterError("");
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerData.name || !registerData.email || !registerData.password) {
      setRegisterError(t("auth.fillAllFields"));
      return;
    }


    const pw = registerData.password;
    if (pw.length < 8) {
      setRegisterError(t("auth.passwordShort")); return;
    }
    if (!/[A-Z]/.test(pw)) {
      setRegisterError(t("auth.passwordUppercaseRequired"));
      return;
    }
    if (!/[a-z]/.test(pw)) {
      setRegisterError(t("auth.passwordLowercaseRequired"));
      return;
    }
    if (!/[0-9]/.test(pw)) {
      setRegisterError(t("auth.passwordNumberRequired"));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pw)) {
      setRegisterError(t("auth.passwordSpecialRequired"));
      return;
    }

    await submitRegister();
  };

  const submitRegister = async () => {
    setRegisterError("");

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Please complete the human verification.");
      return;
    }

    setStep("sending");
    setLoadingPhase(0);

    try {
      await api.post(
        "/auth/register",
        {
          ...registerData,
          turnstileToken: captchaToken,
          captchaToken,
        },
        { withCredentials: true }
      );
      setSavedEmail(registerData.email);
      setStep("verify");
    } catch (err) {
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
      const data = err.response?.data;

      if (data?.message === "An account with this email already exists.") {
        setRegisterError(t("auth.accountExists"));
      } else if (data?.errors?.length) {
        setRegisterError(data.errors[0].message);
      } else {
        setRegisterError(data?.message || t("auth.genericError"));
      }

      setStep("register");
    }
  };

  const loadingTexts = [
    t("auth.sendingCode1"),
    t("auth.sendingCode2"),
    t("auth.sendingCode3"),
  ];

  // ── Hand off to verify step ──────────────────────────────────────────────
  if (step === "verify") {
    return (
      <VerifyEmailStep
        savedEmail={savedEmail}
        onBack={() => setStep("register")}
      />
    );
  }

  function GoogleAuthButton({ onClick, label, disabled = false }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-6 w-full flex items-center justify-center gap-3
        border border-black/10 dark:border-white/15
        bg-white dark:bg-white/5
        rounded-2xl py-3
        text-sm font-semibold text-black/80 dark:text-white/90
        shadow-sm
        transition-all duration-150
        hover:bg-black/[0.02] hover:border-black/20 hover:shadow-md
        dark:hover:bg-white/10 dark:hover:border-white/25
        active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-sm dark:disabled:hover:bg-white/5
        cursor-pointer select-none"
      >
        {/* Official Google "G" */}
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.4 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.9-4.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.4 4.5 24 4.5c-7.7 0-14.4 4.4-17.7 10.2z" />
          <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.7 26.7 37.5 24 37.5c-5.3 0-9.8-3.6-11.3-8.5l-6.6 5.1C9.5 41 16.3 45.5 24 45.5z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.4 36.1 44.5 31 44.5 25c0-1.5-.2-3-.9-4.5z" />
        </svg>
        {label}
      </button>
    );
  }



  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">
      <Helmet>
        <title>Create Account - UniCORE</title>

        <meta
          name="description"
          content="Create your UniCORE account to access the academic digital ecosystem."
        />

        <link rel="canonical" href="https://www.unicores.tech/signup" />
      </Helmet>

      {/* ── Google One Tap (invisible popup) ─────────────────────────────── */}
      <GoogleOneTap />

      {/* ── LEFT: Form ─────────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">
        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
          <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">

          {/* ── SENDING ─────────────────────────────────────────────────────── */}
          {step === "sending" && (
            <div className="rounded-3xl border border-[#2C2DE0]/15 bg-[#2C2DE0]/5 p-8 shadow-[0_18px_45px_rgba(44,45,224,0.12)] dark:border-[#2C2DE0]/25 dark:bg-[#2C2DE0]/10 anim-fadeup">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0]/30 dark:border-[#2C2DE0]/40" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] border-t-transparent animate-spin" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    className="absolute inset-0 m-auto text-[#2C2DE0]">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white min-h-6 anim-textswap">
                  {loadingTexts[loadingPhase]}
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
            </div>
          )}

          {/* ── REGISTER FORM ────────────────────────────────────────────────── */}
          {step === "register" && (
            <div className="anim-fadeup">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.createAccountTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.signupSubtitle")}
              </p>

              {/* ── Duolingo-style Google button ─────────────────────────── */}
              <GoogleAuthButton
                onClick={() => {
                  const apiBase = buildGoogleAuthUrl(
                    import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? ""
                  );
                  window.location.href = apiBase;
                }}
                label={t("auth.continueGoogle")}
              />

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">
                  {t("auth.divider")}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* Error banner */}
              {registerError && (
                <div className="mb-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 anim-fadeup">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{registerError}</p>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} autoComplete="off" className="flex flex-col gap-4">

                {/* Full name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.fullName")}
                  </label>
                  <input
                    type="text" name="name"
                    value={registerData.name}
                    onChange={handleRegisterChange}
                    placeholder={t("auth.namePlaceholder")}
                    autoComplete="off"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                  />
                </div>

                {/* Optional public username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("auth.usernameLabel")}
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={registerData.username}
                    onChange={handleRegisterChange}
                    placeholder="@ahmedali"
                    maxLength={41}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                  />
                  <p className="text-[10px] text-gray-400">{t("auth.usernameHint")}</p>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.email")}
                  </label>
                  <input
                    type="email" name="email"
                    value={registerData.email}
                    onChange={handleRegisterChange}
                    placeholder={t("auth.emailPlaceholder")}
                    autoComplete="off" autoCapitalize="none" spellCheck={false}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                  />
                </div>

                {/* Password + strength meter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      placeholder={t("auth.passwordMinPlaceholder")}
                      autoComplete="new-password"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* ── Strength meter ── */}
                  <PasswordStrengthMeter password={registerData.password} t={t} />
                </div>

                <TurnstileCaptcha
                  key={captchaResetKey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />

                <button
                  type="submit"
                  disabled={step === "sending"}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
                >
                  {step === "sending" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t("auth.creatingAccount")}
                    </>
                  ) : (
                    <>
                      {t("auth.createAccountButton")}
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
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
        </div>
      </div>

      {/* ── RIGHT: Brand panel ─────────────────────────────────────────────── */}
      <div className="hidden md:flex w-1/2 bg-black dark:bg-gray-950 flex-col justify-center items-center px-14 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2C2DE0] dark:bg-[#1E1FAA]" />

        <div className="relative z-10 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#2C2DE0] flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="7" rx="1" fill="white" opacity="0.9" />
              <rect x="9" y="2" width="5" height="4" rx="1" fill="white" opacity="0.6" />
              <rect x="9" y="8" width="5" height="6" rx="1" fill="white" opacity="0.9" />
              <rect x="2" y="11" width="5" height="3" rx="1" fill="white" opacity="0.6" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white leading-tight">{t("auth.signupSideTitle")}</h2>
          <p className="text-gray-400 mt-4 text-sm leading-relaxed">{t("auth.signupSideDescription")}</p>
          <div className="mt-8 flex flex-col gap-3 text-left">
            {[
              { n: "01", label: t("auth.signupSteps")[0] },
              { n: "02", label: t("auth.signupSteps")[1] },
              { n: "03", label: t("auth.signupSteps")[2] },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#2C2DE0] dark:bg-[#1E1FAA] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {s.n}
                </span>
                <span className="text-sm text-gray-300 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-gray-500 dark:text-gray-400 italic text-sm">{t("auth.signupQuote")}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400 text-xs">{t("auth.signupQuoteAuthor")}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeup {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes textswap {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .anim-fadeup   { animation: fadeup   0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-textswap { animation: textswap 0.85s ease infinite; }
      `}</style>
    </div>
  );
};

export default SignupPage;
