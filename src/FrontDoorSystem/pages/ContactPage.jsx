// Contact.jsx
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import {
  Mail, MapPin, Send, CheckCircle2,
  AlertCircle, Loader2, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import { Helmet } from "react-helmet-async";

const EMAILJS_SERVICE_ID = "service_n6brldi";
const EMAILJS_TEMPLATE_ID = "template_6rmubv2";
const EMAILJS_PUBLIC_KEY = "oRluPcuRY4e2qvnLs";

const TOPICS = [
  { value: "library", icon: "📚", labelKey: "Library & Books" },
  { value: "borrow", icon: "📖", labelKey: "Borrow / Return" },
  { value: "ai", icon: "🤖", labelKey: "AI Assistant" },
  { value: "exam", icon: "📝", labelKey: "Examinations" },
  { value: "forum", icon: "💬", labelKey: "Forum & Community" },
  { value: "account", icon: "👤", labelKey: "My Account" },
  { value: "technical", icon: "🔧", labelKey: "Technical Issue" },
  { value: "other", icon: "💡", labelKey: "Other" },
];

const Contact = () => {
  const { t } = useLanguage() || {};
  const { user } = useAuth?.() ?? {};
  const formRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.displayName || user?.name || "",
    email: user?.email || "",
    subject: "",
    topic: "",
    message: "",
  });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, formRef.current, EMAILJS_PUBLIC_KEY);
      setStatus("success");
      setForm({ name: "", email: "", subject: "", topic: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      console.error("EmailJS error:", err);
      setErrorMsg(t?.contact?.failed || "Failed to send. Please email us directly at info@unicores.tech");
      setStatus("error");
    }
  };

  const isLoading = status === "sending";

  const inputCls = "bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0] transition-all w-full";

  return (
    <div className="w-full dark:bg-black text-black dark:text-white">
      <Helmet>
        <title>Contact UniCORE | Request a Demo or Get Support</title>
        <meta
          name="description"
          content="Contact the UniCORE team to request a demo, ask a question, or get support. We reply within 24 hours."
        />
        <link rel="canonical" href="https://www.unicores.tech/contact" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.unicores.tech/contact" />
        <meta property="og:title" content="Contact UniCORE | Request a Demo or Get Support" />
        <meta
          property="og:description"
          content="Contact the UniCORE team to request a demo, ask a question, or get support. We reply within 24 hours."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact UniCORE | Request a Demo or Get Support" />
        <meta
          name="twitter:description"
          content="Contact the UniCORE team to request a demo, ask a question, or get support. We reply within 24 hours."
        />
      </Helmet>

      <section className="w-full bg-white dark:bg-black/90 relative overflow-hidden">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 pt-32 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2C2DE0]/30 bg-[#2C2DE0]/10 mb-7">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0]">
                {t?.contact?.eyebrow || "Get in Touch"}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black dark:text-white leading-[1.05]">
              {t?.contact?.titleBefore || "We're here to"}{" "}
              <span className="text-[#2C2DE0]" style={{ textShadow: "0 2px 0 #1E1FAA" }}>{t?.contact?.titleHighlight || "help you"}</span>
            </h1>
            <p className="mt-5 text-base text-black/50 dark:text-white/50 max-w-lg mx-auto leading-relaxed">
              {t?.contact?.intro ||
                "Have a question, a problem with your reservation, or feedback? Send us a message and we'll reply within 24 hours."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Topic quick-select ─────────────────────────────────── */}
      <section className="w-full max-w-350 mx-auto px-6 lg:px-10 py-8 bg-white dark:bg-black">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mb-4 text-center">
          {t?.contact?.selectTopic || "What is your message about?"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOPICS.map((tp) => (
            <button 
              key={tp.value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, topic: tp.value, subject: tp.labelKey }))}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.topic === tp.value
                  ? "bg-[#2C2DE0]/10 border-[#2C2DE0]/50 text-[#2C2DE0]"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-black/60 hover:border-[#2C2DE0]/30 bg-white dark:bg-white dark:bg-gray-900/4"
                }`}
            >
              <span>{tp.icon}</span>
              <span className="text-xs">{tp.labelKey}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <section className="w-full max-w-350 mx-auto px-6 lg:px-10 pb-20 grid md:grid-cols-5 gap-8 items-start">

        {/* ── Form ── */}
        <div className="md:col-span-3">
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/8 rounded-3xl p-7">
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-6">
              {t?.contact?.sendMessage || "Send a Message"}
            </h2>

            {status === "success" ? (
              <div className="flex flex-col items-center text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#2C2DE0]/10 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} className="text-[#2C2DE0]" />
                </div>
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {t?.contact?.messageSent || "Message sent!"}
                </p>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-2 max-w-xs">
                  {t?.contact?.messageSentSub || "We'll reply to your email within 24 hours."}
                </p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input type="hidden" name="topic" value={form.topic} />
                <input type="hidden" name="user_role" value={user?.role || "guest"} />
                <input type="hidden" name="user_id" value={user?.uid || ""} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">
                      {t?.common?.fullName || "Full Name"} <span className="text-red-400">*</span>
                    </label>
                    <input type="text" name="from_name" value={form.name} onChange={set("name")}
                      placeholder={t?.contact?.namePlaceholder || "Ahmed Ali"} required className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">
                      {t?.common?.email || "Email"} <span className="text-red-400">*</span>
                    </label>
                    <input type="email" name="from_email" value={form.email} onChange={set("email")}
                      placeholder={t?.contact?.emailPlaceholder || "ahmed@example.com"} required className={inputCls} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">
                    {t?.contact?.subject || "Subject"}
                  </label>
                  <input type="text" name="subject" value={form.subject} onChange={set("subject")}
                    placeholder={t?.contact?.subjectPlaceholder || "e.g. Reservation issue, Book request..."} className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">
                    {t?.contact?.message || "Message"} <span className="text-red-400">*</span>
                  </label>
                  <textarea name="message" value={form.message} onChange={set("message")}
                    placeholder={t?.contact?.messagePlaceholder || "Write your message here..."} rows={5} required
                    className={`${inputCls} resize-none`} />
                </div>

                {status === "error" && (
                  <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-500">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      {t?.contact?.sending || "Sending..."}
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      {t?.contact?.send || "Send Message"}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="md:col-span-2 flex flex-col gap-4">

          {/* Logged-in user badge */}
          {user && (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2C2DE0]/20 flex items-center justify-center text-[#2C2DE0] font-black text-sm shrink-0">
                {(user.displayName || user.name || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.displayName || user.name}</p>
                <p className="text-xs text-gray-400 dark:text-white/40">{user.email}</p>
              </div>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-[#2C2DE0]/10 text-[#2C2DE0] px-2 py-0.5 rounded-full border border-[#2C2DE0]/20">
                {user.role || "Student"}
              </span>
            </div>
          )}

          {/* Contact info */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-3xl p-6">
            <h2 className="text-sm font-black text-gray-900 dark:text-white mb-5">
              {t?.contact?.contactInfo || "Contact Info"}
            </h2>
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Mail,
                  label: t?.common?.email || "Email",
                  content: <a href="mailto:info@unicores.tech" className="text-sm text-gray-700 dark:text-gray-300 font-medium hover:text-[#2C2DE0] transition-colors">info@unicores.tech</a>,
                },
                {
                  icon: MapPin,
                  label: t?.contact?.location || "Location",
                  content: <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t?.common?.university || "University of Somalia"}<br />Mogadishu, Somalia</p>,
                },
                {
                  icon: Clock,
                  label: t?.contact?.responseTime || "Response Time",
                  content: <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t?.contact?.within24 || "Within 24 hours"}</p>,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#2C2DE0]/10 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-[#2C2DE0]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mb-0.5">{item.label}</p>
                      {item.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-3xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mb-3">
              {t?.contact?.quickLinks || "Quick Links"}
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { icon: "📚", label: t?.contact?.links?.library || "Browse Library", link: "/library" },
                { icon: "📝", label: t?.contact?.links?.exams || "My Exams", link: "/exams" },
                { icon: "💬", label: t?.contact?.links?.forum || "Community Forum", link: "/forum" },
                { icon: "📊", label: t?.contact?.links?.dashboard || "My Dashboard", link: "/dashboard" },
              ].map((item) => (
                <a key={item.label} href={item.link}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/50 hover:text-[#2C2DE0] transition-colors py-0.5">
                  <span>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Urgent note */}
          <div className="bg-[#2C2DE0]/8 border border-[#2C2DE0]/20 rounded-3xl p-5">
            <p className="text-xs font-bold text-[#2C2DE0] mb-1.5">
              {t?.contact?.urgentTitle || "For urgent issues"}
            </p>
            <p className="text-xs text-gray-600 dark:text-[#2C2DE0]/70 leading-relaxed">
              {t?.contact?.urgentBody || "If your reservation is broken or you cannot access your account, visit the library desk in person during operating hours:"}
              <span className="font-bold block mt-1">{t?.contact?.hoursDaily || "7:00 AM – 5:00 PM, every day."}</span>
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Contact;