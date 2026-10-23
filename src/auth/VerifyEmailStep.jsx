// src/features/auth/signup/VerifyEmailStep.jsx
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import api from "@/api/client";

/**
 * VerifyEmailStep
 * Receives: savedEmail (string), onBack (fn)
 * Handles: verify + resend logic, success state, redirect to /login
 */
const VerifyEmailStep = ({ savedEmail, onBack }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Step: "verify" | "verifying" | "sending" | "success"
  const [step, setStep] = useState("verify");
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (step !== "verifying" && step !== "sending") return;
    const iv = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [step]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    if (!verifyCode.trim()) {
      setVerifyError(t("auth.codeRequired"));
      return;
    }

    setVerifyError("");
    setStep("verifying");
    setLoadingPhase(0);

    try {
      await new Promise((r) => setTimeout(r, 2200));
      await api.post(
        "/auth/verify-email",
        { email: savedEmail, code: verifyCode },
        { withCredentials: true }
      );
      setStep("success");
      setTimeout(() => {
        toast.success(t("auth.accountVerifiedProceedToLogin"));
        navigate("/login");
      }, 2000);
    } catch (err) {
      setVerifyError(err.response?.data?.message || t("auth.verificationFailed"));
      setStep("verify");
    }
  };

  const handleResendCode = async () => {
    setStep("sending");
    setLoadingPhase(0);
    try {
      await new Promise((r) => setTimeout(r, 2200));
      await api.post(
        "/auth/resend-code",
        { email: savedEmail },
        { withCredentials: true }
      );
      setStep("verify");
      toast.success(t("auth.codeResent"));
    } catch (err) {
      setVerifyError(err.response?.data?.message || t("auth.resendFailed"));
      setStep("verify");
    }
  };

  const verifyLoadingTexts = [
    t("auth.verifyingCode1"),
    t("auth.verifyingCode2"),
    t("auth.verifyingCode3"),
  ];

  const sendingLoadingTexts = [
    t("auth.sendingCode1"),
    t("auth.sendingCode2"),
    t("auth.sendingCode3"),
  ];

  const loadingTexts = step === "sending" ? sendingLoadingTexts : verifyLoadingTexts;

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">
      {/* ── LEFT: Form Section ── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">
        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
          <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">
          {/* SUCCESS STATE */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-8 anim-fadeup">
              {/* FIX: was solid blue box + blue icon (invisible) */}
              <div className="w-20 h-20 rounded-2xl bg-[#2C2DE0]/10 dark:bg-[#4F51FF]/20 flex items-center justify-center mb-5 anim-scalein">
                <CheckCircle2 size={40} className="text-[#2C2DE0] dark:text-[#8E90FF]" />
              </div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">
                {t("auth.accountVerified")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("auth.redirectingToLogin")}
              </p>
              <div className="mt-8 w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full bg-[#2C2DE0] dark:bg-[#4F51FF] rounded-full anim-progress" />
              </div>
            </div>
          )}

          {/* LOADING STATE (verifying or resending) */}
          {(step === "verifying" || step === "sending") && (
            <div className="flex flex-col items-center text-center py-12 anim-fadeup">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0]/20 dark:border-[#4F51FF]/30" />
                <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] dark:border-[#4F51FF] border-t-transparent animate-spin" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="absolute inset-0 m-auto text-[#2C2DE0] dark:text-[#8E90FF]">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white min-h-6 anim-textswap">
                {loadingTexts[loadingPhase]}
              </p>
              <div className="flex gap-1 mt-5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-[#2C2DE0] dark:bg-[#4F51FF] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* VERIFY FORM */}
          {step === "verify" && (
            <div className="anim-slidein">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.verifyEmailTitle")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.verifyEmailSubtitle")}
              </p>

              {/* Email badge — FIX: added background + readable text in both modes */}
              <div className="mt-5 flex items-center gap-2.5 bg-[#2C2DE0]/5 dark:bg-[#4F51FF]/10 border border-[#2C2DE0]/30 dark:border-[#4F51FF]/40 rounded-xl px-4 py-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-[#2C2DE0] dark:text-[#8E90FF] shrink-0">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                <span className="text-xs font-mono font-bold tracking-widest text-[#1E1FAA] dark:text-white break-all">
                  {savedEmail}
                </span>
              </div>

              {/* Error */}
              {verifyError && (
                <div className="mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 anim-fadeup">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{verifyError}</p>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("auth.verificationCodeLabel")}
                  </label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => { setVerifyCode(e.target.value); setVerifyError(""); }}
                    placeholder={t("auth.codePlaceholder")}
                    autoFocus
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all uppercase"
                  />
                  <p className="text-[11px] text-gray-400">{t("auth.codeHint")}</p>
                </div>

                {/* FIX: className was mangled (broken shadow/hover classes) */}
                <button
                  type="submit"
                  disabled={!verifyCode.trim() || step === "verifying"}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
                >
                  {step === "verifying"
                    ? <><Loader2 className="w-5 h-5 animate-spin" />{t("auth.verifyingCode")}</>
                    : <>{t("auth.verify")}<ArrowRight size={16} /></>
                  }
                </button>
              </form>

              {/* Resend */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {t("auth.didntReceiveCode")}
                </p>
                <button
                  onClick={handleResendCode}
                  disabled={step === "sending"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2C2DE0] dark:text-[#8E90FF] hover:underline disabled:opacity-50"
                >
                  {t("auth.resendCode")}
                </button>
              </div>

              {/* Back */}
              <button
                type="button"
                onClick={onBack}
                className="w-full mt-6 text-center text-xs text-gray-500 dark:text-gray-400 hover:text-[#2C2DE0] dark:hover:text-[#8E90FF] font-semibold transition-colors"
              >
                ← {t("auth.backToRegister")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Brand Panel — same as SignupPage ── */}
      <div className="hidden md:flex w-1/2 bg-black dark:bg-gray-950 flex-col justify-center items-center px-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2C2DE0]" />
        <div className="relative z-10 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#2C2DE0] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#2C2DE0]/30">
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
            {[{ n: "01", label: t("auth.signupSteps")[0] }, { n: "02", label: t("auth.signupSteps")[1] }, { n: "03", label: t("auth.signupSteps")[2] }].map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#2C2DE0] text-white text-[11px] font-black flex items-center justify-center shrink-0">{s.n}</span>
                <span className="text-sm text-gray-300 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-gray-500 dark:text-gray-400 italic text-sm">{t("auth.signupQuote")}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400 text-xs">{t("auth.signupQuoteAuthor")}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeup { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideout { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-36px); } }
        @keyframes slidein { from { opacity: 0; transform: translateX(36px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scalein { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes textswap { 0% { opacity: 0; transform: translateY(6px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }
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

export default VerifyEmailStep;