// ═══════════════════════════════════════════════════════════════════
// HOW HOW IT WORKS — Completely Dynamic & Updated Flow

import { ArrowRight, LayoutDashboard, UserPlus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";


// ═══════════════════════════════════════════════════════════════════
const HowItWorks = ({ t }) => {
  // Icons updated to reflect: 1. Register, 2. Verify/Role Choice, 3. Access Dashboard
  const steps = [
    {
      icon: UserPlus,
      title: t?.landing?.howItWorksSteps?.[0]?.title || "Create Your Account",
      desc: t?.landing?.howItWorksSteps?.[0]?.desc || "Register with Google or your email to secure your profile."
    },
    {
      icon: ShieldCheck,
      title: t?.landing?.howItWorksSteps?.[1]?.title || "Verify Your Identity",
      desc: t?.landing?.howItWorksSteps?.[1]?.desc || "Verify your University ID for full access, or continue as a Guest just to explore."
    },
    {
      icon: LayoutDashboard,
      title: t?.landing?.howItWorksSteps?.[2]?.title || "Access Your Dashboard",
      desc: t?.landing?.howItWorksSteps?.[2]?.desc || "Manage your courses, library logs, upcoming exams, and AI assistant all in one place."
    },
  ];

  return (
    <section className="w-full bg-gray-50 dark:bg-black" aria-label="How it works">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div className="w-full md:max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E1FAA]">
              {t?.landing?.sectionHowItWorks || "How It Works"}
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black text-black dark:text-white leading-tight">
              {t?.landing?.howItWorksTitle || "Up and running in three simple steps"}
            </h2>
          </div>

          <Link
            to="/seats"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 hover:opacity-90 shrink-0 group"
          >
            {t?.landing?.createAccount || "Create Account"}
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          <div className="grid gap-6 sm:grid-cols-3 sm:gap-8 lg:gap-10">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="w-full"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 flex items-center justify-center mb-6">
                    <Icon size={20} className="text-white" strokeWidth={2.5} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-black border border-[#2C2DE0]/50 flex items-center justify-center text-[9px] font-black text-[#2C2DE0]">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-black dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-black/60 dark:text-white/70 leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;