import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  ArrowLeft,
  ShieldCheck,
  BadgeCheck,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { useUniversityVerification } from "@/hooks/useUniversityVerification";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import api from "@/api/client";

const CHECKING_MS = 2200;

// Where each account type lands once verification finishes
const dashboardPathFor = (accountType) =>
  accountType === "teacher" ? "/teacher/dashboard" : accountType === "student" ? "/student/dashboard" : "/dashboard";

const VerifyUniversityId = () => {
  const { t } = useLanguage();
  const copy = t.universityVerification;
  const { user, loading, setUser } = useAuth();
  const { isUniversityVerified } = useUniversityVerification();
  const navigate = useNavigate();

  // Step: "idle" | "checking1" | "step2" | "checking2" | "success"
  const [step, setStep] = useState("idle");
  const [universityId, setUniversityId] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(0);

  // Which registry role step 1 matched against - "student" | "teacher" | null
  const [accountType, setAccountType] = useState(null);

  // Rate limiting
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Animation: which panel is visible
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!loading && isUniversityVerified) {
      navigate(dashboardPathFor(user?.role), { replace: true });
    }
  }, [loading, user, isUniversityVerified, navigate]);

  // Lockout timer
  useEffect(() => {
    if (!lockoutTime) return;
    const iv = setInterval(() => {
      const rem = Math.max(0, lockoutTime - Date.now());
      if (rem === 0) {
        setLockoutTime(null); setLockoutCountdown(0); setAttempts(0); setErrorMsg("");
      } else {
        setLockoutCountdown(Math.ceil(rem / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [lockoutTime]);

  // Cycle loading dot text
  useEffect(() => {
    if (!step.startsWith("checking")) return;
    const iv = setInterval(() => setLoadingPhase(p => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [step]);

  const isLockedOut = lockoutTime && Date.now() < lockoutTime;

  const bumpAttempts = () => {
    const n = attempts + 1;
    setAttempts(n);
    if (n >= 5) {
      setLockoutTime(Date.now() + 15 * 60 * 1000);
      setErrorMsg(copy.tooManyAttempts);
    }
    return n;
  };

  // Map a known backend error code to translated copy; fall back to the
  // REAL message the backend sent instead of a generic "server error".
  const resolveErrorMessage = (err, knownCodeMap) => {
    const code = err.response?.data?.code;
    if (code && knownCodeMap[code]) return knownCodeMap[code];
    return (
      err.response?.data?.message ||
      copy.serverError ||
      "Something went wrong. Please try again."
    );
  };

  // ── Step 1: check ID ──────────────────────────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (isLockedOut || !universityId.trim()) return;
    setErrorMsg("");
    setStep("checking1");
    setLoadingPhase(0);

    await new Promise(r => setTimeout(r, CHECKING_MS));

    try {
      const { data } = await api.post(
        "auth/university/check",
        { universityId: universityId.trim().toUpperCase() },
        { withCredentials: true }
      );

      const resolvedData = data.data || data;
      setAccountType(resolvedData?.accountType ?? null);

      // Animate transition to step 2
      setAnimating(true);
      setTimeout(() => {
        setStep("step2");
        setAttempts(0);
        setErrorMsg("");
        setAnimating(false);
      }, 380);
    } catch (err) {
      const n = bumpAttempts();
      if (n < 5) {
        setErrorMsg(
          resolveErrorMessage(err, {
            error_id_not_found: copy.notFound,
            error_id_already_claimed: copy.alreadyClaimed,
            error_already_verified: copy.alreadyVerified,
          })
        );
      }
      setStep("idle");
    }
  };

  // ── Step 2: confirm identity ──────────────────────────────────────────────
  const handleStep2 = async (e) => {
    e.preventDefault();
    if (isLockedOut || !fullName.trim() || !password.trim()) return;
    setErrorMsg("");
    setStep("checking2");
    setLoadingPhase(0);

    await new Promise(r => setTimeout(r, CHECKING_MS));

    try {
      const { data } = await api.post(
        "auth/university/confirm",
        {
          universityId: universityId.trim().toUpperCase(),
          fullName: fullName.trim(),
          registryPassword: password,
        },
        { withCredentials: true }
      );

      const resolvedData = data.data || data;
      // Trust the server's classification over the step-1 guess
      const resolvedAccountType = resolvedData.accountType ?? accountType;
      setAccountType(resolvedAccountType);

      setUser(resolvedData.user);
      toast.success(copy.successTitle);
      setStep("success");
      setTimeout(
        () => navigate(dashboardPathFor(resolvedAccountType), { replace: true }),
        2500
      );
    } catch (err) {
      const n = bumpAttempts();
      if (n < 5) {
        setErrorMsg(
          resolveErrorMessage(err, {
            error_name_mismatch: copy.nameMismatch,
            error_password_incorrect: copy.wrongPassword,
            error_id_already_claimed: copy.alreadyClaimed,
            error_id_not_found: copy.notFound,
            error_password_missing: copy.serverError,
          })
        );
      }
      setStep("step2");
    }
  };

  // Loading text arrays — 3 phases each
  const loadingTexts1 = [copy.checking1a, copy.checking1b, copy.checking1c];
  const loadingTexts2 = [copy.checking2a, copy.checking2b, copy.checking2c];
  const loadingText = step === "checking1"
    ? loadingTexts1[loadingPhase]
    : loadingTexts2[loadingPhase];

  // ── Guard: spinner while auth loads ──────────────────────────────────────
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2DE0] dark:text-[#8E90FF]" />
      </div>
    );
  }

  const isChecking = step === "checking1" || step === "checking2";
  const isTeacherAccount = accountType === "teacher";

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">

      {/* ── LEFT PANEL (form) ──────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
          <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-8 anim-fadeup">
              {/* FIX: removed stacked conflicting dark:bg-* classes */}
              <div className="w-20 h-20 rounded-2xl bg-[#2C2DE0]/10 dark:bg-[#4F51FF]/20 flex items-center justify-center mb-5 anim-scalein">
                <CheckCircle2 size={40} className="text-[#2C2DE0] dark:text-[#8E90FF]" />
              </div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">
                {copy.successTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {copy.successSub}
              </p>
              {isTeacherAccount && (
                <p className="text-xs text-blue-500 mt-1 font-semibold">
                  {copy.teacherRedirectNote || "Taking you to your teacher dashboard..."}
                </p>
              )}
              {/* Progress bar */}
              <div className="mt-8 w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full bg-[#2C2DE0] dark:bg-[#4F51FF] rounded-full anim-progress" />
              </div>
            </div>
          )}

          {/* ── CHECKING (step 1 or 2) ───────────────────────────────────── */}
          {isChecking && (
            <div className="flex flex-col items-center text-center py-12 anim-fadeup">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0]/20 dark:border-[#4F51FF]/30" />
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] dark:border-[#4F51FF] border-t-transparent animate-spin" />
                <GraduationCap size={22} className="absolute inset-0 m-auto text-[#2C2DE0] dark:text-[#8E90FF]" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white min-h-6 anim-textswap">
                {loadingText}
              </p>
              <div className="flex gap-1 mt-5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#2C2DE0] dark:bg-[#4F51FF] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Enter ID ─────────────────────────────────────────── */}
          {(step === "idle" || (step === "step2" && animating)) && (
            <div className={animating ? "anim-slideout" : "anim-fadeup"}>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {copy.pageTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {copy.pageSubtitle}
              </p>

              <form onSubmit={handleStep1} className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {copy.idLabel}
                  </label>
                  <input
                    type="text"
                    value={universityId}
                    onChange={(e) => { setUniversityId(e.target.value.toUpperCase()); setErrorMsg(""); }}
                    placeholder={copy.idPlaceholder}
                    disabled={isLockedOut}
                    autoFocus
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-[0.12em] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#4F51FF] transition-all uppercase disabled:opacity-50"
                  />
                </div>

                {errorMsg && <ErrorAlert msg={errorMsg} isLockedOut={isLockedOut} countdown={lockoutCountdown} copy={copy} />}

                {/* University ID submit */}
                <button
                  type="submit"
                  disabled={!universityId.trim() || isLockedOut}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
                >
                  {copy.submit}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const guest = {
                      id: null,
                      name: "Guest",
                      email: null,
                      role: "guest",
                      provider: "guest",
                      isVerified: false,
                      isUniversityVerified: false,
                    };
                    // persist guest so reloads keep access
                    try { localStorage.setItem("guestUser", JSON.stringify(guest)); } catch (e) { /* ignore */ }
                    setUser(guest);
                    navigate("/dashboard");
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-2
  bg-gray-100 dark:bg-gray-800
  text-gray-700 dark:text-gray-200
  text-sm font-bold
  py-3 rounded-xl
  hover:bg-gray-200 dark:hover:bg-gray-700
  transition-all"
                >
                  Enter as Guest
                </button>
                {attempts > 0 && !isLockedOut && (
                  <p className="text-center text-xs text-gray-400">
                    {copy.attemptsWarning?.replace("{{current}}", attempts).replace("{{max}}", 5)}
                  </p>
                )}
              </form>

              {/* FIX: cleaned mixed-up light/dark text + hover classes */}
              <Link
                to="/dashboard"
                className="mt-6 block text-center text-xs text-gray-500 dark:text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#8E90FF] font-semibold transition-colors"
              >
                {t.navbar?.dashboard} →
              </Link>
            </div>
          )}

          {/* ── STEP 2: Full name + password ─────────────────────────────── */}
          {step === "step2" && !animating && (
            <div className="anim-slidein">
              {/* Back */}
              <button
                type="button"
                onClick={() => { setStep("idle"); setErrorMsg(""); setFullName(""); setPassword(""); setAccountType(null); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#8E90FF] font-semibold mb-6 transition-colors"
              >
                <ArrowLeft size={13} />
                {copy.back}
              </button>

              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {copy.confirmTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {copy.confirmSubtitle}
              </p>

              {/* ID badge — FIX: clean background/border, readable text in both modes */}
              <div className="mt-5 flex items-center gap-2.5 bg-[#2C2DE0]/5 dark:bg-[#4F51FF]/10 border border-[#2C2DE0]/30 dark:border-[#4F51FF]/40 rounded-xl px-4 py-2.5">
                <BadgeCheck size={15} className="text-[#2C2DE0] dark:text-[#8E90FF] shrink-0" />
                <span className="text-xs font-mono font-bold tracking-widest text-[#0F0F55] dark:text-white">
                  {universityId}
                </span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0] dark:text-[#8E90FF]">
                  {copy.idFoundBadge}
                </span>
              </div>

              {/* Account type badge - tells the user which record matched */}
              {accountType && (
                <div
                  className={
                    isTeacherAccount
                      ? "mt-2.5 flex items-center gap-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-2.5"
                      : "mt-2.5 flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5"
                  }
                >
                  {isTeacherAccount
                    ? <Briefcase size={15} className="text-blue-500 shrink-0" />
                    : <GraduationCap size={15} className="text-gray-400 shrink-0" />}
                  <span
                    className={
                      isTeacherAccount
                        ? "text-xs font-bold text-blue-700 dark:text-blue-400"
                        : "text-xs font-bold text-gray-500 dark:text-gray-400"
                    }
                  >
                    {isTeacherAccount
                      ? (copy.teacherAccountBadge || "Teacher account")
                      : (copy.studentAccountBadge || "Student account")}
                  </span>
                </div>
              )}

              {errorMsg && <div className="mt-4"><ErrorAlert msg={errorMsg} isLockedOut={isLockedOut} countdown={lockoutCountdown} copy={copy} /></div>}

              <form onSubmit={handleStep2} className="mt-5 flex flex-col gap-4">
                {/* Full name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {copy.nameLabel}
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setErrorMsg(""); }}
                      placeholder={copy.namePlaceholder}
                      disabled={isLockedOut}
                      autoFocus
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#4F51FF] transition-all disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">{copy.nameHint}</p>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {copy.passwordLabel}
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      placeholder="••••••••"
                      disabled={isLockedOut}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-16 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#4F51FF] transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#8E90FF] transition-colors"
                    >
                      {showPassword ? copy.hide : copy.show}
                    </button>
                  </div>
                </div>

                {/* Confirm / create password */}
                <button
                  type="submit"
                  disabled={!fullName.trim() || !password.trim() || isLockedOut}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
                >
                  {copy.confirmCta}
                  <ArrowRight size={16} />
                </button>

                {attempts > 0 && !isLockedOut && (
                  <p className="text-center text-xs text-gray-400">
                    {copy.attemptsWarning?.replace("{{current}}", attempts).replace("{{max}}", 5)}
                  </p>
                )}
              </form>
            </div>
          )}

        </div>
      </div>

      {/* ── RIGHT PANEL (branding) ─────────────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 bg-black relative overflow-hidden items-center justify-center p-16">
        {/* Subtle glow top-left */}
        <div className="absolute inset-0 bg-linear-to-br from-[#2C2DE0]/20 via-transparent to-transparent pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }} />

        <div className="relative z-10 max-w-md w-full">
          {/* Logo box */}
          <div className="inline-flex items-center justify-center bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 mb-10">
            <img
              src="images/logouniso.png"
              alt="Uniso"
              style={{
                height: 140,
                objectFit: "contain",
                filter: "drop-shadow(0 0 2px #2C2DE0aa)"
              }}
            />
          </div>

          {/* Step tracker */}
          <div className="flex flex-col gap-7 mb-12">
            {[
              { n: 1, titleKey: "stepOneTitle", descKey: "stepOneDesc" },
              { n: 2, titleKey: "stepTwoTitle", descKey: "stepTwoDesc" },
            ].map(({ n, titleKey, descKey }) => {
              const currentNum = step === "success" ? 3 : step === "step2" ? 2 : 1;
              const active = currentNum >= n;
              const done = currentNum > n;
              return (
                <div key={n} className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500"
                    style={{
                      background: active ? "#2C2DE0" : "#1a1a1a",
                      border: `1.5px solid ${active ? "#2C2DE0" : "#333"}`,
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={16} className="text-white" />
                      : <span className="text-xs font-black" style={{ color: active ? "#fff" : "#555" }}>{n}</span>
                    }
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-bold" style={{ color: active ? "#fff" : "#555" }}>
                      {copy[titleKey]}
                    </p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#555" }}>
                      {copy[descKey]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security badge — FIX: icon was blue on black, now lighter blue */}
          <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <ShieldCheck size={15} className="text-[#8E90FF] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{copy.securityNote}</p>
          </div>
        </div>
      </div>

      {/* ── Animations ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeup {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideout {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-36px); }
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
        .anim-fadeup   { animation: fadeup  0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-slideout { animation: slideout 0.38s ease forwards; }
        .anim-slidein  { animation: slidein  0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-scalein  { animation: scalein  0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .anim-progress { animation: progress 2.4s linear forwards; }
        .anim-textswap { animation: textswap 0.85s ease infinite; }
      `}</style>
    </div>
  );
};

// ── Error alert ──────────────────────────────────────────────────────────────
const ErrorAlert = ({ msg, isLockedOut, countdown, copy }) => (
  <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 anim-fadeup">
    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
    <div>
      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{msg}</p>
      {isLockedOut && countdown > 0 && (
        <p className="text-xs text-red-400 mt-1 font-mono">
          {copy.lockoutCountdown?.replace("{{seconds}}", countdown)}
        </p>
      )}
    </div>
  </div>
);

export default VerifyUniversityId;