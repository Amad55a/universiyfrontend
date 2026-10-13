// LandingFooter.jsx
import { Link } from "react-router-dom";
import { Mail, MapPin, BookOpen, FileText, Bot, Shield, LayoutDashboard, MonitorDown } from "lucide-react";
import UnicoreLogo from "./Logo";
import { useLanguage } from "@/hooks/useLanguage";

const LandingFooter = () => {
  const { t } = useLanguage() || {};

  const footerContent = t?.landing?.footer || {};
  const modules = [
    { icon: BookOpen, label: "Digital Library", to: "/contact" },
    { icon: FileText, label: "Online Examinations", to: "/examguard" },
    { icon: Bot, label: "AI Study Assistant", to: "/contact" },
    { icon: MonitorDown, label: "ExamGuard App", to: "/examguard" },
    { icon: LayoutDashboard, label: "Student Portal", to: "/signup" },
    { icon: Shield, label: "For Universities", to: "/pricing" },
  ];

  return (
    <footer
      className="w-full border-t border-black/10 dark:border-white/10 bg-white dark:bg-black"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      <div className="h-0.5 w-full bg-[#2C2DE0]" />

      <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-12 sm:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="lg:col-span-1">
          <UnicoreLogo size="md" />
          <p className="mt-4 text-sm text-black/50 dark:text-white/40 leading-relaxed max-w-xs">
            {footerContent.tagline || "UniCore is the digital campus experience for University of Somalia — bringing learning, resources, exams, and community together in one place."}
          </p>
          <div className="flex flex-col gap-2 mt-5">
            <a

              href="mailto:info@unicores.tech"
              className="flex items-center gap-2 text-sm text-black/50 dark:text-white/40 hover:text-[#2C2DE0] transition-colors">
              <Mail size={13} /> info@unicores.tech </a>
            <span className="flex items-center gap-2 text-sm text-black/50 dark:text-white/40">
              <MapPin size={13} />
              {t?.common?.university}, Mogadishu
            </span>
          </div>
        </div>
        {/* Quick links */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-4">
            {footerContent.quickLinks || "Quick Links"}
          </p>
          <ul className="flex flex-col gap-2.5">
            {[
              { label: t?.navbar?.home, to: "/" },
              { label: t?.navbar?.about, to: "/about" },
              { label: t?.navbar?.contact, to: "/contact" },
              { label: t?.navbar?.signIn, to: "/login" },
              { label: t?.navbar?.signUp, to: "/signup" },
            ].map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-black/50 dark:text-white/40 hover:text-[#2C2DE0] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Modules */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2C2DE0] mb-4">
            {t?.navbar?.modules}
          </p>
          <ul className="flex flex-col gap-2.5">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.to}>
                  <Link to={m.to} className="flex items-center gap-2 text-sm text-black/50 dark:text-white/40 hover:text-[#2C2DE0] transition-colors">
                    <Icon size={12} className="shrink-0" />
                    {m.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CTA card */}
        <div className="bg-[#2C2DE0] rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
              {footerContent.ctaEyebrow || "Get Started Now"}
            </p>
            <p className="text-sm font-black text-white leading-snug">
              {footerContent.ctaTitle || "Your UniCore account opens the door to university services from day one."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/signup"
              className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-bold text-center hover:opacity-80 transition-opacity"
            >
              {t?.navbar?.signUp}
            </Link>
            <Link
              to="/login"
              className="w-full py-2.5 rounded-xl border border-white/30 text-sm font-semibold text-white text-center hover:bg-white/10 transition-colors"
            >
              {t?.navbar?.signIn}
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="w-full border-t border-black/5 dark:border-white/5">
          <div className="w-full max-w-350 mx-auto px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-black/50 dark:text-white/30 text-center sm:text-left">
              © 2026 UNICORE — {t?.common?.university || "University of Somalia"}. {t?.footer?.allRightsReserved || footerContent.allRightsReserved || "All rights reserved."}
            </p>
            <span className="flex items-center gap-1.5 text-xs text-[#2C2DE0] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C2DE0] animate-pulse" />
              {t?.footer?.liveSystem || footerContent.liveSystem || "Live System"}
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default LandingFooter;