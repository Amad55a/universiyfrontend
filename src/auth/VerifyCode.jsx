import { ArrowRight, ArrowLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import api from "@/api/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VerifyCode = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || "";

  // step 1 = email, step 2 = code
  const [step, setStep] = useState(emailFromState ? 2 : 1);

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState("");

  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  // Rotate loading text, same as LoginPage
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      navigate("/login");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [verified, navigate]);

  const validateEmail = (value) => {
    if (!value.trim()) return t("auth.emailRequired") || t("auth.emailAndCodeRequired");
    if (!EMAIL_REGEX.test(value.trim())) return t("auth.invalidEmail") || t("auth.emailAndCodeRequired");
    return "";
  };

  const validateCode = (value) => {
    if (!value.trim()) return t("auth.codeRequired") || t("auth.emailAndCodeRequired");
    if (value.trim().length < 6) return t("auth.verificationCodeMinLength");
    if (!/^\d+$/.test(value.trim())) return t("auth.codeDigitsOnly") || t("auth.verificationCodeMinLength");
    return "";
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    if (codeError) setCodeError("");
  };

  // ── STEP 1: validate email, then request a code and move to step 2 ──
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      toast.error(err);
      return;
    }

    setLoading(true);
    setLoadingPhase(0);
    try {
      await api.post("/auth/resend-code", { email: email.trim() });
      toast.success(t("auth.newVerificationCodeSent"));
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || t("auth.resendFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: validate code, then verify ──
  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setStep(1);
      setEmailError(emailErr);
      toast.error(emailErr);
      return;
    }

    const codeErr = validateCode(code);
    if (codeErr) {
      setCodeError(codeErr);
      toast.error(codeErr);
      return;
    }

    setLoading(true);
    setLoadingPhase(0);
    try {
      await api.post("/auth/verify-email", {
        email: email.trim(),
        code: code.trim(),
      });

      setVerified(true);
      toast.success(t("auth.accountVerifiedProceedToLogin"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("auth.verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const err = validateEmail(email);
    if (err) {
      setStep(1);
      setEmailError(err);
      toast.error(err);
      return;
    }
    setResendLoading(true);
    try {
      await api.post("/auth/resend-code", { email: email.trim() });
      toast.success(t("auth.newVerificationCodeSent"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("auth.resendFailed"));
    } finally {
      setResendLoading(false);
    }
  };

  const loadingTexts = [
    t("auth.verifyingPhase1") || t("auth.verifyingCode"),
    t("auth.verifyingPhase2") || t("auth.verifyingCode"),
    t("auth.verifyingPhase3") || t("auth.verifyingCode"),
  ];

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">

      {/* ── LEFT: Form (50%) ─────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">

        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
          <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">

          {/* ── LOADING STATE ─────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center text-center py-12 anim-fadeup">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0]/20 dark:border-[#4F51FF]/30" />
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] dark:border-[#4F51FF] border-t-transparent animate-spin" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  className="absolute inset-0 m-auto text-[#2C2DE0] dark:text-[#8E90FF]">
                  <path d="M9 12l2 2 4-4m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="text-base font-bold text-gray-900 dark:text-white min-h-6 anim-textswap">
                {loadingTexts[loadingPhase]}
              </p>

              <div className="flex gap-1 mt-5">
                {[0, 1, 2].map((i) => (
                  <span key={i}
                    className="w-2 h-2 rounded-full bg-[#2C2DE0] dark:bg-[#4F51FF] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP INDICATOR ─────────────────────────────────────────── */}
          {!loading && (
            <div className="flex items-center gap-2 mb-6">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-[#2C2DE0] dark:bg-[#4F51FF]" : "bg-gray-200 dark:bg-gray-800"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-[#2C2DE0] dark:bg-[#4F51FF]" : "bg-gray-200 dark:bg-gray-800"}`} />
            </div>
          )}

          {verified && (
            <div className="anim-fadeup text-center">
              {/* FIX: white icon had no background, so it vanished on a white page */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2C2DE0]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M9 12l2 2 4-4m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h1 className="mt-6 text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.accountVerifiedProceedToLogin") || "Your account is verified"}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Taking you back to the login page...
              </p>

              <div className="mt-8 flex justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-[#2C2DE0]/20 dark:border-[#4F51FF]/30 border-t-[#2C2DE0] dark:border-t-[#4F51FF] animate-spin" />
              </div>
            </div>
          )}

          {/* ── STEP 1: EMAIL ─────────────────────────────────────────── */}
          {!loading && !verified && step === 1 && (
            <div className="anim-fadeup">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.verifyAccountTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.verifyEmailStepSubtitle") || t("auth.verifyAccountSubtitle")}
              </p>

              <form onSubmit={handleEmailSubmit} autoComplete="off" className="flex flex-col gap-4 mt-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.email")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={t("auth.emailPlaceholder")}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${emailError
                        ? "border-red-400 focus:ring-red-400/30 focus:border-red-400"
                        : "border-gray-200 dark:border-gray-700 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]"
                      }`}
                  />
                  {emailError && (
                    <span className="text-xs text-red-500 mt-0.5">{emailError}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#58CC02]
                    text-white text-sm font-bold
                    shadow-[0_4px_0_#46A302]
                    hover:translate-y-0.5
                    hover:shadow-[0_2px_0_#46A302]
                    active:translate-y-1
                    active:shadow-none
                    transition-all duration-150 py-3 rounded-xl mt-2 group"
                >
                  {t("auth.sendCodeButton") || t("auth.verifyAccountButton")}
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                {t("auth.alreadyVerified")}{" "}
                <Link to="/login" className="text-[#2C2DE0] dark:text-[#8E90FF] font-semibold hover:underline">
                  {t("auth.signInLink")}
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: CODE ─────────────────────────────────────────── */}
          {!loading && !verified && step === 2 && (
            <div className="anim-fadeup">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
              >
                <ArrowLeft size={13} />
                {t("common.back") || "Back"}
              </button>

              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.verifyAccountTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.verifyCodeStepSubtitle") || t("auth.verifyAccountSubtitle")}{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300 break-all">{email}</span>
              </p>

              <form onSubmit={handleCodeSubmit} autoComplete="off" className="flex flex-col gap-4 mt-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("auth.verificationCodeLabel")}
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder={t("auth.resetCodePlaceholder")}
                    inputMode="numeric"
                    maxLength={6}
                    className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all tracking-[0.3em] text-center font-bold ${codeError
                        ? "border-red-400 focus:ring-red-400/30 focus:border-red-400"
                        : "border-gray-200 dark:border-gray-700 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]"
                      }`}
                  />
                  {codeError && (
                    <span className="text-xs text-red-500 mt-0.5">{codeError}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#58CC02]
                    text-white text-sm font-bold
                    shadow-[0_4px_0_#46A302]
                    hover:translate-y-0.5
                    hover:shadow-[0_2px_0_#46A302]
                    active:translate-y-1
                    active:shadow-none
                    transition-all duration-150 py-3 rounded-xl mt-2 group"
                >
                  {t("auth.verifyAccountButton")}
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>{t("auth.didntReceiveCode")}</p>
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-gray-900 dark:bg-gray-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resendLoading ? t("auth.resendingCode") : t("auth.resendCode")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── RIGHT: Brand panel (50%) ────────────────────────────────── */}
      <div className="hidden md:flex w-1/2 bg-black dark:bg-gray-950 flex-col justify-center items-center px-14 text-center relative overflow-hidden">

        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2C2DE0]" />

        <div className="relative z-10 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#58CC02]
              shadow-[0_4px_0_#46A302]
              flex items-center justify-center mx-auto mb-6">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight">
            {t("auth.verifySideTitle") || t("auth.sideTitle")}
          </h2>

          <p className="text-gray-400 mt-4 text-sm leading-relaxed">
            {t("auth.verifySideDescription") || t("auth.sideDescription")}
          </p>

          <p className="mt-10 text-gray-500 italic text-sm">
            {t("auth.quote")}
          </p>
          <p className="mt-1 text-gray-600 text-xs">{t("auth.quoteAuthor")}</p>
        </div>
      </div>

      {/* Animations */}
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
        .anim-fadeup   { animation: fadeup 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-textswap { animation: textswap 0.85s ease infinite; }
      `}</style>
    </div>
  );
};

export default VerifyCode;