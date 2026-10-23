// BookReader.jsx — Uniso E-Library v3
// Production-grade: immersive layout, smooth transitions, full dark mode, real watermark
// v3.1: AI panel can now expand/restore (Library Tutor), width transitions smoothly
// v3.2: FIX — PDF now loads with an authenticated request (react-pdf's <Document>
//       does its own fetch and was not going through the axios instance / token,
//       so protected /books/:id/read calls were rejected and showed "Failed to load PDF")

import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { getAccessToken } from "@/api/client";
import { getBookReadUrl, shouldRefreshBookPdfSession } from "@/api/books";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Bookmark, BookmarkCheck,
  ArrowLeft, AlertCircle, Sparkles,
  X, List, Settings, Sun, Moon, Coffee,
  Clock, BookMarked, Minus, Plus, RotateCcw,
  FileText, ShieldAlert, ChevronDown, ChevronUp,
  Copy, Search, Volume2, VolumeX,
} from "lucide-react";
import { useBookReader, useNotes } from "@/hooks/usee-library";
import AIPanel from "./AiPanel";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { useUniversityVerification } from "@/hooks/useUniversityVerification";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── Shared primary-action style (Duolingo-style 3D button) ──────────────────
// This is the ONE button style used everywhere in the system.
const PRIMARY_GREEN = "#2C2DE0";
const PRIMARY_GREEN_SHADOW = "#1E1FAA";
const primaryBtnStyle = (pressed = false) => ({
  background: PRIMARY_GREEN,
  color: "#fff",
  border: "none",
  boxShadow: pressed ? `0 2px 0 ${PRIMARY_GREEN_SHADOW}` : `0 4px 0 ${PRIMARY_GREEN_SHADOW}`,
  transform: pressed ? "translateY(2px)" : "translateY(0)",
  transition: "all 0.12s",
});
// Tailwind class-string twin of primaryBtnStyle, for plain <button className>  use.
const PRIMARY_BTN =
  "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150";

const fetchBook = async (id) => {
  const { data } = await api.get(`/books/${id}`);
  return data.data ?? data.book;
};



const estimateTimeRemaining = (cur, total) => {
  if (!total) return null;
  const mins = Math.round((total - cur) * 2.5);
  if (mins < 1) return "Almost done";
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
};

// Pull plain text off the current PDF page — used by the topbar "Listen"
// button to read the page aloud with the browser's speech synthesis.
const extractPlainPageText = async (pdfRef, pageNumber) => {
  if (!pdfRef || !pageNumber) return null;
  try {
    const page = await pdfRef.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((i) => i.str).join(" ").trim();
    return text.length > 10 ? text : null;
  } catch {
    return null;
  }
};

// ─── Themes ───────────────────────────────────────────────────────────────────
// Single accent (#2C2DE0) across every theme — green / white / black system only.
const THEMES = {
  light: {
    id: "light", label: "Light", icon: Sun,
    bg: "#f0ede8", surface: "#ffffff", sidebarBg: "#fafaf9",
    border: "#e4e4e2", text: "#111111", textMuted: "#555555",
    textFaint: "#aaaaaa", toolbar: "#ffffff", toolbarBorder: "#e4e4e2",
    pdfBg: "#e8e4de", aiPanel: "#fafaf9", aiPanelBorder: "#e4e4e2",
    hover: "rgba(0,0,0,0.04)", accent: "#2C2DE0", accentBg: "rgba(88,204,2,0.08)",
    shadow: "0 2px 4px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)",
    pageShadow: "0 4px 48px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)",
    pdfFilter: "none",
    inputBg: "#f0ede8",
  },
  sepia: {
    id: "sepia", label: "Sepia", icon: Coffee,
    bg: "#f4ead4", surface: "#fdf6e3", sidebarBg: "#f0e6cc",
    border: "#ddd0b0", text: "#3b2f1e", textMuted: "#7a6548",
    textFaint: "#b09a78", toolbar: "#fdf6e3", toolbarBorder: "#ddd0b0",
    pdfBg: "#ede3c0", aiPanel: "#fdf6e3", aiPanelBorder: "#ddd0b0",
    hover: "rgba(59,47,32,0.06)", accent: "#2C2DE0", accentBg: "rgba(88,204,2,0.08)",
    shadow: "0 2px 4px rgba(59,47,32,0.08), 0 8px 32px rgba(59,47,32,0.07)",
    pageShadow: "0 4px 48px rgba(59,47,32,0.2), 0 1px 4px rgba(59,47,32,0.08)",
    pdfFilter: "sepia(0.35) brightness(0.97)",
    inputBg: "#f4ead4",
  },
  dark: {
    id: "dark", label: "Dark", icon: Moon,
    bg: "#141414", surface: "#1e1e1e", sidebarBg: "#181818",
    border: "#2a2a2a", text: "#e2e2e2", textMuted: "#888888",
    textFaint: "#444444", toolbar: "#1a1a1a", toolbarBorder: "#252525",
    pdfBg: "#111111", aiPanel: "#1a1a1a", aiPanelBorder: "#252525",
    hover: "rgba(255,255,255,0.05)", accent: "#2C2DE0", accentBg: "rgba(88,204,2,0.12)",
    shadow: "0 2px 4px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
    pageShadow: "0 4px 48px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.3)",
    pdfFilter: "invert(0.88) hue-rotate(180deg) brightness(1.05) contrast(0.88)",
    inputBg: "#141414",
  },
  night: {
    id: "night", label: "Night", icon: Moon,
    bg: "#000000", surface: "#0c0c0c", sidebarBg: "#050505",
    border: "#1e1e1e", text: "#999999", textMuted: "#555555",
    textFaint: "#2a2a2a", toolbar: "#050505", toolbarBorder: "#1a1a1a",
    pdfBg: "#000000", aiPanel: "#0c0c0c", aiPanelBorder: "#1e1e1e",
    hover: "rgba(255,255,255,0.04)", accent: "#2C2DE0", accentBg: "rgba(88,204,2,0.09)",
    shadow: "0 2px 4px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.5)",
    pageShadow: "0 4px 48px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.5)",
    pdfFilter: "invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.08)",
    inputBg: "#000000",
  },
};

// ─── DevTools detection ───────────────────────────────────────────────────────
const useDevToolsDetection = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const isMobileViewport = window.innerWidth <= 900;
      setOpen(!isMobileViewport && (
        window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160
      ));
    };
    check();
    const iv = setInterval(check, 2000);
    window.addEventListener("resize", check);
    return () => { clearInterval(iv); window.removeEventListener("resize", check); };
  }, []);
  return open;
};

// ─── Watermark (real authenticated user) ──────────────────────────────────────
const WatermarkOverlay = memo(({ fullName, universityId, page, T }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent?.offsetWidth || 800;
    canvas.height = parent?.offsetHeight || 1100;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const line1 = universityId
      ? `Name ${fullName}  ·  ID ${universityId}`
      : fullName;
    const line2 = `Page ${page}  ·  ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}  ·  Uniso E-Library`;

    ctx.font = "bold 12.5px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";

    const stepX = 260;
    const stepY = 210;

    for (let x = -stepX / 2; x < canvas.width + stepX; x += stepX) {
      for (let y = stepY / 2; y < canvas.height + stepY; y += stepY) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 6);
        ctx.globalAlpha = 0.085;
        ctx.fillStyle = T?.text || "#1a1a1a";
        ctx.fillText(line1, 0, 0);
        ctx.fillText(line2, 0, 20);
        ctx.restore();
      }
    }
  }, [fullName, universityId, page, T]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 15,
      }}
    />
  );
});

// ─── DevTools warning ─────────────────────────────────────────────────────────
const DevToolsWarning = ({ T }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
    <div style={{ background: T.surface, border: "2px solid #ef4444", borderRadius: "20px", padding: "40px 48px", maxWidth: "400px", textAlign: "center" }}>
      <ShieldAlert size={36} color="#ef4444" style={{ margin: "0 auto 16px", display: "block" }} />
      <h2 style={{ fontSize: "17px", fontWeight: 700, color: T.text, marginBottom: "10px" }}>Security Alert</h2>
      <p style={{ fontSize: "13px", color: T.textMuted, lineHeight: 1.7 }}>
        Developer tools detected. Reading has been paused to protect copyrighted content.
      </p>
      <p style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700, marginTop: "10px" }}>Close DevTools to continue reading.</p>
    </div>
  </div>
);

// ─── Page transition wrapper ──────────────────────────────────────────────────
const PageTransition = memo(({ children, pageKey, T }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.22s ease, transform 0.22s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    return () => cancelAnimationFrame(raf);
  }, [pageKey]);

  return <div ref={ref}>{children}</div>;
});

// ─── Left Sidebar (now a floating overlay panel, closed by default) ──────────
const LeftSidebar = ({ T, bookmarks, onNavigate, onRemoveBookmark, currentPage, numPages, isOpen, toc, pdfRef, notes, saveNote, deleteNote, onClose }) => {
  const [tab, setTab] = useState("contents");
  const [editingNote, setEdit] = useState(false);
  const [noteText, setNoteText] = useState(notes[currentPage] || "");
  const [tocSearch, setTocSearch] = useState("");

  useEffect(() => {
    setNoteText(notes[currentPage] || "");
    setEdit(false);
  }, [currentPage, notes]);

  const filteredToc = toc.filter(i =>
    !tocSearch || i.title?.toLowerCase().includes(tocSearch.toLowerCase())
  );

  const TABS = [
    { id: "contents", label: "Contents", icon: List },
    { id: "bookmarks", label: "Marks", icon: BookMarked },
    { id: "notes", label: "Notes", icon: FileText },
  ];

  return (
    <>
      {/* backdrop — click to close, since the sidebar now floats over the reader */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 39,
          background: "rgba(0,0,0,0.25)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.22s ease",
        }}
      />
      <div style={{
        position: "fixed", top: 0, bottom: 0, left: 0,
        width: "290px",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1)",
        background: T.sidebarBg,
        borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
        zIndex: 40,
        boxShadow: isOpen ? "8px 0 32px rgba(0,0,0,0.18)" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "13px 4px", border: "none", cursor: "pointer",
              background: "transparent",
              color: tab === id ? T.accent : T.textFaint,
              borderBottom: `2px solid ${tab === id ? T.accent : "transparent"}`,
              transition: "all 0.15s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
          <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, padding: "0 12px", alignSelf: "stretch" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>

          {tab === "contents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: T.surface, borderRadius: "12px", border: `1px solid ${T.border}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
                    {numPages ? Math.round((currentPage / numPages) * 100) : 0}%
                  </span>
                  <span style={{ fontSize: "11.5px", color: T.textMuted, fontVariantNumeric: "tabular-nums" }}>
                    {currentPage} / {numPages ?? "—"}
                  </span>
                </div>
                <div style={{ height: "3px", background: T.border, borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${numPages ? (currentPage / numPages) * 100 : 0}%`, background: T.accent, borderRadius: "2px", transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>

              {toc.length > 6 && (
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
                  <input
                    value={tocSearch} onChange={e => setTocSearch(e.target.value)}
                    placeholder="Search contents…"
                    style={{ width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "7px 10px 7px 28px", fontSize: "12px", color: T.text, outline: "none" }}
                  />
                </div>
              )}

              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textFaint, marginBottom: "8px" }}>
                  Table of Contents
                </p>
                {filteredToc.length > 0 ? filteredToc.map((item, i) => (
                  <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" key={i}
                    onClick={async () => {
                      if (!pdfRef || !item.dest) return;
                      try {
                        let d = item.dest;
                        if (typeof d === "string") d = await pdfRef.getDestination(d);
                        if (!d?.[0]) return;
                        const pi = await pdfRef.getPageIndex(d[0]);
                        onNavigate(pi + 1);
                      } catch { }
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: `7px ${8 + (item.depth || 0) * 12}px 7px 8px`,
                      borderRadius: "7px", background: "transparent", border: "none",
                      cursor: item.dest ? "pointer" : "default",
                      opacity: item.dest ? 1 : 0.4,
                      color: T.text, fontSize: item.depth === 0 ? "12.5px" : "12px",
                      fontWeight: item.depth === 0 ? 600 : 400,
                      lineHeight: 1.4,
                      display: "flex", alignItems: "center", gap: "7px",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (item.dest) e.currentTarget.style.background = T.hover; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ width: item.depth === 0 ? "5px" : "3px", height: item.depth === 0 ? "5px" : "3px", borderRadius: "50%", background: item.depth === 0 ? T.accent : T.textFaint, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title || "Untitled"}
                    </span>
                  </button>
                )) : (
                  <p style={{ fontSize: "12px", color: T.textMuted, fontStyle: "italic", lineHeight: 1.6, padding: "4px 0" }}>
                    {tocSearch ? "No matching sections." : "No table of contents available."}
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "bookmarks" && (
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textFaint, marginBottom: "12px" }}>Saved bookmarks</p>
              {bookmarks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <BookMarked size={22} color={T.textFaint} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <p style={{ fontSize: "12px", color: T.textMuted }}>No bookmarks yet.</p>
                </div>
              ) : bookmarks.map(bm => (
                <div key={bm._id}
                  style={{ display: "flex", alignItems: "center", padding: "8px 8px", borderRadius: "8px", gap: "8px" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.hover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => onNavigate(bm.page)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 800, color: T.accent, fontVariantNumeric: "tabular-nums" }}>p.{bm.page}</span>
                    {bm.note && <span style={{ fontSize: "12px", color: T.textMuted, marginLeft: "8px" }}>{bm.note}</span>}
                  </button>
                  <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => onRemoveBookmark(bm._id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, padding: "2px" }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textFaint, marginBottom: "10px" }}>
                  Page {currentPage}
                </p>
                {editingNote ? (
                  <div>
                    <textarea
                      value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder={`Note for page ${currentPage}…`}
                      rows={5} autoFocus
                      onKeyDown={e => { if (e.key === "Enter" && e.metaKey) { saveNote(currentPage, noteText.trim()); setEdit(false); } }}
                      style={{ width: "100%", boxSizing: "border-box", background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: T.text, lineHeight: 1.65, resize: "vertical", fontFamily: "inherit", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { saveNote(currentPage, noteText.trim()); setEdit(false); }} style={{ flex: 1, padding: "8px", borderRadius: "10px", ...primaryBtnStyle(), fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Save</button>
                      <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { setEdit(false); setNoteText(notes[currentPage] || ""); }} style={{ padding: "8px 14px", borderRadius: "8px", background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, fontSize: "12px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div onClick={() => setEdit(true)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "12px 14px", cursor: "text", minHeight: "72px" }}>
                      {notes[currentPage]
                        ? <p style={{ fontSize: "13px", color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{notes[currentPage]}</p>
                        : <p style={{ fontSize: "13px", color: T.textFaint, fontStyle: "italic", margin: 0 }}>Click to add a note…</p>
                      }
                    </div>
                    {notes[currentPage] && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => setEdit(true)} style={{ fontSize: "11px", color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => deleteNote(currentPage)} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textFaint, marginBottom: "10px" }}>
                  All notes ({Object.keys(notes).length})
                </p>
                {Object.keys(notes).length === 0 ? (
                  <p style={{ fontSize: "12px", color: T.textMuted }}>Start reading and take notes.</p>
                ) : Object.entries(notes).sort(([a], [b]) => Number(a) - Number(b)).map(([page, text]) => (
                  <div key={page} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => onNavigate(Number(page))} style={{ fontSize: "12px", fontWeight: 800, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Page {page}</button>
                      <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => deleteNote(page)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint }}><X size={11} /></button>
                    </div>
                    <p style={{ fontSize: "12px", color: T.textMuted, lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = ({ T, themeId, setThemeId, scale, setScale, onClose }) => (
  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: "280px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", boxShadow: T.shadow, zIndex: 100, overflow: "hidden" }}>
    <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "14px", fontWeight: 700, color: T.text }}>Display</span>
      <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={14} /></button>
    </div>
    <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <p style={{ fontSize: "10.5px", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Theme</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {Object.values(THEMES).map(({ id, label }) => {
            const bgMap = { light: "#f0ede8", sepia: "#f4ead4", dark: "#1e1e1e", night: "#000000" };
            return (
              <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" key={id} onClick={() => setThemeId(id)} style={{
                padding: "10px 12px", borderRadius: "10px", border: `2px solid ${themeId === id ? T.accent : T.border}`,
                background: bgMap[id], cursor: "pointer", transition: "all 0.15s",
                boxShadow: themeId === id ? `0 0 0 3px ${T.accentBg}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: themeId === id ? T.accent : "#888" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p style={{ fontSize: "10.5px", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Zoom</p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => setScale(s => Math.max(0.6, +(s - 0.1).toFixed(2)))} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${T.border}`, background: "transparent", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Minus size={13} />
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: "15px", fontWeight: 700, color: T.text }}>{Math.round(scale * 100)}%</span>
          <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => setScale(s => Math.min(3.0, +(s + 0.1).toFixed(2)))} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${T.border}`, background: "transparent", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main BookReader ──────────────────────────────────────────────────────────
// The reader is ALWAYS full-screen immersive: no fullscreen toggle, no button
// for it — the moment this page opens it already takes the whole viewport,
// with no header bar and no sidebar showing. A slim floating control cluster
// appears only when the mouse moves near the top, and auto-hides again —
// everything else (page nav, zoom, progress) stays reachable from the
// always-visible bottom strip.
const BookReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(2.1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showSidebar, setShowSidebar] = useState(false); // closed on open — immersive by default
  const [showSettings, setShowSettings] = useState(false);
  const [addingBm, setAddingBm] = useState(false);
  const [bmNote, setBmNote] = useState("");
  const [showBmMenu, setShowBmMenu] = useState(false);
  const [toc, setToc] = useState([]);
  const [pdfRef, setPdfRef] = useState(null);
  const [themeId, setThemeId] = useState("light");
  const [aiTrigger, setAiTrigger] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0);
  const [timeStart] = useState(Date.now());
  const [aiExpanded, setAiExpanded] = useState(false);
  const [showMobileAI, setShowMobileAI] = useState(false);
  const pdfContainerRef = useRef(null);
  const touchStartRef = useRef(null);
  const mobileAIButtonRef = useRef(null);
  const mobileAICloseButtonRef = useRef(null);
  const wasMobileAIOpenRef = useRef(false);

  // Floating top control cluster — hidden by default, revealed on mouse
  // movement near the top edge, auto-hides again after a short pause.
  const [chromeVisible, setChromeVisible] = useState(false);
  const hideTimerRef = useRef(null);

  // Topbar "Listen" — reads the current page aloud via speech synthesis,
  // independent of the AI Tutor panel's own read-aloud on replies.
  const [readingAloud, setReadingAloud] = useState(false);
  const [readAloudBusy, setReadAloudBusy] = useState(false);

  const { universityId, fullName } =
    useUniversityVerification();
  const T = THEMES[themeId];
  const devToolsOpen = useDevToolsDetection();

  const { savedProgress, saveProgress, bookmarks, addBookmark, removeBookmark } = useBookReader(id);
  const { notes, saveNote, deleteNote } = useNotes(id);

  // Restore last page
  useEffect(() => {
    if (savedProgress?.lastPage > 1) setPageNumber(savedProgress.lastPage);
  }, [savedProgress]);

  // Anti-copy protection
  useEffect(() => {
    const block = e => e.preventDefault();
    const blockKey = e => {
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "p", "s"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    };
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKey);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKey);
    };
  }, []);

  // Preserve PDF text selection and use it as optional AI context.
  useEffect(() => {
    let selectionTimer;
    const handler = () => {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel && sel.length > 5) setSelectedText(sel);
      }, 0);
    };
    document.addEventListener("mouseup", handler);
    return () => {
      clearTimeout(selectionTimer);
      document.removeEventListener("mouseup", handler);
    };
  }, []);

  // Save progress (debounced)
  useEffect(() => {
    if (!numPages || !pageNumber) return;
    const t = setTimeout(() =>
      saveProgress({
        lastPage: pageNumber,
        percent: Math.round((pageNumber / numPages) * 100),
        timeSpent: Math.floor((Date.now() - timeStart) / 1000),
      }), 2500);
    return () => clearTimeout(t);
  }, [pageNumber, numPages]);

  useEffect(() => {
    if (showMobileAI) {
      mobileAICloseButtonRef.current?.focus();
    } else if (wasMobileAIOpenRef.current) {
      mobileAIButtonRef.current?.focus();
    }
    wasMobileAIOpenRef.current = showMobileAI;
  }, [showMobileAI]);

  useEffect(() => {
    if (!showMobileAI) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setShowMobileAI(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showMobileAI]);

  // Keyboard navigation
  useEffect(() => {
    const scrollReader = (offset) => {
      const container = pdfContainerRef.current;
      if (!container) return;
      container.scrollBy({ top: offset, left: 0, behavior: "smooth" });
    };

    const handler = e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const container = pdfContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const atTop = scrollTop <= 16;
      const atBottom = scrollTop >= maxScrollTop - 16;
      const lineStep = Math.round(container.clientHeight * 0.2);
      const pageStep = container.clientHeight - 96;

      if (["ArrowDown", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (atBottom && pageNumber < (numPages || 1)) {
          goTo(pageNumber + 1);
        } else {
          scrollReader(lineStep);
        }
        return;
      }

      if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        if (atTop && pageNumber > 1) {
          goTo(pageNumber - 1);
        } else {
          scrollReader(-lineStep);
        }
        return;
      }

      if (e.key === "PageDown") {
        e.preventDefault();
        if (atBottom && pageNumber < (numPages || 1)) {
          goTo(pageNumber + 1);
        } else {
          scrollReader(pageStep);
        }
        return;
      }

      if (e.key === "PageUp") {
        e.preventDefault();
        if (atTop && pageNumber > 1) {
          goTo(pageNumber - 1);
        } else {
          scrollReader(-pageStep);
        }
        return;
      }

      if (e.key === "Escape") { setShowSettings(false); setShowBmMenu(false); setShowSidebar(false); setShowMobileAI(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageNumber, numPages]);

  // Reveal the floating top controls near the top edge of the screen, and on
  // any mouse movement while a menu is open; auto-hide after inactivity.
  useEffect(() => {
    const onMove = (e) => {
      if (e.clientY < 110) {
        setChromeVisible(true);
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setChromeVisible(false);
      }, 2600);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const chromeForced = showSettings || showBmMenu || addingBm || showSidebar;
  const topVisible = chromeVisible || chromeForced;

  // Stop reading aloud whenever the page turns, or the reader unmounts.
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setReadingAloud(false);
  }, [pageNumber]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleReadAloud = useCallback(async () => {
    if (readingAloud) {
      window.speechSynthesis.cancel();
      setReadingAloud(false);
      return;
    }
    setReadAloudBusy(true);
    const text = await extractPlainPageText(pdfRef, pageNumber);
    setReadAloudBusy(false);
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    utter.onend = () => setReadingAloud(false);
    utter.onerror = () => setReadingAloud(false);
    window.speechSynthesis.speak(utter);
    setReadingAloud(true);
  }, [readingAloud, pdfRef, pageNumber]);

  const { data: book, isLoading, error } = useQuery({
    queryKey: ["book", id],
    queryFn: () => fetchBook(id),
    enabled: !!id,
  });

  // react-pdf makes its own request, bypassing the Axios 401 refresh
  // interceptor. Attach the current token and refresh once if it expired.
  const pdfUrl = book ? getBookReadUrl(id, api.defaults.baseURL) : null;
  const token = getAccessToken();
  const pdfFile = useMemo(() => pdfUrl
    ? {
        url: pdfUrl,
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      }
    : null, [pdfUrl, token]);

  const handlePdfLoadError = useCallback(async (error) => {
    if (shouldRefreshBookPdfSession(error, pdfLoadAttempt)) {
      setPdfError(false);
      try {
        await api.post("/auth/refresh-token", {}, { withCredentials: true });
        setPdfLoadAttempt(1);
        return;
      } catch {
        setPdfError(true);
        return;
      }
    }
    setPdfError(true);
  }, [pdfLoadAttempt]);

  const onDocumentLoad = useCallback(async (pdf) => {
    setNumPages(pdf.numPages);
    setPdfError(false);
    setPdfRef(pdf);
    try {
      const outline = await pdf.getOutline();
      const flatten = (items = [], depth = 0) =>
        items.flatMap(item => [
          { title: item.title, dest: item.dest ?? null, depth },
          ...flatten(item.items, depth + 1),
        ]);
      setToc(flatten(outline ?? []));
    } catch { setToc([]); }
  }, []);

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!pdfRef || !fitToWidth || !container) return undefined;

    let active = true;
    let resizeObserver;
    const updateFit = async () => {
      const page = await pdfRef.getPage(pageNumber);
      if (!active || !pdfContainerRef.current) return;
      const currentContainer = pdfContainerRef.current;
      const style = window.getComputedStyle(currentContainer);
      const horizontalPadding =
        Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const availableWidth = Math.max(1, currentContainer.clientWidth - horizontalPadding - 8);
      const pageWidth = page.getViewport({ scale: 1 }).width;
      setScale((currentScale) => {
        const nextScale = Math.max(0.25, Math.min(2.1, availableWidth / pageWidth));
        return Math.abs(currentScale - nextScale) < 0.01 ? currentScale : nextScale;
      });
    };

    void updateFit().catch((error) => {
      console.error("Unable to fit the PDF page to the reader.", error);
    });
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        void updateFit().catch((error) => {
          console.error("Unable to fit the PDF page to the reader.", error);
        });
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", updateFit);
    }

    return () => {
      active = false;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [fitToWidth, pageNumber, pdfRef]);

  const goTo = useCallback(p => {
    const next = Math.max(1, Math.min(numPages ?? 1, p));
    if (next !== pageNumber) {
      setPageLoaded(false);
      setPageNumber(next);
    }
  }, [numPages, pageNumber]);

  const isBookmarked = bookmarks.some(b => b.page === pageNumber);
  const confirmBm = () => { addBookmark({ page: pageNumber, note: bmNote }); setBmNote(""); setAddingBm(false); };
  const pct = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const timeLeft = estimateTimeRemaining(pageNumber, numPages);

  const handleReaderTouchStart = (event) => {
    const touch = event.touches?.[0];
    const container = pdfContainerRef.current;
    if (event.touches?.length !== 1 || !touch || !container ||
        container.scrollWidth > container.clientWidth + 1 ||
        event.target.closest("button, input, textarea, select, a, [contenteditable='true']")) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleReaderTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches?.[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (
      Math.abs(deltaX) < 48 ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.25 ||
      window.getSelection()?.toString()
    ) return;

    goTo(pageNumber + (deltaX < 0 ? 1 : -1));
  };

  const toolBtn = (active = false, small = false) => ({
    width: small ? "30px" : "34px",
    height: small ? "30px" : "34px",
    borderRadius: "9px",
    border: `1px solid ${active ? T.accent : T.toolbarBorder}`,
    background: active ? T.accentBg : "transparent",
    color: active ? T.accent : T.textMuted,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.12s", flexShrink: 0,
  });

  // Loading state
  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: "13px", color: T.textMuted }}>Opening book…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !book) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <AlertCircle size={28} color="#ef4444" style={{ margin: "0 auto 12px", display: "block" }} />
        <p style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "8px" }}>Book not found</p>
        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => navigate(-1)} style={{ color: T.accent, background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>← Go back</button>
      </div>
    </div>
  );

  return (
    <div className="book-reader" style={{
      display: "flex", flexDirection: "column",
      height: "100vh",
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: T.bg,
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes readerDrawerIn { from { transform: translateX(24px); opacity: 0.7; } to { transform: translateX(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textFaint}; }
        .react-pdf__Page__canvas { filter: ${T.pdfFilter} !important; display: block !important; }
        .react-pdf__Page { user-select: text !important; -webkit-user-select: text !important; }
        .react-pdf__Page__textContent.textLayer { opacity: 0.4; }
        .toolbar-btn:hover { background: ${T.hover} !important; }
        .page-animate { animation: fadeUp 0.22s ease forwards; }
        @supports (height: 100dvh) {
          .book-reader { height: 100dvh; }
        }
        .book-reader button:focus-visible,
        .book-reader input:focus-visible {
          outline: 3px solid ${T.accent};
          outline-offset: 2px;
        }
        @media (max-width: 900px) {
          .reader-floating-toolbar {
            top: 8px !important;
            left: 8px !important;
            right: 8px !important;
            gap: 4px !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .reader-book-title, .reader-note-indicator { display: none !important; }
          .reader-pdf-container {
            padding: 64px 8px 16px !important;
            touch-action: pan-y pinch-zoom;
          }
          .reader-pdf-container .react-pdf__Page { max-width: 100%; }
          .reader-pdf-container .react-pdf__Page__canvas {
            max-width: 100% !important;
            height: auto !important;
          }
          .reader-zoom-controls,
          .reader-page-controls,
          .reader-keyboard-hint {
            display: none !important;
          }
          .reader-ai-panel { display: none !important; }
          .reader-ai-panel-open {
            display: flex !important;
            position: fixed !important;
            inset: env(safe-area-inset-top) 0 0 auto !important;
            width: min(420px, 100vw) !important;
            min-width: 0 !important;
            max-width: 100vw !important;
            z-index: 45 !important;
            box-shadow: -12px 0 36px rgba(0,0,0,0.24);
            animation: readerDrawerIn 0.22s cubic-bezier(0.16,1,0.3,1);
          }
          .reader-ai-panel-open .library-tutor-panel > div:last-of-type {
            padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
          }
          .reader-ai-panel-open .reader-mobile-ai-close { display: flex !important; }
          .reader-mobile-ai-backdrop {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 44 !important;
          }
          .reader-bottom-toolbar.reader-bottom-toolbar-ai-open {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .reader-bottom-toolbar {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            height: auto !important;
            min-height: 60px;
            gap: 8px;
            padding: 8px 12px calc(8px + env(safe-area-inset-bottom)) !important;
            position: relative;
            z-index: 46;
          }
          .reader-mobile-ai-button {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px;
            min-height: 44px;
            margin-left: auto;
            background: ${T.surface} !important;
            border-color: ${T.border} !important;
            color: ${T.accent} !important;
            box-shadow: ${T.shadow} !important;
          }
          .reader-time-left { display: none !important; }
          .reader-progress-controls {
            order: 0;
            justify-self: start;
            margin-right: auto;
          }
          .reader-mobile-ai-button { display: flex !important; order: 1; }
        }
        @media (max-width: 360px) {
          .reader-bottom-toolbar { padding-left: 8px !important; padding-right: 8px !important; }
          .reader-progress-controls { gap: 4px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .book-reader *,
          .book-reader *::before,
          .book-reader *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .reader-ai-panel-open { animation: none !important; }
        }
        @media (max-width: 380px) {
          .reader-listen-button { display: none !important; }
        }
      `}</style>

      {devToolsOpen && <DevToolsWarning T={T} />}

      {/* ── FLOATING TOP CONTROLS — no header bar, hidden until the mouse
          approaches the top edge, auto-hides again a moment later ── */}
      <div
        className="reader-floating-toolbar"
        style={{
          position: "absolute", top: topVisible ? "14px" : "-64px", left: "14px", right: aiExpanded ? "calc(42vw + 14px)" : "calc(25vw + 14px)",
          display: "flex", alignItems: "center", gap: "10px",
          zIndex: 30,
          opacity: topVisible ? 1 : 0,
          transition: "top 0.28s cubic-bezier(0.16,1,0.3,1), right 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease",
          pointerEvents: topVisible ? "auto" : "none",
        }}
      >
        <div className="reader-toolbar-actions" style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: T.toolbar, border: `1px solid ${T.toolbarBorder}`,
          borderRadius: "14px", padding: "6px", boxShadow: T.shadow,
        }}>
          <button aria-label="Go back" title="Go back" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => navigate(-1)} style={{ ...toolBtn(), width: "30px", height: "30px" }}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ width: "1px", height: "18px", background: T.toolbarBorder, margin: "0 2px" }} />
          <button aria-label={showSidebar ? "Close reading tools" : "Open reading tools"} title={showSidebar ? "Close reading tools" : "Open reading tools"} className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => setShowSidebar(v => !v)} style={toolBtn(showSidebar)}>
            <List size={15} />
          </button>
          <button
            aria-label={readingAloud ? "Stop reading aloud" : "Read this page aloud"}
            className="reader-listen-button bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            onClick={toggleReadAloud}
            title={readingAloud ? "Stop reading" : "Listen to this page"}
            style={toolBtn(readingAloud)}
          >
            {readAloudBusy
              ? <span style={{ width: "13px", height: "13px", border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              : readingAloud ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Book title chip */}
        <div className="reader-book-title" style={{
          display: "flex", alignItems: "center", gap: "5px", overflow: "hidden",
          background: T.toolbar, border: `1px solid ${T.toolbarBorder}`,
          borderRadius: "14px", padding: "8px 16px", boxShadow: T.shadow,
        }}>
          <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "-0.02em", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
            {book.title}
          </span>
          {book.author && (
            <>
              <span style={{ color: T.textFaint, fontSize: "12px", flexShrink: 0 }}>—</span>
              <span style={{ fontSize: "12px", color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>{book.author}</span>
            </>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Note indicator */}
        {notes[pageNumber] && (
          <div className="reader-note-indicator" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", borderRadius: "14px", background: T.accentBg, border: `1px solid ${T.accent}30`, boxShadow: T.shadow }}>
            <FileText size={11} color={T.accent} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, letterSpacing: "0.05em" }}>NOTE</span>
          </div>
        )}

        {/* Bookmark + Settings cluster */}
        <div className="reader-bookmark-settings" style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: T.toolbar, border: `1px solid ${T.toolbarBorder}`,
          borderRadius: "14px", padding: "6px", boxShadow: T.shadow,
          position: "relative",
        }}>
          <div style={{ position: "relative" }}>
            <button aria-label="Bookmarks" title="Bookmarks" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { setShowBmMenu(v => !v); setShowSettings(false); }} style={toolBtn(isBookmarked || showBmMenu)}>
              {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
            {showBmMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: "232px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "14px", boxShadow: T.shadow, zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: T.text }}>Bookmarks</span>
                  <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => isBookmarked ? removeBookmark(bookmarks.find(b => b.page === pageNumber)?._id) : setAddingBm(true)} style={{ fontSize: "12px", fontWeight: 700, color: isBookmarked ? "#ef4444" : T.accent, background: "none", border: "none", cursor: "pointer" }}>
                    {isBookmarked ? "Remove" : "+ Add"}
                  </button>
                </div>
                {addingBm && (
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: "6px" }}>
                    <input value={bmNote} onChange={e => setBmNote(e.target.value)} placeholder="Note…" autoFocus onKeyDown={e => e.key === "Enter" && confirmBm()}
                      style={{ flex: 1, minWidth: 0, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "12px", color: T.text, outline: "none" }} />
                    <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={confirmBm} style={{ fontSize: "12px", fontWeight: 700, color: T.accent, background: "none", border: "none", cursor: "pointer" }}>Save</button>
                  </div>
                )}
                <div style={{ maxHeight: "180px", overflowY: "auto", padding: "6px" }}>
                  {bookmarks.length === 0
                    ? <p style={{ fontSize: "12px", color: T.textFaint, textAlign: "center", padding: "16px" }}>No bookmarks yet.</p>
                    : bookmarks.map(bm => (
                      <div key={bm._id}
                        style={{ display: "flex", alignItems: "center", padding: "7px 10px", borderRadius: "8px", gap: "8px" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.hover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { goTo(bm.page); setShowBmMenu(false); }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: T.accent }}>p.{bm.page}</span>
                          {bm.note && <span style={{ fontSize: "12px", color: T.textMuted, marginLeft: "8px" }}>{bm.note}</span>}
                        </button>
                        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => removeBookmark(bm._id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint }}><X size={11} /></button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button aria-label="Reader settings" title="Reader settings" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { setShowSettings(v => !v); setShowBmMenu(false); }} style={toolBtn(showSettings)}>
              <Settings size={14} />
            </button>
            {showSettings && (
              <SettingsPanel T={T} themeId={themeId} setThemeId={setThemeId} scale={scale} setScale={(nextScale) => { setFitToWidth(false); setScale(nextScale); }} onClose={() => setShowSettings(false)} />
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar — floats over the reader, closed by default */}
        <LeftSidebar
          T={T} bookmarks={bookmarks} onNavigate={goTo} onRemoveBookmark={removeBookmark}
          currentPage={pageNumber} numPages={numPages} isOpen={showSidebar}
          toc={toc} pdfRef={pdfRef} notes={notes} saveNote={saveNote} deleteNote={deleteNote}
          onClose={() => setShowSidebar(false)}
        />

        {/* Center — PDF reading area */}
        <div
          ref={pdfContainerRef}
          className="reader-pdf-container"
          onTouchStart={handleReaderTouchStart}
          onTouchEnd={handleReaderTouchEnd}
          onTouchCancel={() => { touchStartRef.current = null; }}
          style={{
          flex: "1 1 0%", minWidth: 0, overflow: "auto", background: T.pdfBg,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "36px 24px 48px",
          position: "relative",
        }}
          onClick={() => { setShowSettings(false); setShowBmMenu(false); }}
        >
          {pdfError ? (
            <div style={{ textAlign: "center", marginTop: "80px" }}>
              <AlertCircle size={28} color="#ef4444" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#ef4444", fontWeight: 700 }}>Failed to load PDF.</p>
            </div>
          ) : (
            <Document
              key={`${pdfUrl}-${pdfLoadAttempt}`}
              file={pdfFile}
              onLoadSuccess={onDocumentLoad}
              onLoadError={handlePdfLoadError}
              loading={
                <div style={{ marginTop: "100px", textAlign: "center" }}>
                  <div style={{ width: "32px", height: "32px", border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ fontSize: "13px", color: T.textMuted }}>Loading PDF…</p>
                </div>
              }
            >
              <PageTransition pageKey={pageNumber} T={T}>
                <div style={{
                  position: "relative",  
                  boxShadow: T.pageShadow,
                  borderRadius: "3px",
                  overflow: "hidden",
                  background: "#fff",
                }}>
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderAnnotationLayer
                    renderTextLayer
                    onRenderSuccess={() => setPageLoaded(true)}
                    loading={null}
                  />
                  <WatermarkOverlay
                    fullName={fullName}
                    universityId={universityId}
                    page={pageNumber}
                    T={T}
                  />
                </div>
              </PageTransition>

              {numPages && (
                <div style={{ marginTop: "20px", padding: "6px 18px", borderRadius: "20px", background: T.surface, border: `1px solid ${T.border}`, fontSize: "12px", fontWeight: 600, color: T.textMuted, boxShadow: T.shadow, letterSpacing: "0.01em", userSelect: "none" }}>
                  Page {pageNumber} of {numPages}
                </div>
              )}
            </Document>
          )}
        </div>

        {/* Right — AI Panel (Library Tutor) — width transitions, never remounts.
            Sized in vw so "maximize" genuinely claims a big, stable share of
            the screen instead of a small fixed pixel column. */}
        {showMobileAI && (
          <div
            aria-hidden="true"
            className="reader-mobile-ai-backdrop"
            onClick={() => setShowMobileAI(false)}
            style={{ display: "none", position: "fixed", inset: 0, zIndex: 44, border: 0, background: "rgba(0,0,0,0.35)" }}
          />
        )}
        <div
          className={showMobileAI ? "reader-ai-panel reader-ai-panel-open" : "reader-ai-panel"}
          role={showMobileAI ? "dialog" : undefined}
          aria-modal={showMobileAI ? true : undefined}
          aria-label={showMobileAI ? "Library Tutor" : undefined}
          tabIndex={showMobileAI ? -1 : undefined}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
          style={{
            flex: aiExpanded ? "0 0 42vw" : "0 0 25vw",
            minWidth: aiExpanded ? "460px" : "300px",
            maxWidth: aiExpanded ? "760px" : "400px",
            overflow: "hidden", display: "flex", flexDirection: "column",
            minHeight: 0,
            borderLeft: `1px solid ${T.aiPanelBorder}`,
            transition: "flex-basis 0.25s cubic-bezier(0.16,1,0.3,1), min-width 0.25s ease, max-width 0.25s ease",
          }}>
          {showMobileAI && (
            <button
              type="button"
              aria-label="Close AI tutor"
              className="reader-mobile-ai-close"
              ref={mobileAICloseButtonRef}
              onClick={() => setShowMobileAI(false)}
              style={{ display: "none", alignItems: "center", justifyContent: "center", alignSelf: "flex-end", width: "36px", height: "36px", margin: "8px", border: `1px solid ${T.border}`, borderRadius: "9px", background: T.surface, color: T.text, cursor: "pointer", flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          )}
          <AIPanel
            bookTitle={book.title}
            currentPage={pageNumber}
            numPages={numPages}
            selectedText={selectedText}
            theme={T}
            onAskAboutSelection={aiTrigger}
            pdfRef={pdfRef}
            studentName={fullName}
            expanded={aiExpanded}
            onToggleExpand={() => setAiExpanded(v => !v)}
          />
        </div>
      </div>

      {/* ── BOTTOM TOOLBAR — always visible: page nav, zoom, progress ── */}
      <div className={`reader-bottom-toolbar${showMobileAI ? " reader-bottom-toolbar-ai-open" : ""}`} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px", height: "50px",
        background: T.toolbar, borderTop: `1px solid ${T.toolbarBorder}`,
        flexShrink: 0,
      }}>
        {/* Zoom */}
        <div className="reader-zoom-controls" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <button aria-label="Zoom out" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { setFitToWidth(false); setScale(s => Math.max(0.6, +(s - 0.15).toFixed(2))); }} style={toolBtn(false, true)}><ZoomOut size={13} /></button>
          <span style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, minWidth: "40px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {Math.round(scale * 100)}%
          </span>
          <button aria-label="Zoom in" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => { setFitToWidth(false); setScale(s => Math.min(3.0, +(s + 0.15).toFixed(2))); }} style={toolBtn(false, true)}><ZoomIn size={13} /></button>
          <button aria-label="Fit page to width" title="Fit page to width" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => setFitToWidth(true)} style={{ ...toolBtn(false, true), marginLeft: "2px" }}><RotateCcw size={11} /></button>
        </div>

        {/* Page navigation */}
        <div className="reader-page-controls" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button aria-label="Previous page" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1}
            style={{ ...toolBtn(), opacity: pageNumber <= 1 ? 0.3 : 1, cursor: pageNumber <= 1 ? "not-allowed" : "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <div className="reader-page-number" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px" }}>
            <input type="number" aria-label="Current page" value={pageNumber} min={1} max={numPages ?? 1}
              onChange={e => goTo(Number(e.target.value))}
              style={{ width: "38px", textAlign: "center", background: "transparent", border: "none", outline: "none", fontSize: "13px", fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}
            />
            <span style={{ fontSize: "12px", color: T.textFaint }}>/</span>
            <span style={{ fontSize: "12.5px", fontWeight: 500, color: T.textMuted }}>{numPages ?? "—"}</span>
          </div>
          <button aria-label="Next page" className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group" onClick={() => goTo(pageNumber + 1)} disabled={!numPages || pageNumber >= numPages}
            style={{ ...toolBtn(), opacity: (!numPages || pageNumber >= numPages) ? 0.3 : 1, cursor: (!numPages || pageNumber >= numPages) ? "not-allowed" : "pointer" }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="reader-keyboard-hint" style={{ display: "flex", alignItems: "center", color: T.textFaint, fontSize: "11px", gap: "4px", letterSpacing: "0.01em" }}>
          <span>Use</span>
          <span style={{ fontFamily: "monospace" }}>▲</span>
          <span>or</span>
          <span style={{ fontFamily: "monospace" }}>▼</span>
          <span>for line scroll,</span>
          <span style={{ fontFamily: "monospace" }}>PgUp</span>
          <span>/</span>
          <span style={{ fontFamily: "monospace" }}>PgDn</span>
          <span>for page scroll</span>
        </div>

        {/* Stats */}
        <div className="reader-progress-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {timeLeft && (
            <span className="reader-time-left" style={{ fontSize: "11px", color: T.textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={11} /> {timeLeft}
            </span>
          )}
          <div
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`Page ${pageNumber} of ${numPages ?? "unknown"}, ${pct}%`}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <div style={{ width: "64px", height: "3px", background: T.border, borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: T.accent, borderRadius: "2px", transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: T.accent, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={showMobileAI ? "Close AI tutor" : "Open AI tutor"}
          aria-expanded={showMobileAI}
          className="reader-mobile-ai-button"
          ref={mobileAIButtonRef}
          onClick={() => setShowMobileAI((isOpen) => !isOpen)}
          style={{ ...toolBtn(showMobileAI, true), display: "none" }}
        >
          <Sparkles size={14} />
        </button>
      </div>
    </div>
  );
};

export default BookReader;
