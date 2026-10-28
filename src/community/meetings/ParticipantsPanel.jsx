import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Mic, MicOff, Video, VideoOff, Hand, Shield, UserMinus, ChevronDown } from "lucide-react";
import { getInitials } from "../ui";

// The panel lives inside the always-dark meeting sidebar
// so we keep bg-[#111] / text-white throughout.
const AVATAR_COLORS = [
  "bg-[#2C2DE0]",
  "bg-emerald-600",
  "bg-[#1E1FAA]",
  "bg-[#2C2DE0]",
  "bg-teal-700",
  "bg-[#2C2DE0]/70",
  "bg-[#2C2DE0]",
];

function avatarColor(name = "") {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function ParticipantRow({ p, isHostView, onAction }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    { label: "Mute", icon: MicOff, fn: () => onAction("mute-user", p.socketId) },
    { label: "Camera Off", icon: VideoOff, fn: () => onAction("camera-off", p.socketId) },
    { label: "Make Presenter", icon: Shield, fn: () => onAction("make-presenter", p.socketId, p.userId) },
    { label: "Ban", icon: UserMinus, fn: () => onAction("remove-user", p.socketId, p.userId), danger: true },
  ];

  return (
    <div className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-white dark:bg-gray-900/5 transition-colors group">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full ${avatarColor(p.name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
        {getInitials(p.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-white text-xs font-semibold truncate max-w-[100px]">{p.name}</p>
          {p.universityId && (
            <span className="text-[9px] font-mono text-[#2C2DE0]/70">{p.universityId}</span>
          )}
          {(p.role === "host" || p.role === "Host") && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#2C2DE0]/20 text-[#2C2DE0] uppercase shrink-0">Host</span>
          )}
          {(p.role === "presenter" || p.role === "Presenter") && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white dark:bg-gray-900/10 text-white/70 uppercase shrink-0">Presenter</span>
          )}
          {p.connectionStatus === "reconnecting" && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 uppercase shrink-0">Reconnecting</span>
          )}
          {p.connectionStatus === "offline" && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-400/20 text-red-300 uppercase shrink-0">Offline</span>
          )}
        </div>
        <p className="text-white/30 text-[10px] mt-0.5 capitalize">{p.role}</p>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1 shrink-0">
        {p.handRaised && (
          <span className="w-5 h-5 bg-amber-400/20 text-amber-400 rounded-lg flex items-center justify-center">
            <Hand size={11} />
          </span>
        )}
        {p.isMuted
          ? <MicOff size={13} className="text-red-400" />
          : <Mic size={13} className="text-[#2C2DE0]" />
        }
        {!p.hasCameraOn
          ? <VideoOff size={13} className="text-white/30" />
          : <Video size={13} className="text-[#2C2DE0]" />
        }
      </div>

      {/* Host action dropdown */}
      {isHostView && p.role !== "host" && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => { a.fn(); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${a.danger ? "text-red-400 hover:bg-red-500/10" : "text-white/80 hover:bg-white dark:bg-gray-900/10"
                    }`}
                >
                  <a.icon size={12} />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ParticipantsPanel({ participants = [], isHost = false, onHostAction, currentUserId }) {
  const [search, setSearch] = useState("");

  const filtered = participants.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.universityId?.includes(search)
  );

  const raised = participants.filter((p) => p.handRaised);

  const handleAction = useCallback((action, socketId, userId) => {
    if (onHostAction) onHostAction(action, socketId, userId);
  }, [onHostAction]);

  return (
    <div className="flex flex-col h-full bg-[#111]">
      {/* Search */}
      <div className="p-3 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-gray-900/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#2C2DE0]/50 border border-white/5"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-3">
        {/* Raised Hands section */}
        {raised.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2 px-2 flex items-center gap-1.5">
              <Hand size={11} className="animate-bounce" />
              Raised Hands ({raised.length})
            </p>
            {raised.map((p) => (
              <div key={p.socketId} className="flex items-center gap-2 py-2 px-3 bg-amber-400/10 rounded-xl border border-amber-400/20 mb-1">
                <Hand size={12} className="text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-white text-xs font-semibold truncate block">{p.name}</span>
                  {p.universityId && (
                    <span className="text-[9px] font-mono text-[#2C2DE0]/60">{p.universityId}</span>
                  )}
                </div>
                {isHost && (
                  <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
                    onClick={() => handleAction("dismiss-hand", p.socketId)}
                    className="ml-auto text-[10px] text-white/50 hover:text-white px-2 py-1 rounded-lg bg-white dark:bg-gray-900/10 hover:bg-white dark:bg-gray-900/20 transition-colors shrink-0"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All participants */}
        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5 px-2">
          In call · {filtered.length}
        </p>
        {filtered.map((p) => (
          <ParticipantRow
            key={p.socketId}
            p={p}
            isHostView={isHost}
            onAction={handleAction}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-white/30">
            <span className="text-3xl">👥</span>
            <p className="text-xs">No participants found</p>
          </div>
        )}
      </div>

      {/* Host bulk actions */}
      {isHost && (
        <div className="p-3 border-t border-white/10 shrink-0 flex gap-2">
          <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            onClick={() => handleAction("mute-all")}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors border border-red-500/20 flex items-center justify-center gap-1.5"
          >
            <MicOff size={12} /> Mute All
          </button>
        </div>
      )}
    </div>
  );
}
