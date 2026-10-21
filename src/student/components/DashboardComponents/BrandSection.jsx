// HeroWelcome.jsx
// Orchestrator only — every visual concern lives in its own file.
// Business logic untouched: still reads useAuth / useLanguage, still
// routes to the same /seats, /verify-university-id, /e-library paths,
// still takes the same streak/dailyGoal/completedToday/classLabel props.
//
// New: real time-of-day atmosphere, a mascot engine with ambient + user
// driven events, a backend-synced clock, entrance confetti, and secret
// easter eggs — all data-driven, nothing fake.

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

import HeroBackground from "./HeroBacgrounds";
import { AmbientParticles, ConfettiBurst } from "./HeroParticles";
import HeroMascots from "./heromoscots";
import HeroGreeting from "./herosgreetin";
import HeroClock from "./heroclock";
import HeroStats from "./herostats";
import { HeroCTAs, AssistantSuggestions } from "./heroactions";
import { FireworksOverlay, NotificationPulse, PartyModeOverlay } from "./Heroeffects";
import { HeroAnimationStyles } from "./Heroanimations";
import { useServerClock, useTimeOfDay, useMascotEvents, useReducedMotion, usePageVisible, useEasterEgg } from "./HeroHooks";
import { AMBIENT_EVENTS, PERIOD_TO_ATMOSPHERE } from "./HeroEvents";

const HeroWelcome = ({
  streak = 0,
  dailyGoal = 3,
  completedToday = 0,
  classLabel,
  hasNewReservation = false,
  reservationExpired = false,
  isVerified = false,
  notificationCount = 0,
  fetchServerTime, // optional: () => Promise<isoString>
  initialServerTime, // optional: initial server time to avoid trusting local clock on first render
  libraryOpensAt, // optional: minutes since midnight
  libraryClosesAt, // optional: minutes since midnight
}) => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const firstName = user?.name?.split(" ")[0] || t?.hero?.fallbackName || "there";
  const isGuest = user?.role === "guest";
  const resolvedClassLabel = "UniCORE Student";

  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisible();
  const now = useServerClock(fetchServerTime, initialServerTime);
  const { period } = useTimeOfDay(now);
  const atmosphere = PERIOD_TO_ATMOSPHERE[period] || "sunny";

  const { activeEvent, trigger } = useMascotEvents(AMBIENT_EVENTS, { minMs: 20_000, maxMs: 60_000 });
  const { partyMode, registerClick } = useEasterEgg();

  const [noteVisible, setNoteVisible] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showNotificationPulse, setShowNotificationPulse] = useState(false);
  const prevNotifCount = useRef(notificationCount);
  const prevVerified = useRef(isVerified);
  const prevStreak = useRef(streak);

  // Entrance: confetti for ~1.6s, note holds for ~4.2s then folds away.
  useEffect(() => {
    const confettiTimer = window.setTimeout(() => setShowConfetti(false), 1600);
    const noteTimer = window.setTimeout(() => setNoteVisible(false), 4200);
    return () => {
      window.clearTimeout(confettiTimer);
      window.clearTimeout(noteTimer);
    };
  }, []);

  // Real user-state reactions — fired only when underlying data changes.
  useEffect(() => {
    if (streak > prevStreak.current) trigger("user-streak-up");
    prevStreak.current = streak;
  }, [streak, trigger]);

  useEffect(() => {
    if (isVerified && !prevVerified.current) {
      trigger("user-account-verified");
      setShowFireworks(true);
      window.setTimeout(() => setShowFireworks(false), 1500);
    }
    prevVerified.current = isVerified;
  }, [isVerified, trigger]);

  useEffect(() => {
    if (notificationCount > prevNotifCount.current) {
      trigger("user-notification-arrived");
      setShowNotificationPulse(true);
      window.setTimeout(() => setShowNotificationPulse(false), 2600);
    }
    prevNotifCount.current = notificationCount;
  }, [notificationCount, trigger]);

  useEffect(() => {
    if (hasNewReservation) trigger("user-reservation-created");
  }, [hasNewReservation, trigger]);

  useEffect(() => {
    if (reservationExpired) trigger("user-reservation-expired");
  }, [reservationExpired, trigger]);

  const greetingLine =
    period === "morning"
      ? (t?.hero?.morning || "Good morning,")
      : period === "afternoon"
        ? (t?.hero?.afternoon || "Good afternoon,")
        : period === "evening"
          ? (t?.hero?.evening || "Good evening,")
          : (t?.hero?.night || "Good evening,");

  const suggestions = [
    { id: "reserveSeat", label: t?.hero?.suggestReserve || "Reserve seat", to: "/seats" },
    { id: "continueLearning", label: t?.hero?.suggestContinue || "Continue learning", to: "/courses" },
    { id: "searchBooks", label: t?.hero?.suggestSearch || "Search books", to: "/e-library" },
    { id: "todaysTasks", label: t?.hero?.suggestTasks || "Today's tasks", to: "/tasks" },
  ];

  const animationsPaused = !pageVisible || reducedMotion;

  return (
    <section className="relative overflow-hidden rounded-3xl">
      <HeroBackground atmosphere={atmosphere} paused={animationsPaused} reducedMotion={reducedMotion} />
      <AmbientParticles reducedMotion={reducedMotion} paused={animationsPaused} />
      <ConfettiBurst active={showConfetti && !reducedMotion} />
      <FireworksOverlay active={showFireworks} />
      <PartyModeOverlay active={partyMode} />
      {showNotificationPulse && <NotificationPulse active label={t?.hero?.newNotification || "New notification"} />}

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 px-6 sm:px-10 py-10 sm:py-12">
        {/* ── LEFT: headline + mascot stage ── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap justify-center lg:justify-start">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80">
              {t?.hero?.eyebrow || "Your campus, organized"}
            </p>
            <HeroClock now={now} locale={locale || "en"} libraryOpensAt={libraryOpensAt} libraryClosesAt={libraryClosesAt} t={t} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {t?.hero?.headline || "Everything you need, one tap away."}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-md">
            {isGuest
              ? (t?.hero?.guestSubtitle || "Verify your university ID to unlock seat reservations and the full library.")
              : (t?.hero?.subtitle || "Your seat, your books, and your courses — all in one place.")}
          </p>

          <div className="relative w-full mt-6 mb-2" onClickCapture={registerClick}>
            <HeroGreeting greetingLine={greetingLine} name={firstName} visible={noteVisible} />
            <HeroMascots event={activeEvent} />
          </div>

          <AssistantSuggestions suggestions={!noteVisible ? suggestions : []} t={t} />

          <div className="mt-4">
            <HeroCTAs isGuest={isGuest} t={t} />
          </div>
        </div>

        {/* ── RIGHT: streak + goal card ── */}
        <HeroStats
          user={user}
          resolvedClassLabel={resolvedClassLabel}
          streak={streak}
          dailyGoal={dailyGoal}
          completedToday={completedToday}
          fallbackName={t?.hero?.fallbackName}
          t={t}
        />
      </div>

      <style>{`
        .hero-enter-left, .hero-enter-right, .hero-enter-top {
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-duration: 0.9s;
        }
        .hero-enter-left  { animation-name: enterLeft; }
        .hero-enter-right { animation-name: enterRight; }
        .hero-enter-top   { animation-name: enterTop; animation-duration: 0.7s; animation-delay: 0.25s; }
        .hero-patrol-left   { animation: patrolLeft 5.5s ease-in-out infinite; animation-delay: 4s; }
        .hero-patrol-right  { animation: patrolRight 5.5s ease-in-out infinite; animation-delay: 4s; }
        .hero-patrol-center { animation: patrolCenter 6.5s ease-in-out infinite; animation-delay: 4s; }
        @media (prefers-reduced-motion: reduce) {
          .hero-enter-left, .hero-enter-right, .hero-enter-top { animation: none; opacity: 1; transform: none; }
          .hero-patrol-left, .hero-patrol-right, .hero-patrol-center { animation: none; }
        }
      `}</style>
      <HeroAnimationStyles />
    </section>
  );
};

export default HeroWelcome;