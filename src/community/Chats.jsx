import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import {
  listConversations,
  getMessages,
  sendMessage as apiSendMessage,
  joinChatRoom,
  onChatMessage,
  onConversationUpdated,
} from "@/api/chatApi";
import { Avatar } from "./ui";

const Chats = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("id");

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const pendingMessageRef = useRef(null);

  const active = conversations.find((c) => c._id === activeId);

  const loadConversations = useCallback(async () => {
    try {
      const data = await listConversations("private");
      if (data.success) setConversations(data.conversations ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load conversations");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const stopRejoining = joinChatRoom(activeId);
    getMessages(activeId)
      .then((d) => { if (d.success) setMessages(d.messages ?? []); })
      .catch((err) => toast.error(err.response?.data?.message || "Could not load messages"));
    return stopRejoining;
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const offMsg = onChatMessage((msg) => {
      if (msg.conversationId !== activeId) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    const offUpd = onConversationUpdated(() => loadConversations());
    return () => { offMsg(); offUpd(); };
  }, [activeId, loadConversations]);

  const handleSend = async () => {
    if (!text.trim() || !activeId || sending) return;
    const messageText = text.trim();
    if (pendingMessageRef.current?.text !== messageText) {
      pendingMessageRef.current = {
        text: messageText,
        key: globalThis.crypto.randomUUID(),
      };
    }
    setSending(true);
    try {
      const data = await apiSendMessage(activeId, messageText, pendingMessageRef.current.key);
      if (data.success) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        pendingMessageRef.current = null;
        setText("");
        loadConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Message could not be sent. Please retry.");
    } finally {
      setSending(false);
    }
  };

  const selectChat = (id) => setSearchParams({ id });

  return (
    <div
      className="w-full min-w-0 flex flex-1 min-h-0 h-[calc(100dvh-3.5rem)] overflow-hidden bg-white dark:bg-gray-950"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      {/* Chat list — fixed width like Messenger */}
      <aside className={`${activeId ? "hidden sm:flex" : "flex"} w-full sm:w-72 lg:w-80 min-w-0 shrink-0 border-r border-gray-100 dark:border-gray-800 flex-col bg-gray-50/80 dark:bg-black/50`}>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-black text-gray-900 dark:text-white">Private messages</h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Only private one-to-one chats are shown here.</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-8 text-xs text-gray-400 text-center leading-relaxed">
              No private chats yet. Open a profile and send a message to start.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => selectChat(c._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeId === c._id ? "bg-white dark:bg-gray-900" : "hover:bg-white/80 dark:hover:bg-gray-900/60"
                  }`}
              >
                <Avatar name={c.displayName} photo={c.displayPhoto} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {c.displayName ?? c.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{c.lastMessage || "Start chatting"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Conversation — fills all remaining width beside community left sidebar */}
      <div className={`${activeId ? "flex" : "hidden"} sm:flex flex-1 flex-col min-w-0 bg-white dark:bg-gray-950`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#2C2DE0] dark:bg-[#2C2DE0]/30 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t["chat.select"] ?? "Select a conversation"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Private one-on-one chats appear here.</p>
          </div>
        ) : (
          <>
            <div className="px-3 sm:px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="sm:hidden shrink-0 p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar name={active.displayName} photo={active.displayPhoto} size={36} />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{active.displayName ?? active.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">Private chat</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 space-y-3 bg-gray-50 dark:bg-black/30">
              {messages.map((msg) => {
                const isMine = String(msg.sender?._id ?? msg.sender) === String(user?._id);
                return (
                  <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className="mr-2 mt-1 flex-shrink-0">
                        <Avatar name={msg.sender?.name} photo={msg.sender?.photo} size={28} />
                      </div>
                    )}
                    <div className={`min-w-0 max-w-[85%] sm:max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${isMine
                          ? "bg-[#2C2DE0] text-white rounded-2xl rounded-br-sm"
                          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm"
                          }`}
                      style={{ overflowWrap: "anywhere" }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div
              className="shrink-0 px-3 sm:px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-2 bg-white dark:bg-gray-950"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={t["chat.placeholder"] ?? "Type a message…"}
                aria-label="Message"
                className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-2xl text-sm bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                aria-label="Send message"
                className="p-3 rounded-2xl  bg-[#2C2DE0]
    text-white
    text-sm
    font-bold
    px-6
    py-3
    rounded-xl
    shadow-[0_4px_0_#1E1FAA]
    hover:translate-y-0.5
    hover:shadow-[0_2px_0_#1E1FAA]
    active:translate-y-1
    active:shadow-none
    transition-all
    duration-150"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Chats;