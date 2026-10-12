import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Search, Pin, PinOff, Smile, Paperclip, Code2,
  Download, X, ChevronDown,
} from "lucide-react";
import { Avatar, AuthorName, getInitials } from "../ui";
import { sendMeetingMessage, getMeetingMessages, onMeetingChat } from "@/api/meetingApi";
import { toast } from "sonner";

const EMOJIS = ["👍","✋","😮","❤️","🎉","😂","🤔","😢","🔥","👏","💯","🙌"];

const GRADIENT_PALETTES = [
  "bg-[#2C2DE0]",
  "bg-black",
  "bg-[#2C2DE0]/80",
  "bg-black/80",
  "bg-[#1E1FAA]",
  "bg-black/70",
  "bg-[#2C2DE0]/60",
];
function nameGradient(name = "") {
  return GRADIENT_PALETTES[(name.charCodeAt(0) ?? 0) % GRADIENT_PALETTES.length];
}

function MessageBubble({ msg, isOwn, onPin, isPinned }) {
  const isCode = msg.message?.startsWith("```") || msg.type === "code";
  const content = isCode ? msg.message?.replace(/```/g, "").trim() : msg.message;

  return (
    <div className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full ${nameGradient(msg.sender?.name)} flex items-center justify-center text-white font-bold text-[10px] shrink-0 self-end`}>
        {getInitials(msg.sender?.name)}
      </div>

      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 dark:text-white/50">
            {msg.sender?.name ?? "Unknown"}
          </span>
          <span className="text-[9px] text-gray-400 dark:text-white/30">
            {new Date(msg.createdAt ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="relative">
          {isCode ? (
            <pre className="bg-gray-950 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-[#2C2DE0] max-w-full overflow-x-auto">
              <code>{content}</code>
            </pre>
          ) : (
            <div
              className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words border
                ${isOwn
                  ? "bg-[#2C2DE0] text-white border-[#2C2DE0] rounded-br-sm"
                  : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white border-gray-200 dark:border-white/5 rounded-bl-sm"
                }`}
            >
              {content}
            </div>
          )}

          {/* Pin button on hover */}
          <button
            onClick={() => onPin(msg)}
            className={`absolute -top-2 ${isOwn ? "left-0" : "right-0"} opacity-0 group-hover:opacity-100 transition-opacity
              w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]
              ${isPinned ? "bg-amber-500" : "bg-gray-200 dark:bg-white/20 hover:bg-gray-300 dark:hover:bg-white/30"}`}
            title={isPinned ? "Unpin" : "Pin message"}
          >
            {isPinned ? <PinOff size={9} /> : <Pin size={9} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ meeting, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pinned, setPinned] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load existing messages
  useEffect(() => {
    if (!meeting?._id) return;
    getMeetingMessages(meeting._id)
      .then((r) => { if (r.success) setMessages(r.messages ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [meeting?._id]);

  // Real-time incoming messages
  useEffect(() => {
    const off = onMeetingChat((msg) => {
      if (msg.meetingCode?.toUpperCase() !== meeting?.meetingCode?.toUpperCase()) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    return off;
  }, [meeting?.meetingCode]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !meeting?._id || sending) return;
    const isCode = text.startsWith("```");
    setSending(true);
    try {
      const r = await sendMeetingMessage(meeting._id, text.trim(), isCode ? "code" : "text");
      if (r.success) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === r.message._id)) return prev;
          return [...prev, r.message];
        });
        setText("");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [text, meeting?._id, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const togglePin = (msg) => {
    setPinned((prev) => prev?._id === msg._id ? null : msg);
  };

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const filtered = search
    ? messages.filter((m) => m.message?.toLowerCase().includes(search.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full bg-black dark:bg-black text-white dark:text-white ">
      {/* Search bar */}
      {showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-white/10 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-xs placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#2C2DE0]/50 border border-gray-200 dark:border-white/10"
            />
          </div>
        </div>
      )}

      {/* Pinned message banner */}
      {pinned && (
        <div className="mx-2 mt-2 shrink-0 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
          <Pin size={12} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest block">Pinned</span>
            <p className="text-xs text-gray-700 dark:text-white/80 truncate">{pinned.message}</p>
          </div>
          <button onClick={() => setPinned(null)} className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Messages stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scroll-smooth">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#2C2DE0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-white/30">
            <span className="text-3xl">💬</span>
            <p className="text-xs">{search ? "No matching messages" : "Be the first to say something!"}</p>
          </div>
        ) : (
          filtered.map((m) => (
            <MessageBubble
              key={m._id ?? m.id}
              msg={m}
              isOwn={m.sender?._id?.toString() === currentUserId || m.sender?.id?.toString() === currentUserId}
              isPinned={pinned?._id === m._id}
              onPin={togglePin}
            />
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-200 dark:border-white/10 shrink-0 space-y-2">
        {/* Emoji picker */}
        {showEmojis && (
          <div className="flex flex-wrap gap-1 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => addEmoji(e)} className="text-lg hover:scale-125 transition-transform">
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar row */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg transition-colors ${showSearch ? "bg-gray-200 dark:bg-white/20 text-gray-800 dark:text-white" : "text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"}`}
            title="Search messages"
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-1.5 rounded-lg transition-colors ${showEmojis ? "bg-gray-200 dark:bg-white/20 text-gray-800 dark:text-white" : "text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"}`}
            title="Emoji"
          >
            <Smile size={13} />
          </button>
          <button
            onClick={() => { setText((t) => (t.startsWith("```") ? t : "```\n" + t)); inputRef.current?.focus(); }}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Insert code block"
          >
            <Code2 size={13} />
          </button>
        </div>

        {/* Textarea + send */}
        <div className="flex min-w-0 gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-950 dark:text-white text-xs placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#2C2DE0]/50 resize-none leading-relaxed border border-gray-200 dark:border-white/10"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="self-center px-3 py-2 rounded-xl bg-[#2C2DE0] text-white font-bold disabled:opacity-40 hover:bg-[#1E1FAA] transition-colors shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none"
          >
            <Send size={30} />
          </button>
        </div>
      </div>
    </div>
  );
}
