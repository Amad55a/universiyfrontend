import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";


const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { animate: { transition: { staggerChildren: 0.09 } } };

// ═══════════════════════════════════════════════════════════════════
// HERO — white bg in light mode, black in dark mode
// ═══════════════════════════════════════════════════════════════════
const Hero = ({ t }) => (
  <section className="relative w-full bg-white dark:bg-black" aria-label="Hero">



    {/* Green gradient glow — dark mode */}
    <div
      className="absolute inset-0 pointer-events-none hidden dark:block"
      style={{
        background: `
        radial-gradient(ellipse 1100px 550px at 50% -5%, rgba(99, 223, 78, 0.20) 0%, rgba(99, 223, 78, 0.08) 40%, rgba(0,0,0,0) 75%),
        linear-gradient(180deg, #000000 0%, #041505 45%, #000000 100%)
      `,
      }}
    />

    {/* Dot pattern — only shown in dark mode */}
    <div
      className="absolute inset-0 pointer-events-none hidden dark:block"
      style={{
        backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        opacity: 0.04,
      }}
    />

    <div className="relative w-full max-w-350 mx-auto px-6 lg:px-10 pt-36 pb-28 sm:pt-44 sm:pb-36 text-center">
      <motion.div variants={stagger} initial="initial" animate="animate">

        {/* Badge */}
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 mb-8">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2C2DE0]/40 bg-[#2C2DE0]/10 text-[#2C2DE0] text-[11px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[##2C2DE0] animate-pulse" style={{
              textShadow: "0 2px 0 #3FAF2E"
            }} />
            {t?.landing?.heroBadge || "University of Somalia — Official System"}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="
    text-4xl
    sm:text-5xl
    lg:text-6xl
    xl:text-7xl
    font-black
    leading-[1.2]
    tracking-tight
    text-black
    dark:text-white
  "
        >
          {t?.landing?.heroTitleFirst}{" "}

          <span
            className="font-black text-[#2C2DE0]  sm:[text-shadow:0_2px_0_#1E1FAA]
"

          >
            {t?.landing?.heroTitleHighlight}
          </span>{" "}

          {t?.landing?.heroTitleLast}
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          className="mt-7 text-base sm:text-lg text-black/60 dark:text-white/60 leading-relaxed max-w-2xl mx-auto"
        >
          {t?.landing?.heroDescription ||
            "Library · Exams · AI Assistant · Labs · Community — everything your university needs, unified in one intelligent platform built exclusively for UNISO students."}
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
        >
          {/* Primary — always green */}
          <Link
            to="/signup"
            className=" hidden lg:flex
              items-center
              px-5 py-3
              rounded-2xl
                bg-[#2C2DE0]
    text-white
    text-sm
    font-bold
    shadow-[0_4px_0_#1E1FAA]
    hover:translate-y-0.5
    hover:shadow-[0_2px_0_#1E1FAA]
    active:translate-y-1
    active:shadow-none
    transition-all
    duration-150    
              group"
          >
            {t?.landing?.createAccount || "Get Started — It's Free"}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Outline — adapts to mode */}
          <a
            href="#features"
            className="inline-flex items-center gap-1.5 px-7 py-3.5 rounded-xl border border-black/20 dark:border-white/20 text-sm font-semibold text-black dark:text-white hover:border-black/50 dark:hover:border-white/50 hover:bg-black/5 dark:hover:bg-white dark:bg-gray-900/5 transition-colors group"
          >
            {t?.landing?.exploreFeatures || "Explore Features"}
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-center gap-3 mt-14"
        >
          {[

            {
              value: "AI",
              label: t?.landing?.aiSupport || "AI Learning Support"
            },
            {
              value: "24/7",
              label: t?.landing?.access || "Digital Access"
            },
            {
              value: "4+",
              label: t?.landing?.services || "Integrated Services"
            },
            {
              value: "1",
              label: t?.landing?.platform || "Unified Platform"
            }

          ].map((s) => (
            <div
              key={s.label}
              className="px-5 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white dark:bg-gray-900/5"
            >
              <p className="text-xl font-black text-black dark:text-black">{s.value}</p>
              <p className="text-[10px] text-black/40 dark:text-black/40 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>


    </div>

  </section>
);

export default Hero;