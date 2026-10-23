import { useState } from "react";
import {
  Armchair, QrCode, CalendarCheck, GraduationCap, BookOpen, Users,
  CheckCircle2, ArrowRight, ChevronDown,
} from "lucide-react";
import useLanguage from "@/hooks/useLanguage";

// Icons + fallback copy live here; the actual display text always comes
// from the translation files (t.dashboard.tutorial…) so the component
// works for both en.js and so.js without any text hardcoded per-language.
// If a key is missing from the translation file yet, the English fallback
// below is shown so nothing ever renders blank.
const STEP_ICONS = [Armchair, QrCode, CalendarCheck, GraduationCap, BookOpen, Users];

const STEP_FALLBACKS = [
  {
    title: "Reserve a seat",
    desc: "Open Seats in the sidebar and tap the seat you want. A window opens: first choose how long you need it (30 min, 1h, 1.5h, or 2h), then pick a time slot. Slots you can't tap are already taken or in the past — the library is open 7:00 AM to 5:00 PM.",
    tip: "Grayed-out time buttons just mean that slot isn't available anymore.",
  },
  {
    title: "Get your QR code & ID",
    desc: "Confirm your slot and we generate a QR code and a manual ID for that reservation right away.",
    tip: "You can only hold one active reservation at a time.",
  },
  {
    title: "Check in when you arrive",
    desc: "At the library, open My Reservations in the sidebar and show your QR code or ID to check into your seat.",
    tip: "Keep My Reservations open on your phone as you walk in.",
  },
  {
    title: "Take an exam",
    desc: "Get your exam token from your teacher first. Then open E-exam in the sidebar, enter the token, and start the exam.",
    tip: "Without a token from your teacher, the exam won't start.",
  },
  {
    title: "Read from the e-library",
    desc: "Open Library, search for the book you want, and tap Read. Pages are protected — no copying text and no photographing the screen. Stuck on something? Use the AI helper on the page and ask it to explain.",
    tip: "The AI helper only explains what's on the page you're reading.",
  },
  {
    title: "Post, chat, and join lectures",
    desc: "Open Community to see posts from other students, comment and like, message your chats, and join a lecture meeting when one is happening.",
    tip: "Meetings for a lecture show up right inside Community.",
  },
];

const StepCard = ({ step, index, isLast }) => {
  const [open, setOpen] = useState(index === 0);
  const Icon = STEP_ICONS[index];
  const { t } = useLanguage();
  const tut = t?.dashboard?.tutorial;

  return (
    <div className="relative flex gap-3 sm:gap-5 w-full min-w-0">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#2C2DE0] flex items-center justify-center shadow-sm shadow-[#2C2DE0] dark:shadow-none shrink-0">
          <Icon size={18} className="text-white" strokeWidth={2} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-linear-to-b from-[#2C2DE0] dark:from-[#4F51FF] to-transparent mt-2 min-h-[32px]" />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-6 sm:pb-8">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-start justify-between gap-3 text-left group"
        >
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2C2DE0] dark:text-[#8E90FF] block mb-1">
              {tut?.stepLabel || "Step"} {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight wrap-break-word">
              {step.title}
            </h3>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed wrap-break-word">
              {step.desc}
            </p>
            <div className="flex items-start gap-2.5 w-full bg-[#2C2DE0]/5 dark:bg-[#4F51FF]/10 border border-[#2C2DE0]/15 dark:border-[#4F51FF]/30 rounded-xl px-3.5 py-3">
              <CheckCircle2 size={13} className="text-[#2C2DE0] dark:text-[#8E90FF] shrink-0 mt-0.5" />
              <p className="text-xs text-[#1E1FAA] dark:text-[#B4B6FF] leading-relaxed wrap-break-word min-w-0">
                {step.tip}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TutorialSection = () => {
  const { t } = useLanguage();
  const tut = t?.dashboard?.tutorial;

  const steps = STEP_FALLBACKS.map((fallback, i) => ({
    title: tut?.steps?.[i]?.title || fallback.title,
    desc: tut?.steps?.[i]?.desc || fallback.desc,
    tip: tut?.steps?.[i]?.tip || fallback.tip,
  }));

  return (
    // Phones: full width with a small edge gutter; larger screens get the roomier padding
    <section className="w-full max-w-full overflow-x-hidden mt-8 sm:mt-10 px-3 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
        <div className="md:sticky md:top-24 w-full min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {tut?.eyebrow || "How it works"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight whitespace-pre-line wrap-break-word">
            {tut?.heading || "Everything you can do,\nstep by step"}
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm leading-relaxed w-full sm:max-w-sm">
            {tut?.intro || "Reserve a seat, sit an exam, read a book, or catch up with your class — here's exactly how each one works."}
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6 sm:mt-8 w-full">
            {[
              { value: "< 1 min", label: tut?.stats?.[0] || "To reserve a seat" },
              { value: "40", label: tut?.stats?.[1] || "Study seats" },
              { value: "Free", label: tut?.stats?.[2] || "For students" },
            ].map((s) => (
              <div
                key={s.value}
                className="min-w-0 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl px-2 sm:px-3 py-3 text-center"
              >
                <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white whitespace-nowrap">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium wrap-break-word">{s.label}</p>
              </div>
            ))}
          </div>

          <a
            href="/seats"
            className="mt-6 sm:mt-8 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2C2DE0] text-white text-sm font-bold px-5 py-3 rounded-xl
              shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA]
              active:translate-y-1 active:shadow-none transition-all duration-150 group"
          >
            {tut?.cta || "Reserve your seat"}
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Steps card: tighter padding on phones so content uses the full width */}
        <div className="w-full min-w-0 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl px-4 sm:px-6 pt-6 sm:pt-7 pb-2 shadow-sm">
          {steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const DashboardFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full max-w-6xl mx-auto mt-12 sm:mt-16 px-3 sm:px-6 pb-8">
      <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Uniso Digital Library · {t.dashboard.footerRights}
        </p>
        <p className="text-xs text-gray-400">
          {t.dashboard.footerBuilt}
        </p>
      </div>
    </footer>
  );
};