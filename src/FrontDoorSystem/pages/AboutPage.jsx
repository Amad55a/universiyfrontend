// About.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Calendar, Users, Brain,
  ArrowRight, CheckCircle2, Code2, Flame, Server, Globe,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Helmet } from "react-helmet-async";


const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const About = () => {
  const { t } = useLanguage() || {};

  const pillars = [
    {
      icon: Calendar,
      title: t?.landing?.features?.[0]?.title || "Seat Reservation",
      desc: t?.landing?.features?.[0]?.desc || "Reserve your library seat before you arrive. Choose any time slot and walk in guaranteed.",
    },
    {
      icon: BookOpen,
      title: t?.landing?.features?.[1]?.title || "E-Library & Academic Resources",
      desc: t?.landing?.features?.[1]?.desc || "Thousands of textbooks, past exams, and research papers with powerful full-text search.",
    },
    {
      icon: Brain,
      title: t?.landing?.features?.[2]?.title || "AI-Powered Book Summaries",
      desc: t?.landing?.features?.[2]?.desc || "Summarize any book or document instantly with AI — paste text or upload a PDF.",
    },
    {
      icon: Users,
      title: t?.landing?.features?.[3]?.title || "Fair Access for Everyone",
      desc: t?.landing?.features?.[3]?.desc || "One active reservation per student keeps the system fair for the entire community.",
    },
  ];



  const stats = [
    { value: "1,200+", label: t?.about?.digitalBooks || "Digital Books" },
    { value: "500+",   label: t?.about?.students     || "Students" },
    { value: "40",     label: t?.about?.studySeats   || "Study Seats" },
    { value: "24/7",   label: t?.about?.onlineAccess || "Online Access" },
  ];

  const values = t?.about?.values || [
    "Built exclusively for University of Somalia students and staff.",
    "Real-time seat availability updated continuously.",
    "AI tools that support learning, not replace it.",
    "Transparent reservation rules enforced automatically.",
    "Mobile-friendly and works on any phone or laptop.",
    "Free for all enrolled students.",
  ];

  const modules = [
    { icon: "📚", label: t?.about?.modules?.library   || "Library",        to: "/library" },
    { icon: "📖", label: t?.about?.modules?.borrow    || "Book Borrowing",  to: "/borrow" },
    { icon: "🤖", label: t?.about?.modules?.ai        || "AI Assistant",    to: "/ai" },
    { icon: "📝", label: t?.about?.modules?.exams     || "Examinations",    to: "/exams" },
    { icon: "💬", label: t?.about?.modules?.forum     || "Forum",           to: "/forum" },
  ];

  return (
    <div className="w-full dark:bg-black text-black dark:text-white">
       <Helmet>
        <title>About UniCORE | University Management Platform</title>
        <meta
          name="description"
          content="Learn about UniCORE, the university management and learning platform built to connect students, teachers, and administrators in one intelligent system."
        />
        <link rel="canonical" href="https://www.unicores.tech/about" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.unicores.tech/about" />
        <meta property="og:title" content="About UniCORE | University Management Platform" />
        <meta
          property="og:description"
          content="Learn about UniCORE, the university management and learning platform built to connect students, teachers, and administrators in one intelligent system."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About UniCORE | University Management Platform" />
        <meta
          name="twitter:description"
          content="Learn about UniCORE, the university management and learning platform built to connect students, teachers, and administrators in one intelligent system."
        />
      </Helmet>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="w-full bg-white dark:bg-black/90 relative overflow-hidden">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 pt-32 pb-20 text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0]">
                {t?.about?.eyebrow || "About the System"}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black dark:text-white leading-[1.05] tracking-tight">
              {t?.about?.titleBefore || "Built for"}{" "}
              <span className="text-[#2C2DE0] sm:[text-shadow:0_2px_0_#1E1FAA]">
                {t?.about?.titleHighlight || "University of Somalia"}
              </span>{" "}
              {t?.about?.titleAfter || "Students"}
            </h1>
            <p className="mt-6 text-base text-black dark:text-white max-w-2xl mx-auto leading-relaxed">
              {t?.about?.intro ||
                "UniCORE is a university management and learning platform that combines seat reservation, digital library access, AI-powered learning tools, online examinations, and community collaboration — all in one place."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section className="w-full bg-white dark:bg-black border-b border-gray-200 dark:border-white/8">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-3xl font-black text-[#2C2DE0]">{s.value}</p>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/40 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────── */}
      <section className="w-full max-w-350 mx-auto px-6 lg:px-10 py-20 sm:py-24 grid md:grid-cols-2 gap-14 items-center">
        {/* Visual block */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black p-8 aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-lg font-black text-gray-900 dark:text-white">UniCORE Platform</p>
              <p className="text-sm text-gray-500 dark:text-white/40 mt-1">Mogadishu, Somalia</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4  rounded-2xl px-5 py-3  shadow-[#2C2DE0]/30 bg-[#2C2DE0]
              text-white
              text-sm
              font-bold
              shadow-[0_4px_0_#1E1FAA]
              hover:translate-y-0.5
              hover:shadow-[0_2px_0_#1E1FAA]
              active:translate-y-1
              active:shadow-none
              transition-all
              duration-150" >
            <p className="text-2xl font-black">1,200+</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider">
              {t?.about?.digitalBooks || "Digital Books"}
            </p>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-3">
            {t?.about?.missionEyebrow || "Our Mission"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {t?.about?.missionTitle || "Simplifying the path between you and knowledge"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-5 leading-relaxed text-sm">
            {t?.about?.missionBody1 ||
              "Wasting hours finding a seat, searching for books, or struggling with difficult texts can be frustrating. We built UniCORE to eliminate these obstacles so you can focus entirely on learning."}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-3 leading-relaxed text-sm">
            {t?.about?.missionBody2 ||
              "While this started as a final-year graduation project, our mission goes far beyond earning a degree. We designed a real, fully-functional system to bring a modern learning experience to our university."}
          </p>
        </motion.div>
      </section>

      {/* ── System features ──────────────────────────────────────── */}
      <section className="w-full bg-gray-50 dark:bg-black">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-20 sm:py-24">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-gray-200 dark:bg-black" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              {t?.about?.featuresTitle || "System Features"}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-black" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-2xl p-5 hover:border-[#2C2DE0]/25 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-xl dark:bg-black flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[#2C2DE0]" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white text-sm">{p.title}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

  

      {/* ── Values ───────────────────────────────────────────────── */}
      <section className="w-full bg-gray-50 dark:bg-black">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-20 sm:py-24">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-3xl p-8 md:p-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-3">
              {t?.about?.commitmentsEyebrow || "Our Commitments"}
            </p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">
              {t?.about?.commitmentsTitle || "What you can expect"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {values.map((v, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={15} className="text-[#2C2DE0] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── System Modules ───────────────────────────────────────── */}
      <section className="w-full max-w-350 mx-auto px-6 lg:px-10 py-20 sm:py-24">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {t?.about?.systemModules || "System Modules"}
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link
              key={m.label}
              to={m.to}
              className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-2xl p-4 hover:border-[#2C2DE0]/30 hover:bg-white dark:hover:bg-white dark:bg-gray-900/8 hover:shadow-md transition-all group"
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#2C2DE0] transition-colors">
                {m.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="w-full dark:bg-black">
        <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-20 sm:py-24 text-center">
          <h2 className="text-3xl font-black text-black dark:text-white leading-tight">
            {t?.about?.ctaTitle || "Ready to get started?"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm max-w-sm mx-auto">
            {t?.about?.ctaDescription || "Create your account and reserve your first seat in under two minutes."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              to="/signup"
              className="flex items-center gap-2 bg-[#2C2DE0]
              text-white
              text-sm
              font-bold
              shadow-[0_4px_0_#1E1FAA]
              hover:translate-y-0.5
              hover:shadow-[0_2px_0_#1E1FAA]
              active:translate-y-1
              active:shadow-none
              transition-all
              duration-150 hover:bg-[#4F51FF]  dark:text-white leading-tight  px-7 py-3 rounded-xl  group"
            >
              {t?.auth?.createAccountButton || "Create Account"}
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-white transition-colors"
            >
              {t?.about?.alreadyHaveAccount || "Already have an account? Sign in"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;