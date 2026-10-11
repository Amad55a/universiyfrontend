import { Eye, EyeOff, ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import UnicoreLogo from "@/FrontDoorSystem/components/Logo";
import api from "@/api/client";
import { buildGoogleAuthUrl } from "@/api/baseUrl";
import GoogleOneTap from "@/components/GoogleOneTap";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";

// ─── Duolingo-style Google button ────────────────────────────────────────────

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

// ─── LoginPage ────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Rotate loading text
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 850);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    const clear = () => setFormData({ email: "", password: "" });
    clear();
    window.addEventListener("pageshow", clear);
    return () => window.removeEventListener("pageshow", clear);
  }, []);

  useEffect(() => {
    const message = location.state?.accountStatusMessage;
    if (!message) return;
    toast.error(message);
    navigate("/login", { replace: true, state: null });
  }, [location.state, navigate]);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submitLogin = async () => {
    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Please complete the human verification.");
      return;
    }

    setLoading(true);
    setLoadingPhase(0);

    try {
      const response = await api.post(
        "/auth/login",
        { ...formData, turnstileToken: captchaToken, captchaToken },
        { withCredentials: true }
      );

      toast.success(t("auth.welcomeToast"));
      setFormData({ email: "", password: "" });

      const userData = response.data?.data?.user ?? response.data?.user;
      login(userData);

      if (userData?.role === "admin") navigate("/admin/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
      const message = err.response?.data?.message || t("auth.loginFailed");
      toast.error(message);

      if (err.response?.status === 403) {
        navigate("/verify-code", { state: { email: formData.email } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error(t("auth.fillAllFields"));
      return;
    }

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Please complete the human verification.");
      return;
    }

    await submitLogin();
  };

  const handleGoogle = () => {
    const apiBase = buildGoogleAuthUrl(
      import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? ""
    );
    window.location.href = apiBase;
  };

  const loadingTexts = [
    t("auth.signingInPhase1"),
    t("auth.signingInPhase2"),
    t("auth.signingInPhase3"),
  ];

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">

      {/* ── Google One Tap (invisible, shows browser-native popup) ─────────── */}
      <GoogleOneTap />

      {/* ── LEFT: Form (50%) ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-16 min-h-screen">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-10 group">
          <UnicoreLogo />
        </Link>

        <div className="w-full max-w-sm">

          {/* ── LOADING STATE (replaces form area) ────────────────────────── */}
          {loading && (
            <div className="rounded-3xl border border-[#2C2DE0]/15 bg-[#2C2DE0]/5 p-8 shadow-[0_18px_45px_rgba(44,45,224,0.12)] dark:border-[#2C2DE0]/25 dark:bg-[#2C2DE0]/10 anim-fadeup">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0]/30 dark:border-[#2C2DE0]/40" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#2C2DE0] border-t-transparent animate-spin" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    className="absolute inset-0 m-auto text-[#2C2DE0]">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
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

          {/* ── FORM (hidden while loading) ───────────────────────────────── */}
          {!loading && (
            <div className="anim-fadeup">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {t("auth.welcomeBack")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("auth.loginSubtitle")}
              </p>

              {/* ── Duolingo-style Google button ─────────────────────────── */}
              <GoogleAuthButton
                onClick={handleGoogle}
                label={t("auth.continueGoogle")}
              />

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">
                  {t("auth.divider")}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-4">

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.email")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t("auth.emailPlaceholder")}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("common.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t("auth.passwordPlaceholder")}
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
                </div>

                <div className="flex justify-end -mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0] font-semibold hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <TurnstileCaptcha
                  key={captchaResetKey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />



                {/* ── Duolingo-style submit button ─────────────────────── */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
                >
                  {t("auth.signIn")}
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

              </form>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                {t("auth.noAccount")}{" "}
                <Link to="/signup" className="text-[#2C2DE0] dark:text-[#2C2DE0] font-semibold hover:underline">
                  {t("auth.createOne")}
                </Link>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── RIGHT: Brand panel (50%) ──────────────────────────────────────────── */}
      <div className="hidden md:flex w-1/2 bg-black dark:bg-gray-950 flex-col justify-center items-center px-14 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
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

          <h2 className="text-2xl font-black text-white leading-tight">
            {t("auth.sideTitle")}
          </h2>

          <p className="text-gray-400 mt-4 text-sm leading-relaxed">
            {t("auth.sideDescription")}
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {(t("auth.sideFeatures") || []).map((f) => (
              <span key={f} className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-[11px] font-semibold text-gray-300">
                {f}
              </span>
            ))}
          </div>

          <p className="mt-10 text-gray-500 dark:text-gray-400 italic text-sm">
            {t("auth.quote")}
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-400 text-xs">{t("auth.quoteAuthor")}</p>
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

export default LoginPage;