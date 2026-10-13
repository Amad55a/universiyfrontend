// src/components/LandingHeader.jsx
// i18n pass on top of previous fixes:
//  - Every remaining hardcoded string (mega-menu item descriptions, the
//    mega-menu intro paragraph, and all aria-labels) now reads from `t`
//    with the old English copy kept as the fallback, so nothing breaks
//    until en.js / so.js are updated. See the bottom of this file's
//    accompanying chat message for the full list of new keys to add.
//  - Everything else (dark mode default, isLight logic, dedup'd
//    classNames, h-14 header, blue palette, mobile drawer fix) is
//    unchanged from the previous pass.

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu, X, ChevronDown, Globe, Check,
  BookOpen, Search, Archive,
  GraduationCap, ClipboardList, FileText,
  Users, Presentation, LayoutDashboard,
  Bot, Sparkles, Moon, Sun,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import UnicoreLogo from "./Logo";

const languages = [
  { code: "en", label: "English", native: "English" },
  { code: "so", label: "Somali", native: "Soomaali" },
];

const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("unicore_theme");
    if (saved) return saved === "dark";
    return false;
  });

  // useLayoutEffect (not useEffect) so this runs synchronously right after
  // the DOM is committed but BEFORE the browser paints. useEffect runs after
  // paint, which is what caused the "flash light, then flip to dark" jump.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("unicore_theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark];
};

const getMegaMenuSections = (t) => [
  {
    title: t?.modules?.digitalLearning || "Digital Learning",
    items: [
      { icon: Presentation, label: t?.modules?.eLearning || "E-Learning Platform", desc: t?.modules?.eLearningDesc || "Interactive digital courses for every learner" },
      { icon: ClipboardList, label: t?.modules?.courses || "Courses Management", desc: t?.modules?.coursesDesc || "Browse and manage curriculum & content" },
      { icon: FileText, label: t?.modules?.exams || "Online Examinations", desc: t?.modules?.examsDesc || "Secure, convenient online exams" },
    ],
  },
  {
    title: t?.modules?.libraryServices || "Library Services",
    items: [
      { icon: BookOpen, label: t?.modules?.library || "Digital Library", desc: t?.modules?.libraryDesc || "Access thousands of resources anytime" },
      { icon: Search, label: t?.modules?.bookSearch || "Book Search", desc: t?.modules?.bookSearchDesc || "Powerful catalog search" },
      { icon: Archive, label: t?.modules?.bookReservation || "Book Reservation", desc: t?.modules?.bookReservationDesc || "Reserve and borrow physical & digital books" },
    ],
  },
  {
    title: t?.modules?.community || "Community",
    items: [
      { icon: LayoutDashboard, label: t?.modules?.dashboard || "Personal Dashboard", desc: t?.modules?.dashboardDesc || "Your courses, library activity & progress" },
      { icon: Users, label: t?.modules?.collaboration || "Collaboration Spaces", desc: t?.modules?.collaborationDesc || "Connect and work together with peers" },
      { icon: GraduationCap, label: t?.modules?.academic || "Academic Records", desc: t?.modules?.academicDesc || "Track grades, schedules & milestones" },
    ],
  },
  {
    title: t?.modules?.aiSystem || "AI System",
    items: [
      { icon: Bot, label: t?.modules?.aiAssistant || "AI Assistant", desc: t?.modules?.aiAssistantDesc || "24/7 intelligent support for everyone" },
      { icon: Sparkles, label: t?.modules?.smartSearch || "Smart Search", desc: t?.modules?.smartSearchDesc || "Semantic, context-aware search" },
    ],
  },
];

const MegaMenu = ({ t }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.18 }}
    className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[min(90vw,53.75rem)] z-100"
  >
    <div className="h-0.5 bg-[#2C2DE0]" />
    <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-b-2xl shadow-2xl p-6">
      <p className="text-[12px] text-black/40 dark:text-white/40 mb-5 max-w-2xl leading-relaxed">
        {t?.modules?.megaDescription || "UNICORE unifies library, AI learning, online examinations, and community into one intelligent university system."}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {getMegaMenuSections(t).map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2C2DE0] mb-3">{section.title}</p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <a href="#" className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-[#2C2DE0]/10 border border-[#2C2DE0]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={14} className="text-[#2C2DE0]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-black dark:text-white leading-tight">{item.label}</p>
                        <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">{item.desc}</p>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const LanguageSwitcher = ({ lang, setLang, isLightPage, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = languages.find((l) => l.code === lang) || languages[0];
  const btnCls = isLightPage
    ? "border-black/15 text-black/60 hover:text-black hover:border-black/30"
    : "border-white/20 text-white/70 hover:text-white hover:border-white/40";

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t?.aria?.changeLanguage || "Change language"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${btnCls} ${open ? "border-[#2C2DE0]!" : ""}`}
      >
        <Globe size={14} className={open ? "text-[#2C2DE0]" : ""} />
        {current.code.toUpperCase()}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180 text-[#2C2DE0]" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 w-52 z-100"
          >
            <div className="h-0.5 bg-[#2C2DE0]" />
            <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-b-2xl shadow-2xl py-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="flex flex-col items-start">
                    <span className="font-semibold">{l.native}</span>
                    <span className="text-black/30 dark:text-white/30 text-[10px]">{l.label}</span>
                  </span>
                  {lang === l.code && <Check size={14} className="text-[#2C2DE0]" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LandingHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() =>
    typeof window === "undefined" ? false : window.scrollY > 16
  );
  const [dark, setDark] = useDarkMode();
  const { t, language, setLanguage } = useLanguage() || {};
  const { pathname } = useLocation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => { setMenuOpen(false); setMegaOpen(false); }, [pathname]);

  const navLinks = [
    { label: t?.navbar?.home || "Home", to: "/" },
    { label: t?.navbar?.about || "About", to: "/about" },
    { label: t?.navbar?.contact || "Contact", to: "/contact" },
  ];

  const isLight = !dark;

  const headerBg = scrolled
    ? "bg-white dark:bg-black border-b border-black/10 dark:border-white/10 shadow-sm"
    : "bg-transparent";

  const textIdle = isLight
    ? "text-black/60 hover:text-black hover:bg-black/5"
    : "text-white/70 hover:text-white hover:bg-white/8";

  const textActive =
    "text-white font-bold bg-[#2C2DE0] text-sm shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
        <div className="w-full max-w-350 mx-auto px-4 sm:px-6 lg:px-10 h-14 flex items-center gap-4 lg:gap-6">

          <Link to="/" className="shrink-0 min-w-0">
            <UnicoreLogo size="md" isLight={isLight} />
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === link.to ? textActive : textIdle}`}
              >
                {link.label}
              </Link>
            ))}

            <div
              className="relative py-2"
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                {t?.navbar?.modules || "Modules"}
                <ChevronDown size={14} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>{megaOpen && <MegaMenu t={t} />}</AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <LanguageSwitcher lang={language || "en"} setLang={setLanguage || (() => { })} isLightPage={isLight} t={t} />

            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label={t?.aria?.toggleDarkMode || "Toggle dark mode"}
              className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-lg border transition-colors ${
                isLight
                  ? "border-black/15 text-black/50 hover:text-black hover:border-black/30"
                  : "border-white/20 text-white/50 hover:text-white hover:border-white/40"
              }`}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <Link
              to="/login"
              className={`hidden lg:flex items-center px-4 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${isLight
                ? "border-black/20 text-black hover:bg-black/5"
                : "border-white/20 text-white hover:bg-white/8"
                }`}
            >
              {t?.navbar?.signIn || "Sign In"}
            </Link>

            <Link
              to="/signup"
              className="hidden lg:flex items-center px-4 py-2 rounded-2xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
            >
              {t?.navbar?.signUp || "Sign Up"}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t?.aria?.openMenu || "Open menu"}
              className={`lg:hidden w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${isLight
                ? "border-black/15 text-black/70 hover:bg-black/5"
                : "border-white/15 text-white/80 hover:bg-white/10"
                }`}
            >
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="dr"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 right-0 bottom-0 z-61 w-[min(85vw,22rem)] flex flex-col lg:hidden bg-white dark:bg-black border-l border-black/10 dark:border-white/10"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-black/10 dark:border-white/10">
                <UnicoreLogo size="sm" />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDark((d) => !d)}
                    aria-label={t?.aria?.toggleDarkMode || "Toggle dark mode"}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label={t?.aria?.closeMenu || "Close menu"}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 pt-4">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${(language || "en") === l.code
                      ? "bg-[#2C2DE0]/10 border-[#2C2DE0]/40 text-[#2C2DE0]"
                      : "border-black/15 dark:border-white/15 text-black/50 dark:text-white/50"
                      }`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>

              <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}

                <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30">
                  {t?.navbar?.modules || "Modules"}
                </p>

                {getMegaMenuSections(t).map((section) =>
                  section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href="#"
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <Icon size={14} className="text-[#2C2DE0] shrink-0" />
                        {item.label}
                      </a>
                    );
                  })
                )}
              </nav>

              <div className="p-4 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-3 rounded-xl border border-black/20 dark:border-white/20 text-sm font-semibold text-black dark:text-white text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {t?.navbar?.signIn || "Sign In"}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-xl text-white text-sm font-bold text-center px-5 py-3 bg-[#2C2DE0] shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
                >
                  {t?.navbar?.signUp || "Sign Up"}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingHeader;