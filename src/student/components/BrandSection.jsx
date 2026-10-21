import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { sectionWrap, glassCard } from "@/shared/constants/surfaces";

const SLIDES = (t) => [
  {
    tag: t.dashboard.slides[0].tag,
    title: t.dashboard.slides[0].title,
    desc: t.dashboard.slides[0].desc,
    cta: t.dashboard.slides[0].cta,
    href: "/seats",
    accent: "#2C2DE0",
    bg: "from-[#2C2DE0] to-white dark:from-[#2C2DE0]/30 dark:to-black",
    animation: "reservation",
  },
  {
    tag: t.dashboard.slides[1].tag,
    title: t.dashboard.slides[1].title,
    desc: t.dashboard.slides[1].desc,
    cta: t.dashboard.slides[1].cta,
    href: "/e-library",
    accent: "#2C2DE0",
    bg: "from-gray-50 to-white dark:from-gray-900 dark:to-black",
    animation: "library",
  },
  {
    tag: t.dashboard.slides[2].tag,
    title: t.dashboard.slides[2].title,
    desc: t.dashboard.slides[2].desc,
    cta: t.dashboard.slides[2].cta,
    href: "/profile",
    accent: "#2C2DE0",
    bg: "from-[#2C2DE0] to-white dark:from-[#2C2DE0]/20 dark:to-black",
    animation: "profile",
  },
];

const getGreeting = (t) => {
  const h = new Date().getHours();

  if (h >= 4 && h < 5) return t.dashboard.goodDawn || "Good Dawn";
  if (h === 5 && new Date().getMinutes() < 30) return t.dashboard.goodDawn || "Good Dawn";

  if (h === 5 && new Date().getMinutes() >= 30) return t.dashboard.goodMorning;
  if (h >= 6 && h < 12) return t.dashboard.goodMorning;

  if (h >= 12 && h < 15) return t.dashboard.goodNoon || "Good Noon";

  if (h >= 15 && h < 18) return t.dashboard.goodAfternoon;

  if (h >= 18 && h < 22) return t.dashboard.goodEvening;

  return t.dashboard.goodNight || "Good Night";
};

const isLibraryOpen = () => {
  const h = new Date().getHours();
  return h >= 7 && h < 17;
};

// Reservation Animation Component - Beautiful Modern Design
const ReservationAnimation = () => (
  <div className="w-48 h-48 flex items-center justify-center relative">
    {/* Animated seat grid - 3x3 */}
    <div className="relative w-40 h-40">
      {/* Rows of seats */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const index = row * 3 + col;
          const isReserved = index === 4; // Center seat is reserved
          const delay = index * 0.1;

          return (
            <div
              key={index}
              className={`absolute w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                isReserved
                  ? "bg-gradient-to-br from-[#2C2DE0] to-[#2C2DE0] text-white shadow-lg shadow-[#2C2DE0]/50"
                  : "bg-white dark:bg-gray-800 border-2 border-[#2C2DE0] dark:border-[#2C2DE0] text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg hover:border-[#2C2DE0]"
              }`}
              style={{
                left: `${col * 48 + 10}px`,
                top: `${row * 48 + 10}px`,
                animation: `floatSeat 2.5s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              {isReserved ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{String.fromCharCode(65 + row)}{col + 1}</span>
              )}
            </div>
          );
        })
      )}

      {/* Floating label "Select a seat" */}
      <div
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#2C2DE0] dark:text-[#2C2DE0] whitespace-nowrap opacity-60"
        style={{
          animation: "fadeInOut 3s ease-in-out infinite",
        }}
      >
        ✨ Select a seat
      </div>
    </div>

    <style>{`
      @keyframes floatSeat {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-6px) scale(1.05); }
      }
      @keyframes fadeInOut {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
    `}</style>
  </div>
);

// Library Animation Component - Beautiful Modern Design
const LibraryAnimation = () => (
  <div className="w-48 h-48 flex items-center justify-center relative">
    {/* Stack of books with 3D effect */}
    <div className="relative w-32 h-40">
      {/* Back book stack */}
      <div
        className="absolute bottom-0 left-2 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "120px",
          transform: "perspective(1000px) rotateY(15deg)",
          animation: "bookSway 2.5s ease-in-out infinite",
        }}
      />

      {/* Middle book stack */}
      <div
        className="absolute bottom-0 left-6 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "100px",
          transform: "perspective(1000px) rotateY(10deg)",
          animation: "bookSway 2.5s ease-in-out infinite 0.2s",
        }}
      />

      {/* Front book stack */}
      <div
        className="absolute bottom-0 left-10 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "90px",
          transform: "perspective(1000px) rotateY(5deg)",
          animation: "bookSway 2.5s ease-in-out infinite 0.4s",
        }}
      />

      {/* Right books */}
      <div
        className="absolute bottom-0 right-10 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "95px",
          animation: "bookSway 2.5s ease-in-out infinite 0.3s",
        }}
      />

      <div
        className="absolute bottom-0 right-6 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "110px",
          animation: "bookSway 2.5s ease-in-out infinite 0.1s",
        }}
      />

      <div
        className="absolute bottom-0 right-2 w-6 bg-gradient-to-r from-[#2C2DE0] to-[#2C2DE0] rounded-sm shadow-lg"
        style={{
          height: "100px",
          animation: "bookSway 2.5s ease-in-out infinite 0.5s",
        }}
      />

      {/* Base shelf */}
      <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2C2DE0] to-transparent rounded-full shadow-lg" />

      {/* Floating label */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#2C2DE0] dark:text-[#2C2DE0] whitespace-nowrap"
        style={{
          animation: "fadeInOut 3s ease-in-out infinite",
        }}
      >
        📚 Explore Books
      </div>
    </div>

    <style>{`
      @keyframes bookSway {
        0%, 100% { transform: translateY(0) rotateZ(0deg); }
        50% { transform: translateY(-8px) rotateZ(1deg); }
      }
      @keyframes fadeInOut {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
    `}</style>
  </div>
);

// Profile Animation Component - Beautiful Modern Design
const ProfileAnimation = () => (
  <div className="w-48 h-48 flex items-center justify-center relative">
    {/* Animated user avatar with enhanced effects */}
    <div className="relative w-32 h-32">
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2C2DE0]/30 to-[#2C2DE0]/30 blur-xl"
        style={{
          animation: "pulse 3s ease-in-out infinite",
        }}
      />

      {/* Main avatar circle */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2C2DE0] via-[#2C2DE0] to-[#2C2DE0] shadow-2xl shadow-[#2C2DE0]/40 flex items-center justify-center overflow-hidden">
        {/* Rotating border effect */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white opacity-40"
          style={{
            animation: "spin 4s linear infinite",
          }}
        />

        {/* Inner avatar content */}
        <div className="relative z-10 flex items-center justify-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      {/* Top right badge - verified */}
      <div
        className="absolute -top-2 -right-2 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-[#2C2DE0] shadow-xl font-bold text-[#2C2DE0]"
        style={{
          animation: "badgeFloat 2.5s ease-in-out infinite",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Bottom left badge - settings */}
      <div
        className="absolute -bottom-2 -left-2 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-[#2C2DE0] shadow-xl font-bold text-[#2C2DE0]"
        style={{
          animation: "badgeFloat 2.5s ease-in-out infinite 0.6s",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.98 2.98l4.24 4.24M1 12h6m6 0h6m-16.78 7.78l4.24-4.24m2.98-2.98l4.24-4.24" />
        </svg>
      </div>

      {/* Bottom right badge - online status */}
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2C2DE0] rounded-full border-2 border-white dark:border-gray-800 shadow-lg"
        style={{
          animation: "pulse 2s ease-in-out infinite",
        }}
      />
    </div>

    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes badgeFloat {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-6px) scale(1.1); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.15); }
      }
    `}</style>
  </div>
);

const BrandSection = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(isLibraryOpen());

  const slides = SLIDES(t);

  const goTo = (idx) => {
    if (idx === current || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 250);
  };

  useEffect(() => {
    const t = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(t);
  }, [current]);

  useEffect(() => {
    const checkLibraryStatus = setInterval(() => {
      setLibraryOpen(isLibraryOpen());
    }, 60000);

    return () => clearInterval(checkLibraryStatus);
  }, []);

  const slide = slides[current];

  const today = new Date().toLocaleDateString(language === "so" ? "so-SO" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const renderAnimation = () => {
    switch (slide.animation) {
      case "reservation":
        return <ReservationAnimation />;
      case "library":
        return <LibraryAnimation />;
      case "profile":
        return <ProfileAnimation />;
      default:
        return null;
    }
  };

  return (
    <section className={`${sectionWrap} mt-6 sm:mt-8`}>
      {/* Greeting bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-[#2C2DE0] uppercase tracking-widest">
            {getGreeting(t)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>

        {libraryOpen && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0] rounded-full text-xs font-semibold border border-[#2C2DE0] dark:border-[#2C2DE0]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C2DE0] animate-pulse" />
            {t.dashboard.libraryOpen}
          </span>
        )}

        {!libraryOpen && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {t.dashboard.libraryClosed || "Library Closed"}
          </span>
        )}
      </div>

      {/* Main card */}
      <div
        className={`relative bg-gradient-to-br ${slide.bg} ${glassCard} rounded-3xl overflow-hidden transition-opacity duration-250 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Decorative green dot pattern */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #2C2DE0 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative flex flex-col md:flex-row items-center justify-between px-8 py-8 gap-6">
          {/* LEFT */}
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-[#2C2DE0] bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border border-[#2C2DE0] dark:border-[#2C2DE0]/20 px-2.5 py-1 rounded-full mb-3">
              {slide.tag}
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
              {slide.title}
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm leading-relaxed max-w-md">
              {slide.desc}
            </p>

            <button
              onClick={() => navigate(slide.href)}
              className="mt-6 inline-flex items-center gap-2 bg-[#2C2DE0] hover:bg-[#2C2DE0] active:bg-[#2C2DE0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 shadow-sm shadow-[#2C2DE0] dark:shadow-none group"
            >
              {slide.cta}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* RIGHT - Animation */}
          <div className="flex-shrink-0">
            {renderAnimation()}
          </div>
        </div>

        {/* Bottom dots nav */}
        <div className="flex items-center gap-1.5 px-8 pb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 h-2 bg-[#2C2DE0]"
                  : "w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-[#2C2DE0]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandSection;