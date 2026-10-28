/**
 * MeetingRoom.jsx — Production-grade video meeting room.
 *
 * COLOR RULES: ONLY #2C2DE0 green, white, and black.
 * No blue, purple, indigo, teal, violet anywhere.
 *
 * Changes:
 * - Translates dynamically using useLanguage (Somali and English supported).
 * - Restructured sidebar to exactly 5 tabs:
 *   1. Chat
 *   2. Participants (People)
 *   3. Whiteboard (Board)
 *   4. Notes
 *   5. AI Assistant
 * - Moved "Files" to the toolbar (bottom Controls) as a separate modal.
 * - Moved "Focus Timer" to the top meeting toolbar (CompactFocusTimer).
 * - Responsive layout shows up to four participant cards in the main area;
 *   additional participants remain accessible from the count and people panel.
 * - Presentation mode gives the shared screen the main stage and pins the
 *   presenter in a small tile without duplicating them in the participant grid.
 * - Classroom screen-share permission flow:
 *   • Only the host can start sharing immediately.
 *   • A student's request notifies the host, who can Accept/Deny.
 *   • If the host is already presenting, Accept stops the host's share first
 *     — only one screen is ever live at a time.
 */
import React, {
  useState, useEffect, useCallback, useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, Phone, MessageSquare, Users, Paperclip,
  PenLine, Bot, Settings, Lock, Unlock, Copy,
  ShieldCheck, Wifi, ChevronRight, ChevronLeft,
  Download, X, CheckCircle2, AlertCircle, UserCheck,
  Clock, RefreshCw, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import socket from "@/socket.js";

import {
  getMeetingByCode,
  joinMeeting,
  startMeeting,
  endMeeting,
  updateMeetingSettings,
  onMeetingUpdated,
  onMeetingEnded,
} from "@/api/meetingApi";

import { useMeetingWebRTC } from "./meetings/useMeetingWebRTC";
import { VideoTile } from "./meetings/VideoTile";
import { ChatPanel } from "./meetings/ChatPanel";
import { ParticipantsPanel } from "./meetings/ParticipantsPanel";
import { FilesPanel } from "./meetings/FilesPanel";
import { Whiteboard } from "./meetings/Whiteboard";
import { NotesPanel } from "./meetings/NotesPanel";
import { AIAssistant } from "./meetings/AIAssistant";
import { FocusTimer, CompactFocusTimer } from "./meetings/FocusTimer";
import { Spinner, resolvePhoto } from "./ui";
import { playChatMessage } from "./meetings/meetingSounds.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Control Button — always-dark meeting footer
// ─────────────────────────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, pending, label, badge, children, disabled, id }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={label}
        aria-label={label}
        className={[
          "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40",
          danger
            ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_0_#7f1d1d] hover:shadow-[0_2px_0_#7f1d1d] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
            : active
              ? "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:shadow-[0_2px_0_#1E1FAA] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
              : pending
                ? "bg-[#2C2DE0]/20 text-[#2C2DE0] border border-[#2C2DE0]/40 animate-pulse"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10",
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[#2C2DE0] text-white text-[9px] font-black flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
      <span className="text-gray-400 dark:text-white/40 text-[9px] font-semibold hidden sm:block">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Modal — green/white/black only
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({ open, onClose, meeting, isHost, onToggleLock }) {
  const [devices, setDevices] = useState({ cameras: [], mics: [] });
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);

  useEffect(() => {
    if (!open) return;
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      setDevices({
        cameras: devs.filter((d) => d.kind === "videoinput"),
        mics: devs.filter((d) => d.kind === "audioinput"),
      });
    }).catch(() => { });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-black border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-black text-sm flex items-center gap-2">
            <Settings size={15} className="text-[#2C2DE0]" /> Settings
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Device selectors */}
          {[
            { label: "Camera", items: devices.cameras, placeholder: "Default camera" },
            { label: "Microphone", items: devices.mics, placeholder: "Default microphone" },
          ].map(({ label, items, placeholder }) => (
            <div key={label}>
              <label className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1.5 block">{label}</label>
              <select className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#181818] border border-white/10 text-black dark:text-white text-xs focus:outline-none focus:border-[#2C2DE0]">
                <option value="">{placeholder}</option>
                {items.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `${label} ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Toggles */}
          {[
            { label: "Noise Suppression", sub: "Filter background noise", val: noiseSuppression, set: setNoiseSuppression },
            { label: "HD Video (720p)", sub: "Higher quality, more bandwidth", val: hdVideo, set: setHdVideo },
          ].map(({ label, sub, val, set }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-white/40 text-[10px]">{sub}</p>
              </div>
              <button
                onClick={() => set(!val)}
                className={`relative w-10 h-5 rounded-full transition-all ${val ? "bg-[#2C2DE0]" : "bg-white dark:bg-gray-900/20"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow transition-all ${val ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}

          {/* Host controls */}
          {isHost && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Host Controls</p>
              <button
                onClick={() => { onToggleLock(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900/5 hover:bg-white dark:bg-gray-900/10 border border-white/10 text-white text-xs font-semibold transition-colors"
              >
                {meeting?.isLocked
                  ? <Unlock size={13} className="text-[#2C2DE0]" />
                  : <Lock size={13} className="text-white/50" />
                }
                {meeting?.isLocked ? "Unlock Room" : "Lock Room"}
              </button>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-5 py-3 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Files Modal
// ─────────────────────────────────────────────────────────────────────────────
function FilesModal({ open, onClose, isHost, userName, meetingCode, sharedFiles, onSharedFilesChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-black border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-black text-sm flex items-center gap-2">
            <Paperclip size={15} className="text-[#2C2DE0]" /> Shared Files
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <FilesPanel
            isHost={isHost}
            userName={userName}
            meetingCode={meetingCode}
            sharedFiles={sharedFiles}
            onSharedFilesChange={onSharedFilesChange}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-Session Summary Screen
// Host/teacher  → full attendance dashboard (university ID, time stayed, CSV)
// Student       → "You left" banner + downloadable notes & shared resources
// ─────────────────────────────────────────────────────────────────────────────
function SummaryScreen({ meeting, duration, onReturn, attendanceLog = [], notes = "", files = [], isHost = false, user = null, endedByHost = false }) {
  const fmtDur = (s) => {
    if (!s) return "< 1m";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
    return parts.join(" ");
  };

  const sorted = useMemo(() => [...attendanceLog].sort((a, b) =>
    (a.universityId ?? "").localeCompare(b.universityId ?? "")
  ), [attendanceLog]);

  const exportCSV = useCallback(() => {
    const headers = ["University ID", "Name", "Role", "Time Stayed", "Joined At", "Left At"];
    const rows = sorted.map((p) => [
      p.universityId || "N/A",
      p.name,
      p.role,
      fmtDur(p.totalDurationSeconds),
      p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString() : "N/A",
      p.leftAt ? new Date(p.leftAt).toLocaleTimeString() : "N/A",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `attendance_${meeting?.meetingCode || "class"}.csv`;
    a.click();
    toast.success("CSV exported");
  }, [meeting, sorted]);

  const exportText = () => {
    const lines = [
      `Meeting: ${meeting?.title}`,
      `Course:  ${meeting?.course}`,
      `Code:    ${meeting?.meetingCode}`,
      `Duration:${fmt(duration)}`,
      "",
      "Attendance (sorted by University ID):",
      ...sorted.map((p) => `  ${p.universityId || "N/A"} | ${p.name} | ${p.role} | ${fmtDur(p.totalDurationSeconds)}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    a.download = `summary_${meeting?.meetingCode}.txt`;
    a.click();
    toast.success("Text report exported");
  };

  const exportNotes = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([notes], { type: "text/markdown" }));
    a.download = `notes_${meeting?.meetingCode || "class"}.md`;
    a.click();
    toast.success("Notes exported");
  };

  const currentUserId = (user?._id ?? user?.id ?? "").toString();
  const myRecord = attendanceLog.find((p) => (p.user ?? "").toString() === currentUserId);
  const myDuration = myRecord ? myRecord.totalDurationSeconds : duration;
  const myJoinedAt = myRecord ? myRecord.joinedAt : null;
  const myLeftAt = myRecord ? myRecord.leftAt : null;

  const exportMyAttendance = () => {
    const rec = myRecord || {
      universityId: user?.universityId || "N/A",
      name: user?.name || "N/A",
      role: "participant",
      totalDurationSeconds: duration,
      joinedAt: null,
      leftAt: null,
    };
    const lines = [
      `Personal Attendance Record`,
      `Meeting: ${meeting?.title}`,
      `Course:  ${meeting?.course || "N/A"}`,
      `Code:    ${meeting?.meetingCode}`,
      `-----------------------------`,
      `Student ID: ${rec.universityId || "N/A"}`,
      `Name:       ${rec.name}`,
      `Role:       ${rec.role}`,
      `Time Stayed: ${fmtDur(rec.totalDurationSeconds)}`,
      `Joined At:  ${rec.joinedAt ? new Date(rec.joinedAt).toLocaleString() : "N/A"}`,
      `Left At:    ${rec.leftAt ? new Date(rec.leftAt).toLocaleString() : "N/A"}`,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    a.download = `my_attendance_${meeting?.meetingCode || "class"}.txt`;
    a.click();
    toast.success("Personal attendance report exported");
  };

  useEffect(() => {
    if (isHost && sorted.length > 0) {
      exportCSV();
    }
  }, [isHost, sorted.length, exportCSV]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0d0d0d] text-black dark:text-white flex flex-col items-center justify-start z-50 p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full space-y-8 py-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#2C2DE0] flex items-center justify-center mx-auto shadow-lg shadow-[#2C2DE0]/30">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          {endedByHost || isHost ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {endedByHost ? "Meeting has ended" : "Session Ended"}
              </h1>
              <p className="text-black/50 dark:text-white/50 text-sm">{meeting?.title} · {meeting?.course}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">You Left the Meeting</h1>
              <p className="text-black/50 dark:text-white/50 text-sm">{meeting?.title}</p>
              <p className="text-[#2C2DE0] text-xs font-semibold">Session duration: {fmt(duration)}</p>
            </>
          )}
        </div>

        {!isHost && (
          <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black flex items-center gap-1.5 text-[#2C2DE0]">
              <Clock size={15} /> Your Attendance Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-black/40 dark:text-white/40 text-[9px] uppercase font-bold">University ID</p>
                <p className="font-mono font-bold mt-0.5">{myRecord?.universityId || user?.universityId || "—"}</p>
              </div>
              <div>
                <p className="text-black/40 dark:text-white/40 text-[9px] uppercase font-bold">Time Stayed</p>
                <p className="font-bold mt-0.5 text-[#2C2DE0]">{fmtDur(myDuration)}</p>
              </div>
              <div>
                <p className="text-black/40 dark:text-white/40 text-[9px] uppercase font-bold">Joined At</p>
                <p className="font-semibold mt-0.5">
                  {myJoinedAt ? new Date(myJoinedAt).toLocaleTimeString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-black/40 dark:text-white/40 text-[9px] uppercase font-bold">Left At</p>
                <p className="font-semibold mt-0.5">
                  {myLeftAt ? new Date(myLeftAt).toLocaleTimeString() : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={exportMyAttendance}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                <Download size={11} /> Export My Attendance (.txt)
              </button>
            </div>
          </div>
        )}

        {isHost && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Duration", value: fmt(duration) },
                { label: "Students", value: sorted.length },
                { label: "Course", value: meeting?.course ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-xl font-black text-[#2C2DE0] truncate">{value}</p>
                  <p className="text-black/40 dark:text-white/40 text-[10px] uppercase font-bold mt-0.5 tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <h2 className="text-base font-black flex items-center gap-2">
                <UserCheck size={17} className="text-[#2C2DE0]" />
                Attendance Log
                <span className="text-xs font-normal text-black/40 dark:text-white/40">(sorted by University ID)</span>
              </h2>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150">
                  <Download size={11} /> CSV
                </button>
                <button onClick={exportText} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150">
                  <Download size={11} /> TXT
                </button>
              </div>
            </div>

            {sorted.length === 0 ? (
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-10 text-center text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10">
                <Clock size={28} className="mx-auto mb-3 opacity-40" />
                <p className="text-xs font-semibold">Attendance data is being saved…</p>
                <p className="text-[10px] mt-1 opacity-70">It may take a moment to appear.</p>
              </div>
            ) : (
              <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                        <th className="px-4 py-3 font-black uppercase tracking-wider text-[10px] text-[#2C2DE0]">University ID</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Name</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Role</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Time Stayed</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {sorted.map((p, i) => (
                        <tr key={i} className="hover:bg-black/5 dark:hover:bg-white dark:bg-gray-900/5 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#2C2DE0]">{p.universityId || "—"}</td>
                          <td className="px-4 py-3 font-semibold">{p.name}</td>
                          <td className="px-4 py-3 capitalize text-black/50 dark:text-white/50">{p.role}</td>
                          <td className="px-4 py-3 font-bold">{fmtDur(p.totalDurationSeconds)}</td>
                          <td className="px-4 py-3 text-black/40 dark:text-white/40">
                            {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!isHost && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: 320 }}>
              <div className="flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 shrink-0">
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <PenLine size={14} className="text-[#2C2DE0]" /> Session Notes
                </h3>
                {notes && (
                  <button
                    onClick={exportNotes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2C2DE0] text-white text-[11px] font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
                  >
                    <Download size={10} /> Save .md
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed text-black/70 dark:text-white/70 bg-white dark:bg-[#111]">
                {notes || "No notes were taken during this session."}
              </div>
            </div>

            <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: 320 }}>
              <div className="flex items-center px-4 py-3 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 shrink-0">
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <Paperclip size={14} className="text-[#2C2DE0]" /> Shared Resources
                </h3>
                <span className="ml-auto text-[10px] text-black/40 dark:text-white/40 font-semibold">{files.length} file{files.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white dark:bg-[#111]">
                {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/30 dark:text-white/30 gap-2">
                    <Paperclip size={24} className="opacity-40" />
                    <p className="text-xs">No files were shared.</p>
                  </div>
                ) : (
                  files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/8 dark:hover:bg-white dark:bg-gray-900/8 transition-all group">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold truncate">{f.name}</p>
                        <p className="text-[9px] text-black/40 dark:text-white/40 mt-0.5">By {f.uploader}</p>
                      </div>
                      {f.blobUrl && (
                        <button
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = f.blobUrl;
                            a.download = f.name;
                            a.click();
                          }}
                          className="p-2 rounded-xl bg-[#2C2DE0]/10 hover:bg-[#2C2DE0]/20 text-[#2C2DE0] transition-colors shrink-0"
                          title="Download"
                        >
                          <Download size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-xs mx-auto pt-2">
          <button
            onClick={onReturn}
            className="w-full px-5 py-3 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
          >
            {isHost ? "Back to Meetings" : "Return to Meetings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MeetingRoom
// ─────────────────────────────────────────────────────────────────────────────
export default function MeetingRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingLoadError, setMeetingLoadError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Joining meeting…");
  const [timer, setTimer] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [endedByHost, setEndedByHost] = useState(false);
  const [pinned, setPinned] = useState(null); // socketId
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(min-width: 640px)").matches
  );
  const [activeTab, setActiveTab] = useState("chat");
  const [unread, setUnread] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingFiles, setMeetingFiles] = useState([]);

  const currentUserId = (user?._id ?? user?.id ?? "").toString();
  // Robust host detection: some backends only populate `meeting.isHost` on the
  // very first fetch, or key host identity differently (raw id vs populated
  // user object). Fall back to comparing the meeting's host reference against
  // the current user so a real host is never mistakenly treated as a guest
  // (which would route them through the "request permission" screen-share flow).
  const isHost = useMemo(() => {
    if (meeting?.isHost === true) return true;
    const hostRef = meeting?.host ?? meeting?.hostId ?? meeting?.teacher ?? null;
    if (!hostRef || !currentUserId) return false;
    const hostId = typeof hostRef === "object" ? (hostRef._id ?? hostRef.id) : hostRef;
    return (hostId ?? "").toString() === currentUserId;
  }, [meeting, currentUserId]);

  const localRole = useMemo(() => {
    if (isHost) return "host";
    if (user?.role === "teacher") return "presenter";
    return "participant";
  }, [isHost, user?.role]);

  // Sidebar Tabs Config — Exactly 5 translated tabs
  const TABS = useMemo(() => [
    { id: "chat", icon: MessageSquare, label: t("chat") },
    { id: "participants", icon: Users, label: t("participants") },
    { id: "whiteboard", icon: PenLine, label: t("whiteboard") },
    { id: "notes", icon: PenLine, label: t("notes") },
    { id: "ai", icon: Bot, label: t("Ai Assistant") },
  ], [t]);

  // ─── WebRTC Hook ───────────────────────────────────────────────────────────
  const webrtc = useMeetingWebRTC({
    meetingCode: code,
    user,
    role: localRole,
    enabled: Boolean(meeting && !showSummary),
    isHost,
  });
  const leaveMeetingRoom = webrtc.leaveRoom;
  const toggleMeetingMute = webrtc.toggleMute;
  const toggleMeetingCamera = webrtc.toggleCamera;
  const toggleMeetingHand = webrtc.toggleHand;
  const sendMeetingHostAction = webrtc.hostAction;
  const respondToScreenShareRequest = webrtc.respondToScreenShareRequest;
  const pendingScreenShareRequest = webrtc.screenShareRequest;

  const triggerShowSummary = useCallback((message = "Leaving meeting…", { hostEnded = false } = {}) => {
    setEndedByHost(hostEnded);
    setLoadingMessage(message);
    setShowSummary(true);
    getMeetingByCode(code)
      .then((r) => {
        if (r.success) setMeeting(r.meeting);
      })
      .catch((err) => {
        console.error("Error fetching final meeting details:", err);
      });
  }, [code]);

  // ─── Load meeting ─────────────────────────────────────────────────────────
  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setMeetingLoadError("");
    setMeeting(null);
    try {
      const r = await getMeetingByCode(code);
      if (!r.success) throw new Error("not found");
      if (r.meeting.endedAt) {
        setMeeting(r.meeting);
        setEndedByHost(true);
        setShowSummary(true);
        return;
      }
      let joinedMeeting = r.meeting;
      if (!r.meeting.isHost) {
        const joined = await joinMeeting(code);
        if (!joined.success) throw new Error("Unable to join this meeting.");
        joinedMeeting = joined.meeting || r.meeting;
      }
      setMeeting(joinedMeeting);
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to load this meeting.";
      setMeetingLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { loadMeeting(); }, [loadMeeting]);

  // ─── Socket listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const offU = onMeetingUpdated((m) => {
      if (m?.meetingCode?.toUpperCase() === code?.toUpperCase()) setMeeting(m);
    });
    const offE = onMeetingEnded((p) => {
      if (p?.meetingCode?.toUpperCase() === code?.toUpperCase()) {
        toast.info("Meeting has ended");
        leaveMeetingRoom();
        triggerShowSummary("Meeting has ended", { hostEnded: true });
      }
    });
    const onKicked = () => {
      toast.error("You were removed from the meeting");
      navigate("/community/meetings");
    };
    const onForceTab = (tab) => {
      setActiveTab(tab);
      setSidebarOpen(true);
    };
    window.addEventListener("meeting:kicked", onKicked);
    socket.on("meeting:force-tab", onForceTab);
    return () => {
      offU();
      offE();
      window.removeEventListener("meeting:kicked", onKicked);
      socket.off("meeting:force-tab", onForceTab);
    };
  }, [code, navigate, leaveMeetingRoom, triggerShowSummary]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meeting?.isActive) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [meeting?.isActive]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "m" || e.key === "M") toggleMeetingMute();
      if (e.key === "c" || e.key === "C") toggleMeetingCamera();
      if (e.key === "h" || e.key === "H") toggleMeetingHand();
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMeetingMute, toggleMeetingCamera, toggleMeetingHand]);

  // ─── Unread chat badge + sound ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "chat") { setUnread(0); return; }
    const handler = () => {
      setUnread((n) => n + 1);
      playChatMessage();
    };
    socket.on("meeting:chat", handler);
    return () => socket.off("meeting:chat", handler);
  }, [activeTab]);

  const handleHostAction = useCallback((action, sid, uid) => {
    sendMeetingHostAction(action, sid, uid);
  }, [sendMeetingHostAction]);

  const handleStartMeeting = async () => {
    try {
      const r = await startMeeting(meeting._id);
      if (r.success) { setMeeting(r.meeting); toast.success("Meeting started!"); }
    } catch { toast.error("Failed to start meeting"); }
  };

  const handleEndMeeting = async () => {
    if (!window.confirm("End meeting for everyone?")) return;
    try {
      await endMeeting(meeting._id);
      webrtc.leaveRoom();
      triggerShowSummary("Meeting has ended", { hostEnded: true });
    } catch { toast.error("Failed to end meeting"); }
  };

  const handleLeave = () => {
    webrtc.leaveRoom();
    triggerShowSummary("Leaving meeting…");
  };

  const handleToggleLock = async () => {
    try {
      const r = await updateMeetingSettings(meeting._id, { isLocked: !meeting.isLocked });
      if (r.success) { setMeeting(r.meeting); toast.success(r.meeting.isLocked ? "Room locked" : "Room unlocked"); }
    } catch { toast.error("Failed to update settings"); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/community/meetings/room/${code}`);
    toast.success("Invite link copied");
  };

  // ─── Screen-share permission handlers (host side) ─────────────────────────
  // Accepting a request while the host is already presenting stops the host's
  // own share first — the app never allows two live screens at once.
  const activePresenter = webrtc.participants.find((p) => p.isScreenSharing);
  const handleAcceptScreenShareRequest = useCallback(() => {
    if (!pendingScreenShareRequest) return;
    if (activePresenter) {
      toast.info("Stop the current screen share before approving another presenter.");
      return;
    }
    respondToScreenShareRequest(true);
  }, [activePresenter, pendingScreenShareRequest, respondToScreenShareRequest]);

  const handleDenyScreenShareRequest = useCallback(() => {
    respondToScreenShareRequest(false);
  }, [respondToScreenShareRequest]);

  const handleScreenShareClick = () => {
    if (!meeting?.allowScreenShare && !isHost) {
      toast.error("Screen sharing is disabled by the host");
      return;
    }
    webrtc.toggleScreenShare();
  };

  // ─── Build tile list ──────────────────────────────────────────────────────
  const allTiles = useMemo(() => {
    const localPhoto = resolvePhoto(user?.photo);
    const isScreenTrack = (t) =>
      t?.label?.toLowerCase().includes("screen") || t?.label?.toLowerCase().includes("display");

    const localTiles = [];
    const localSrc = webrtc.localStream;

    // Camera/Avatar tile
    localTiles.push({
      socketId: "local",
      stream: localSrc,
      name: user?.name ?? "You",
      photo: localPhoto,
      role: localRole,
      muted: webrtc.isMuted,
      isLocal: true,
      handRaised: webrtc.handRaised,
      isScreenSharing: false,
      universityId: user?.universityId,
          hasVideo: webrtc.hasCameraOn,
          connectionStatus: "connected",
      isSpeaking: webrtc.speakingParticipants?.["local"] ?? false,
      isPresenter: false,
    });

    if (webrtc.isScreenSharing && webrtc.screenStream?.current) {
      localTiles.push({
        socketId: "local_screen",
        stream: new MediaStream([...webrtc.screenStream.current.getVideoTracks()]),
        name: `${user?.name ?? "You"} (Screen)`,
        photo: null,
        role: localRole,
        muted: true,
        isLocal: true,
        handRaised: false,
        isScreenSharing: true,
        universityId: null,
        hasVideo: true,
        isSpeaking: false,
        isPresenter: true,
      });
    }

    // Remote tiles
    const remoteTiles = webrtc.participants
      .filter((p) => p.userId?.toString() !== currentUserId)
      .flatMap((p) => {
        const stream = webrtc.remoteStreams?.[p.socketId];
        const vTracks = stream?.getVideoTracks() || [];

        let screenTrack = null;
        let cameraTrack = null;

        if (p.isScreenSharing) {
          screenTrack = p.screenTrackId ? vTracks.find((t) => t.id === p.screenTrackId) : (vTracks.find(isScreenTrack) || vTracks[0]);
          cameraTrack = p.cameraTrackId ? vTracks.find((t) => t.id === p.cameraTrackId) : (vTracks.find((t) => t !== screenTrack) ?? null);
        } else {
          cameraTrack = vTracks[0];
        }

        const tiles = [];

        // Camera tile
        tiles.push({
          socketId: p.socketId,
          stream: cameraTrack && stream ? new MediaStream([...stream.getAudioTracks(), cameraTrack]) : stream,
          name: p.name,
          photo: resolvePhoto(p.photo),
          role: p.role,
          muted: p.isMuted,
          isLocal: false,
          handRaised: p.handRaised,
          isScreenSharing: false,
          universityId: p.universityId,
          hasVideo: Boolean(p.hasCameraOn),
          connectionStatus: p.connectionStatus || "connected",
          isSpeaking: webrtc.speakingParticipants?.[p.socketId] ?? false,
          isPresenter: false,
        });

        // Screen tile
        if (p.isScreenSharing && screenTrack) {
          tiles.push({
            socketId: p.socketId + "_screen",
            stream: new MediaStream([screenTrack]),
            name: `${p.name} (Screen)`,
            photo: null,
            role: p.role,
            muted: true,
            isLocal: false,
            handRaised: false,
            isScreenSharing: true,
            universityId: null,
            hasVideo: true,
            isSpeaking: false,
            isPresenter: true,
          });
        }
        return tiles;
      });

    return [...localTiles, ...remoteTiles];
    // IMPORTANT: depend on the specific pieces of webrtc state that actually
    // affect the tile list — never on `webrtc` itself. useMeetingWebRTC returns
    // a brand-new object literal on every call, so depending on `webrtc`
    // recomputed (and re-wrapped every remote camera track in a fresh
    // MediaStream) on every parent re-render — including the once-a-second
    // timer tick — which reset <video>.srcObject constantly and produced the
    // black-screen "blink" every second.
  }, [
    webrtc.localStream,
    webrtc.remoteStreams,
    webrtc.participants,
    webrtc.isMuted,
    webrtc.hasCameraOn,
    webrtc.handRaised,
    webrtc.isScreenSharing,
    webrtc.screenStream,
    webrtc.speakingParticipants,
    user,
    localRole,
    currentUserId,
  ]);

  // ─── Layout Engine ────────────────────────────────────────────────────────
  const screenTile = allTiles.find((t) => t.isScreenSharing);
  const pinnedTile = pinned ? allTiles.find((t) => t.socketId === pinned) : null;

  // Presenter should not have their own screen share fill their view by default
  const focusTile = screenTile || pinnedTile || null;
  const focusOwnerSocketId = focusTile?.socketId === "local_screen"
    ? "local"
    : focusTile?.socketId?.endsWith("_screen")
      ? focusTile.socketId.slice(0, -"_screen".length)
      : null;
  const presenterTile = focusOwnerSocketId
    ? allTiles.find((tile) => tile.socketId === focusOwnerSocketId && !tile.isScreenSharing)
    : null;

  // Filter out local screen share from grid to prevent infinite mirroring
  const gridTiles = useMemo(() => {
    return allTiles.filter((t) => t.socketId !== "local_screen" || pinned === "local_screen");
  }, [allTiles, pinned]);

  const visibleGridTiles = useMemo(() => {
    return gridTiles
      .filter((t) => !t.isScreenSharing)
      .filter((t) => !focusOwnerSocketId || t.socketId !== focusOwnerSocketId)
      .slice(0, 4);
  }, [gridTiles, focusOwnerSocketId]);

  const someoneElseSharing = webrtc.participants.some((p) => p.isScreenSharing) && !webrtc.isScreenSharing;
  const cameraBlockedByShare = someoneElseSharing;

  // Keep the main stage to four predictable video tiles; all attendees remain
  // available in the participant panel.
  const gridClass = useMemo(() => {
    return visibleGridTiles.length <= 1
      ? "grid-cols-1 max-w-4xl"
      : "grid-cols-1 sm:grid-cols-2 max-w-6xl";
  }, [visibleGridTiles.length]);

  if (showSummary) {
    return (
      <SummaryScreen
        meeting={meeting}
        duration={timer}
        onReturn={() => navigate("/community/meetings")}
        attendanceLog={meeting?.attendanceLog ?? []}
        notes={meetingNotes}
        files={meetingFiles}
        isHost={isHost}
        user={user}
        endedByHost={endedByHost}
      />
    );
  }

  const joining = loading || Boolean(meeting) && (
    webrtc.joinStatus === "joining" || webrtc.joinStatus === "idle"
  );
  if (joining && !webrtc.connectionError) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4 px-6">
        <Spinner size={36} className="text-[#2C2DE0]" />
        <p className="text-white/50 text-sm font-semibold animate-pulse">{loadingMessage}</p>
      </div>
    );
  }

  if (!loading && !meeting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4 px-6 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-white text-sm font-semibold">
          {meetingLoadError || webrtc.connectionError || "Unable to load this meeting."}
        </p>
        <button
          type="button"
          onClick={loadMeeting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-dvh bg-[#F3F4F6] dark:bg-black flex flex-col text-black dark:text-white z-40 overflow-hidden">

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between gap-2 px-2 sm:px-4 py-2.5 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-white/10 z-30 shrink-0">
        {/* Left: Meeting info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#2C2DE0]/20 flex items-center justify-center shrink-0">
            <Video size={15} className="text-[#2C2DE0]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-black dark:text-white font-black text-sm truncate max-w-[92px] sm:max-w-xs">
              {meeting?.title ?? "Class Meeting"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-gray-500 dark:text-white/40 text-[10px] font-mono">{meeting?.meetingCode}</span>
              <button onClick={copyLink} className="p-1 rounded-lg bg-[#2C2DE0]/10 hover:bg-[#2C2DE0]/20 text-[#2C2DE0] transition-colors" title="Copy Invite Link">
                <Copy size={10} />
              </button>
              {meeting?.course && (
                <>
                  <span className="text-gray-300 dark:text-white/20">·</span>
                  <span className="hidden sm:inline text-gray-500 dark:text-white/40 text-[10px]">{meeting.course}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Toolbar items (Active meeting time + COMPACT FOCUS TIMER) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {meeting?.isActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C2DE0] animate-pulse" />
              <span className="text-black dark:text-white font-mono text-xs font-bold">{fmt(timer)}</span>
            </div>
          )}

          {/* Compact focus timer directly in the header toolbar */}
          <CompactFocusTimer isHost={isHost} meetingCode={code} />

          <span className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#2C2DE0] text-[10px] font-black uppercase">
            <ShieldCheck size={10} /> Encrypted
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 text-[10px] border border-gray-200 dark:border-white/10">
            <Wifi size={11} className="text-[#2C2DE0]" /> HD
          </div>
          {isHost && !meeting?.isActive && (
            <button
              onClick={handleStartMeeting}
              className="px-2 sm:px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-[10px] sm:text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 whitespace-nowrap"
            >
              Start Meeting
            </button>
          )}
        </div>
      </header>

      {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Video Area ────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 relative bg-gray-100 dark:bg-black overflow-hidden">
          {(webrtc.networkStatus === "offline" || webrtc.networkStatus === "reconnecting" || webrtc.joinStatus === "reconnecting") && (
            <div role="status" className="absolute left-1/2 top-4 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-400/40 bg-black/90 px-4 py-2.5 text-xs font-bold text-amber-200 shadow-lg">
              <Wifi size={14} />
              {webrtc.networkStatus === "offline" ? "No internet connection" : "Reconnecting…"}
            </div>
          )}
          {webrtc.connectionError && (
            <div role="alert" className="absolute left-1/2 top-4 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-900 dark:bg-[#111] dark:text-red-300">
              <span>{webrtc.connectionError}</span>
              <button
                type="button"
                onClick={webrtc.retryJoin}
                className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2DE0]"
              >
                Retry
              </button>
            </div>
          )}
          {/* Waiting banner */}
          {!meeting?.isActive && !isHost && (
            <div className="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
              <div className="flex items-center gap-2.5 bg-white dark:bg-black border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl max-w-sm shadow-lg">
                <AlertCircle size={15} className="text-[#2C2DE0] shrink-0" />
                <p className="text-black dark:text-white text-xs font-semibold">Waiting for the host to start…</p>
              </div>
            </div>
          )}

          {/* Presenter info banners */}
          {webrtc.isScreenSharing && !focusTile && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/30 px-4 py-2 rounded-2xl shadow-xl">
              <Monitor size={14} className="text-[#2C2DE0]" />
              <span className="text-white text-xs font-semibold">You are presenting to everyone</span>
              <button
                onClick={() => setPinned("local_screen")}
                className="text-xs text-[#2C2DE0] hover:text-[#3A3BE8] font-bold px-2 py-0.5 rounded hover:bg-[#2C2DE0]/10 transition-colors"
              >
                View Presentation
              </button>
              <button
                onClick={webrtc.toggleScreenShare}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Stop Sharing
              </button>
            </div>
          )}

          {webrtc.isScreenSharing && focusTile && focusTile.socketId === "local_screen" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/30 px-4 py-2 rounded-2xl shadow-xl">
              <Monitor size={14} className="text-[#2C2DE0]" />
              <span className="text-white text-xs font-semibold">Viewing your own presentation</span>
              <button
                onClick={() => setPinned(null)}
                className="text-xs text-[#2C2DE0] hover:text-[#3A3BE8] font-bold px-2 py-0.5 rounded hover:bg-[#2C2DE0]/10 transition-colors"
              >
                Back to Grid
              </button>
              <button
                onClick={webrtc.toggleScreenShare}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Stop Sharing
              </button>
            </div>
          )}

          {/* Host: incoming request to present */}
          {isHost && webrtc.screenShareRequest && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/40 px-4 py-2.5 rounded-2xl shadow-xl max-w-[92vw]">
              <Monitor size={14} className="text-[#2C2DE0] shrink-0" />
              <span className="text-white text-xs font-semibold">
                {webrtc.screenShareRequest.name} wants to share their screen
                {activePresenter ? ` — ${activePresenter.name} must stop sharing first` : ""}
              </span>
              {activePresenter && (
                <button
                  onClick={() => {
                    if (activePresenter.socketId === socket.id) {
                      webrtc.toggleScreenShare();
                    } else {
                      socket.emit("meeting:relay-event", {
                        event: "meeting:screen-share-force-stop",
                        payload: { targetSocketId: activePresenter.socketId },
                      });
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  Stop current share
                </button>
              )}
              <button
                onClick={handleAcceptScreenShareRequest}
                disabled={Boolean(activePresenter)}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Accept
              </button>
              <button
                onClick={handleDenyScreenShareRequest}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Deny
              </button>
            </div>
          )}

          {isHost && webrtc.cameraRequest && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/40 px-4 py-2.5 rounded-2xl shadow-xl max-w-[92vw]">
              <Video size={14} className="text-[#2C2DE0] shrink-0" />
              <span className="text-white text-xs font-semibold">
                {webrtc.cameraRequest.name} wants to turn on their camera
              </span>
              <button
                onClick={() => webrtc.respondToCameraRequest(true)}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Accept
              </button>
              <button
                onClick={() => webrtc.respondToCameraRequest(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Deny
              </button>
            </div>
          )}

          {!isHost && webrtc.cameraRequestPending && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/40 px-4 py-2.5 rounded-2xl shadow-xl">
              <Video size={14} className="text-[#2C2DE0] animate-pulse shrink-0" />
              <span className="text-white text-xs font-semibold">Waiting for the host to approve your camera…</span>
              <button
                onClick={webrtc.cancelCameraRequest}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Requester: waiting on host approval */}
          {!isHost && webrtc.screenShareRequestPending && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/95 border border-[#2C2DE0]/40 px-4 py-2.5 rounded-2xl shadow-xl">
              <Monitor size={14} className="text-[#2C2DE0] animate-pulse shrink-0" />
              <span className="text-white text-xs font-semibold">Waiting for the host to approve your screen share…</span>
              <button
                onClick={webrtc.cancelScreenShareRequest}
                className="px-4 py-2 rounded-xl bg-[#2C2DE0] text-white text-xs font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Layout Engine: Screen Sharing Focus Layout ── */}
          {focusTile ? (
            <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0 bg-gray-50 dark:bg-black/95">
              <div className="relative mx-auto min-h-0 w-full flex-1 max-w-7xl">
                <VideoTile
                  stream={focusTile.stream}
                  pipStream={focusTile.pipStream}
                  name={focusTile.name}
                  photo={focusTile.photo}
                  role={focusTile.role}
                  muted={focusTile.muted}
                  isLocal={focusTile.isLocal}
                  handRaised={focusTile.handRaised}
                  isScreenSharing={focusTile.isScreenSharing}
                  isSpeaking={focusTile.isSpeaking}
                  hasVideo
                  isPinned={focusTile.socketId === pinned}
                  onPin={() =>
                    setPinned((p) =>
                      p === focusTile.socketId ? null : focusTile.socketId
                    )
                  }
                  universityId={focusTile.universityId}
                  socketId={focusTile.socketId}
                  presenterId={webrtc.presenterId}
                />
                {presenterTile && (
                  <div className="absolute left-2 top-2 z-20 aspect-video w-24 overflow-hidden rounded-xl border border-white/30 shadow-xl sm:left-3 sm:top-3 sm:w-40">
                    <VideoTile
                      compact
                      stream={presenterTile.stream}
                      name={presenterTile.name}
                      photo={presenterTile.photo}
                      role={presenterTile.role}
                      muted={presenterTile.muted}
                      isLocal={presenterTile.isLocal}
                      isSpeaking={presenterTile.isSpeaking}
                      hasVideo={presenterTile.hasVideo}
                      connectionStatus={presenterTile.connectionStatus}
                      socketId={presenterTile.socketId}
                      presenterId={webrtc.presenterId}
                    />
                  </div>
                )}
                <button
                  onClick={() => {
                    setActiveTab("participants");
                    setSidebarOpen(true);
                  }}
                  title="See who's in the meeting"
                  className="absolute top-3 right-3 z-10 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-black/70 hover:bg-black/85 border border-white/15 backdrop-blur-sm transition-colors shadow-lg"
                >
                  <Users size={14} className="text-white" />
                  <span className="text-white text-[11px] font-bold whitespace-nowrap">
                    {Math.max(webrtc.participants.length, 1)}
                  </span>
                </button>
              </div>
            </div>

          ) : (

            /* Normal meeting grid */
            <div className="relative flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("participants");
                  setSidebarOpen(true);
                }}
                aria-label={`${webrtc.participants.length} participants. Open participant panel`}
                className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/80 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2DE0]"
              >
                <Users size={15} />
                <span>{webrtc.participants.length}</span>
              </button>
              <div className={`mx-auto grid h-full w-full auto-rows-max items-center justify-center gap-3 sm:gap-4 ${gridClass}`}>
                {visibleGridTiles.map((tile) => (
                  <div key={tile.socketId} className="relative aspect-video w-full min-w-0 overflow-hidden rounded-2xl">
                    <VideoTile
                      stream={tile.stream}
                      pipStream={tile.pipStream}
                      name={tile.name}
                      photo={tile.photo}
                      role={tile.role}
                      muted={tile.muted}
                      isLocal={tile.isLocal}
                      handRaised={tile.handRaised}
                      isScreenSharing={tile.isScreenSharing}
                      isSpeaking={tile.isSpeaking}
                      hasVideo={tile.hasVideo}
                      connectionStatus={tile.connectionStatus}
                      isPinned={tile.socketId === pinned}
                      onPin={() => setPinned((current) => current === tile.socketId ? null : tile.socketId)}
                      universityId={tile.universityId}
                      socketId={tile.socketId}
                      presenterId={webrtc.presenterId}
                    />
                  </div>
                ))}
              </div>
            </div>

          )}
        </main>



        {/* ── Sidebar: Exactly 5 tabs ──────────────────────────────────────── */}
        <aside
          className={`
            shrink-0 flex flex-col bg-gray-50 dark:bg-black border-l border-gray-200 dark:border-white/10 z-20
            transition-all duration-300
            ${sidebarOpen ? "w-full sm:w-96 lg:w-[420px]" : "w-0 overflow-hidden border-l-0"}
          `}
        >
          {sidebarOpen && (
            <>
              {/* Tab bar headers */}
              <div className="flex border-b border-gray-200 dark:border-white/10 shrink-0 overflow-x-auto">
                {TABS.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      if (id === "chat") setUnread(0);
                      if (id === "whiteboard" && (localRole === "host" || localRole === "presenter")) {
                        socket.emit("meeting:relay-event", { event: "meeting:force-tab", payload: "whiteboard" });
                      }
                    }}
                    aria-label={label}
                    title={label}
                    className={`
                      relative flex-1 flex flex-col items-center py-2.5 px-1 gap-0.5 text-[10px] font-bold
                      transition-colors shrink-0 min-w-[44px]
                      ${activeTab === id
                        ? "text-[#2C2DE0] border-b-2 border-[#2C2DE0] bg-[#2C2DE0]/5"
                        : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white dark:bg-gray-900/5"
                      }
                    `}
                  >
                    {React.createElement(icon, { size: 14 })}
                    <span className="hidden sm:block truncate max-w-[70px]">{label}</span>
                    {id === "chat" && unread > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#2C2DE0] text-white text-[8px] font-black flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content renderer */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {activeTab === "chat" && <ChatPanel meeting={meeting} currentUserId={currentUserId} />}
                {activeTab === "participants" && (
                  <ParticipantsPanel
                    participants={webrtc.participants}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    currentUserId={currentUserId}
                  />
                )}
                {activeTab === "whiteboard" && <Whiteboard canDraw={localRole === "host" || localRole === "presenter"} meetingCode={code} />}
                {activeTab === "notes" && (
                  <NotesPanel
                    canEdit={localRole === "host" || localRole === "presenter"}
                    meetingCode={code}
                    notesText={meetingNotes}
                    onNotesChange={setMeetingNotes}
                  />
                )}
                {activeTab === "ai" && <AIAssistant meetingTitle={meeting?.title} course={meeting?.course} />}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ══ BOTTOM CONTROLS ══════════════════════════════════════════════════ */}
      <footer className="shrink-0 flex items-center justify-between gap-2 px-2 sm:px-5 py-2 sm:py-3.5 bg-white dark:bg-black border-t border-gray-200 dark:border-white/10 z-30 flex-wrap">
        {/* Left: Sidebar toggle controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide panel" : "Show panel"}
            className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white border border-gray-200 dark:border-white/10 transition-colors"
          >
            {sidebarOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <div className="hidden sm:block">
            <p className="text-black dark:text-white text-xs font-bold truncate max-w-[120px]">{meeting?.title}</p>
            {meeting?.isActive && (
              <p className="text-black/40 dark:text-white/40 text-[10px] font-mono leading-none mt-0.5">{fmt(timer)}</p>
            )}
          </div>
        </div>

        {/* Center: Audio, Video, Screen Share, Hand, Chat, People, Files, Settings */}
        {/* Center: one merged control pill + end call kept separate */}
        <div className="order-3 sm:order-none w-full sm:w-auto min-w-0 flex items-center justify-center gap-2 sm:gap-5">
          <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <div className="flex w-max items-center gap-2 sm:gap-6 rounded-lg bg-black/5 dark:bg-white dark:bg-gray-900/5 px-2 sm:px-5 py-2 sm:py-3">
            <CtrlBtn
              id="btn-mic"
              onClick={webrtc.toggleMute}
              active={!webrtc.isMuted}
              label={webrtc.isMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {webrtc.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </CtrlBtn>

            <CtrlBtn
              id="btn-cam"
              onClick={webrtc.toggleCamera}
              active={webrtc.hasCameraOn}
              pending={webrtc.cameraRequestPending}
              disabled={cameraBlockedByShare && !webrtc.hasCameraOn}
              label={
                webrtc.hasCameraOn
                  ? "Stop Cam (C)"
                  : webrtc.cameraRequestPending
                    ? "Requesting…"
                    : cameraBlockedByShare
                      ? "Camera blocked"
                      : "Start Cam (C)"
              }
            >
              {webrtc.hasCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </CtrlBtn>

            <CtrlBtn
              id="btn-screen"
              onClick={handleScreenShareClick}
              active={webrtc.isScreenSharing}
              pending={webrtc.screenShareRequestPending}
              disabled={someoneElseSharing}
              label={
                webrtc.isScreenSharing
                  ? "Stop Share"
                  : webrtc.screenShareRequestPending
                    ? "Requesting…"
                    : someoneElseSharing
                      ? "Share in use"
                      : isHost ? "Share Screen" : "Request to Share"
              }
            >
              {webrtc.isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </CtrlBtn>

            <CtrlBtn
              id="btn-hand"
              onClick={webrtc.toggleHand}
              active={webrtc.handRaised}
              label={webrtc.handRaised ? "Lower Hand (H)" : "Raise Hand (H)"}
            >
              <Hand size={20} />
            </CtrlBtn>

            <CtrlBtn
              id="btn-chat"
              badge={unread}
              onClick={() => {
                setActiveTab("chat");
                setSidebarOpen(true);
                setUnread(0);
              }}
              active={activeTab === "chat" && sidebarOpen}
              label="Chat"
            >
              <MessageSquare size={20} />
            </CtrlBtn>

            <CtrlBtn
              id="btn-people"
              onClick={() => {
                setActiveTab("participants");
                setSidebarOpen(true);
              }}
              active={activeTab === "participants" && sidebarOpen}
              label="People"
            >
              <Users size={20} />
            </CtrlBtn>

            <CtrlBtn id="btn-files" onClick={() => setFilesOpen(true)} label="Files">
              <Paperclip size={20} />
            </CtrlBtn>

            <CtrlBtn id="btn-settings" onClick={() => setSettingsOpen(true)} label="Settings">
              <Settings size={20} />
            </CtrlBtn>

            <div className="flex items-center">
              {isHost ? (
                <CtrlBtn id="btn-end" onClick={handleEndMeeting} danger label="End call">
                  <Phone size={20} className="rotate-135" />
                </CtrlBtn>
              ) : (
                <CtrlBtn id="btn-leave" onClick={handleLeave} danger label="Leave call">
                  <Phone size={20} className="rotate-[135deg]" />
                </CtrlBtn>
              )}
            </div>
          </div>
          </div>

        </div>

        {/* Right: AI + Whiteboard shortcuts */}
        <div className="order-2 sm:order-none flex items-center gap-2.5">
          <button
            onClick={() => { setActiveTab("ai"); setSidebarOpen(true); }}
            title="AI Co-pilot"
            className={`p-2 rounded-xl border transition-colors text-sm font-bold leading-none w-9 h-9 flex items-center justify-center
              ${activeTab === "ai" && sidebarOpen
                ? "bg-[#2C2DE0]/20 border-[#2C2DE0]/40 text-[#2C2DE0]"
                : "bg-[#2a2a2a] border-white/10 text-white/50 hover:text-white hover:bg-[#3a3a3a]"
              }`}
          >
            AI
          </button>
          <button
            onClick={() => { setActiveTab("whiteboard"); setSidebarOpen(true); }}
            title="Whiteboard"
            className={`p-2 rounded-xl border transition-colors w-9 h-9 flex items-center justify-center
              ${activeTab === "whiteboard" && sidebarOpen
                ? "bg-[#2C2DE0]/20 border-[#2C2DE0]/40 text-[#2C2DE0]"
                : "bg-[#2a2a2a] border-white/10 text-white/50 hover:text-white hover:bg-[#3a3a3a]"
              }`}
          >
            <PenLine size={15} />
          </button>
        </div>
      </footer>

      {/* ══ SETTINGS MODAL ═══════════════════════════════════════════════════ */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        meeting={meeting}
        isHost={isHost}
        onToggleLock={handleToggleLock}
      />

      {/* ══ FILES MODAL (Moved from sidebar) ════════════════════════════════ */}
      <FilesModal
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        isHost={isHost}
        userName={user?.name}
        meetingCode={code}
        sharedFiles={meetingFiles}
        onSharedFilesChange={setMeetingFiles}
      />

      {/* ══ KEYBOARD HINT ════════════════════════════════════════════════════ */}
      <div className="fixed bottom-20 left-4 hidden xl:block z-20 opacity-0 hover:opacity-100 transition-opacity">
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-3 text-[10px] font-mono space-y-1 text-gray-400 dark:text-white/40">
          <p className="text-black dark:text-white/60 font-bold mb-1">Shortcuts</p>
          <p><kbd className="bg-gray-100 dark:bg-white/10 px-1 rounded text-black dark:text-white">M</kbd> Mic</p>
          <p><kbd className="bg-gray-100 dark:bg-white/10 px-1 rounded text-black dark:text-white">C</kbd> Camera</p>
          <p><kbd className="bg-gray-100 dark:bg-white/10 px-1 rounded text-black dark:text-white">H</kbd> Hand</p>
          <p><kbd className="bg-gray-100 dark:bg-white/10 px-1 rounded text-black dark:text-white">Esc</kbd> Panel</p>
        </div>
      </div>
    </div>
  );
}