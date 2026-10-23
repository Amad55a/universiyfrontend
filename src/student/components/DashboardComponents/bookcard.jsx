// components/bookcard.jsx — UniLibrary design system
// Design: green-500 · black · white only (Tailwind)
// All strings via useLanguage hook
// Supports _reason / _reasonLabel metadata from smart recommendations

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Heart, Eye, Sparkles, UserCheck, Layers } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// ── Shared primary-action style ────────────────────────────────────────────────
export const PRIMARY_BTN =
  "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150";

// ── Cover gradient fallback ────────────────────────────────────────────────────
const GRADIENTS = [
  ["#000000", "#1a1a1a"],
  ["#2C2DE0", "#2C2DE0"],
  ["#0a0a0a", "#2C2DE0"],
  ["#111827", "#064e3b"],
  ["#1c1917", "#2C2DE0"],
  ["#0c0a09", "#2C2DE0"],
  ["#18181b", "#2C2DE0"],
  ["#0f172a", "#2C2DE0"],
];

const hashTitle = (title = "") =>
  title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

// ── Cover image / gradient fallback ───────────────────────────────────────────
const CoverImage = ({ src, title, format }) => {
  const { t } = useLanguage();
  const [error, setError] = useState(false);
  const idx = hashTitle(title) % GRADIENTS.length;
  const [c1, c2] = GRADIENTS[idx];
  const initial = (title || "?")[0].toUpperCase();

  const formatLabel =
    format === "ebook"
      ? (t["book.digital"] ?? "Digital")
      : format === "both"
      ? (t["book.both"] ?? "Digital + Print")
      : (t["book.print"] ?? "Print");

  if (!src || error) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center select-none"
        style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }}
      >
        <span
          className="text-4xl font-black text-white/90"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}
        >
          {initial}
        </span>
        <span className="text-[9px] font-bold mt-2 uppercase tracking-[0.15em] text-[#2C2DE0]/80">
          {formatLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={
        (typeof src === "object" ? src?.url : src)?.startsWith("http")
          ? (typeof src === "object" ? src?.url : src)
          : `${import.meta.env.VITE_API_BASE_URL ?? ""}/${(typeof src === "object" ? src?.url : src)?.replace(/^\//, "")}`
      }
      alt={title}
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  );
};

// ── Format badge ───────────────────────────────────────────────────────────────
const FormatBadge = ({ format }) => {
  const { t } = useLanguage();

  const cfg = {
    ebook: {
      label: t["book.digital"] ?? "Digital",
      className: "border border-[#2C2DE0] text-[#2C2DE0] bg-white",
    },
    physical: {
      label: t["book.print"] ?? "Print",
      className: "border border-black text-black bg-white",
    },
    both: {
      label: t["book.both"] ?? "Digital + Print",
      className: "border border-[#2C2DE0] text-[#2C2DE0] bg-white",
    },
  }[format] ?? {
    label: t["book.print"] ?? "Print",
    className: "border border-black text-black bg-white",
  };

  return (
    <span className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

// ── Reason badge (why this was recommended) ───────────────────────────────────
const ReasonBadge = ({ reason, reasonLabel }) => {
  if (!reason || reason === "popular") return null;

  const configs = {
    new_arrival: {
      icon: Sparkles,
      className: "bg-[#2C2DE0] text-white",
    },
    same_author: {
      icon: UserCheck,
      className: "bg-black text-white",
    },
    related_topic: {
      icon: Layers,
      className: "bg-black text-white",
    },
  };

  const cfg = configs[reason];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${cfg.className}`}>
      <Icon size={8} />
      {reasonLabel}
    </span>
  );
};

// ── Main BookCard ──────────────────────────────────────────────────────────────
const BookCard = ({ book, isSaved, onToggleSave, size = "md" }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [favAnim, setFavAnim] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleFav = (e) => {
    e.stopPropagation();
    setFavAnim(true);
    onToggleSave(book._id);
    setTimeout(() => setFavAnim(false), 500);
  };

  const handleRead = (e) => {
    e.stopPropagation();
    navigate(`/e-library/reader/${book._id}`);
  };

  const canRead = book.format === "ebook" || book.format === "both";
  const coverH = size === "sm" ? "160px" : "190px";
  const isTrending = book.borrowCount > 10;

  return (
    <div
      onClick={() => navigate(`/e-library/reader/${book._id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative flex min-w-0 flex-col rounded-xl overflow-hidden cursor-pointer bg-white
        transition-all duration-200 ease-out
        ${hovered
          ? "border-2 border-[#2C2DE0] shadow-lg shadow-[#2C2DE0]/10 -translate-y-0.5"
          : "border border-gray-200 shadow-sm"
        }
      `}
    >
      {/* ── Cover ── */}
      <div style={{ position: "relative", height: coverH, flexShrink: 0, overflow: "hidden" }}>
        <CoverImage src={book.coverImage} title={book.title} format={book.format} />

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
            hovered ? "bg-black/30" : "bg-transparent pointer-events-none"
          }`}
        >
          {hovered && canRead && (
            <div className="flex items-center gap-1.5 bg-white text-[#2C2DE0] px-3 py-2 rounded-full text-xs font-bold shadow-lg scale-105 border border-[#2C2DE0]">
              <Eye size={13} />
              {t["book.read"] ?? "Read Now"}
            </div>
          )}
        </div>

        {/* Top-left badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <FormatBadge format={book.format} />
          {isTrending && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black text-white uppercase tracking-wide">
              {t["book.trending"] ?? "Trending"}
            </span>
          )}
          {book._reason && (
            <ReasonBadge reason={book._reason} reasonLabel={book._reasonLabel} />
          )}
        </div>

        {/* Floating save button — ALWAYS VISIBLE */}
        <button
          type="button"
          onClick={handleFav}
          aria-label={isSaved ? "Remove from saved" : "Save book"}
          className={`
            absolute top-2.5 right-2.5 w-8 h-8 rounded-xl flex items-center justify-center z-20
            border shadow-sm transition-all duration-150 outline-none cursor-pointer
            ${isSaved
              ? "bg-[#2C2DE0] border-[#2C2DE0] text-white shadow-md shadow-[#2C2DE0]/20"
              : "bg-white/90 backdrop-blur-md border-gray-200 text-gray-500 hover:text-[#2C2DE0] hover:border-[#2C2DE0]"
            }
            ${favAnim ? "scale-125" : "scale-100 hover:scale-105"}
          `}
        >
          <Heart size={14} className={isSaved ? "fill-white text-white" : "fill-none"} />
        </button>
      </div>

      {/* ── Metadata ── */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p
          className={`text-[13px] font-bold leading-snug line-clamp-2 transition-colors duration-150 ${
            hovered ? "text-[#2C2DE0]" : "text-black"
          }`}
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" }}
        >
          {book.title}
        </p>
        <p className="text-[11px] text-gray-400 font-medium truncate">
          {book.author}
        </p>

        {/* Category section (Rating star removed) */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed border-gray-100">
          {book.category ? (
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider truncate">
              {book.category}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 font-medium">Uncategorized</span>
          )}
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={handleRead}
          disabled={!canRead}
          className={`
            min-w-0 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
            text-[11px] sm:text-xs font-bold outline-none
            ${canRead
              ? `${PRIMARY_BTN} cursor-pointer`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          <BookOpen size={11} />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {canRead
              ? (t["book.read"] ?? "Read Online")
              : (t["book.physical"] ?? "Print Only")}
          </span>
        </button>

        <button
          type="button"
          onClick={handleFav}
          aria-label="Toggle Save"
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 outline-none border shrink-0 cursor-pointer
            ${isSaved
              ? "bg-[#2C2DE0] border-[#2C2DE0] text-white"
              : "bg-white border-gray-200 text-gray-400 hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
            }
          `}
        >
          <Heart size={14} className={isSaved ? "fill-white text-white" : "fill-none"} />
        </button>
      </div>
    </div>
  );
};

export default BookCard;