import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Copy,
  FileText,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import {
  chatAttachmentUrl,
  deleteChatMessage,
  getMessages,
  getOrCreatePrivateChat,
  joinChatRoom,
  listConversations,
  markConversationRead,
  onChatMessage,
  onChatMessageDeleted,
  onChatRead,
  onChatTyping,
  onConversationUpdated,
  searchChatUsers,
  sendMessage as apiSendMessage,
  setChatTyping,
  uploadChatAttachment,
} from "@/api/chatApi";
import { Avatar } from "./ui";

const EMOJIS = ["😀", "😂", "🥰", "👍", "👏", "🙏", "🎉", "❤️", "🔥", "😢", "🤔", "✅"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const timeLabel = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  : "";

const Chats = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("id");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingMessageRef = useRef(null);
  const typingTimer = useRef(null);
  const active = conversations.find((conversation) => conversation._id === activeId);

  const loadConversations = useCallback(async () => {
    try {
      const data = await listConversations("private");
      if (data.success) setConversations(data.conversations ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return undefined;
    }
    let activeRequest = true;
    setMessages([]);
    setMessagesLoading(true);
    const stopRejoining = joinChatRoom(activeId);
    getMessages(activeId)
      .then(async (data) => {
        if (!activeRequest || !data.success) return;
        setMessages(data.messages ?? []);
        try {
          await markConversationRead(activeId);
          await loadConversations();
        } catch {
          // History remains visible if the read-receipt update is temporarily unavailable.
        }
      })
      .catch((err) => {
        if (activeRequest) toast.error(err.response?.data?.message || "Could not load messages");
      })
      .finally(() => {
        if (activeRequest) setMessagesLoading(false);
      });
    return () => {
      activeRequest = false;
      window.clearTimeout(typingTimer.current);
      setOtherTyping(false);
      setTyping(false);
      setChatTyping(false);
      stopRejoining();
    };
  }, [activeId, loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const offMessage = onChatMessage((message) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) => current.some((item) => item._id === message._id)
        ? current
        : [...current, message]);
      if (String(message.sender?._id ?? message.sender) !== String(user?._id)) {
        markConversationRead(activeId).catch(() => {});
      }
    });
    const offUpdate = onConversationUpdated(() => loadConversations());
    const offRead = onChatRead((event) => {
      if (event.conversationId !== activeId) return;
      const readIds = new Set(event.messageIds ?? []);
      setMessages((current) => current.map((message) => readIds.has(String(message._id))
        ? { ...message, readBy: [...(message.readBy ?? []), event.userId] }
        : message));
    });
    const offTyping = onChatTyping((event) => {
      if (event.conversationId !== activeId || String(event.userId) === String(user?._id)) return;
      setOtherTyping(Boolean(event.isTyping));
    });
    const offDeleted = onChatMessageDeleted((event) => {
      if (event.conversationId !== activeId) return;
      setMessages((current) => current.filter((message) => String(message._id) !== String(event.messageId)));
      loadConversations();
    });
    return () => {
      offMessage();
      offUpdate();
      offRead();
      offTyping();
      offDeleted();
    };
  }, [activeId, loadConversations, user?._id]);

  useEffect(() => {
    const query = peopleQuery.trim();
    if (query.length < 2) {
      setPeople([]);
      return undefined;
    }
    let activeRequest = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchChatUsers(query);
        if (activeRequest) setPeople(data.users ?? []);
      } catch (err) {
        if (activeRequest) toast.error(err.response?.data?.message || "Could not search users");
      }
    }, 250);
    return () => {
      activeRequest = false;
      window.clearTimeout(timer);
    };
  }, [peopleQuery]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  const selectChat = (id) => {
    setSearchParams({ id });
    setPeopleQuery("");
    setPeople([]);
  };

  const startChat = async (person) => {
    if (!person.canMessage) return;
    try {
      const result = await getOrCreatePrivateChat(person._id);
      if (!result.success) throw new Error(result.message || "Could not start chat");
      await loadConversations();
      selectChat(result.conversation._id);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not start chat");
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || !activeId || sending) return;
    const messageText = text.trim();
    if (pendingMessageRef.current?.text !== messageText || pendingMessageRef.current?.file !== selectedFile) {
      pendingMessageRef.current = {
        text: messageText,
        file: selectedFile,
        key: globalThis.crypto.randomUUID(),
      };
    }
    setSending(true);
    setChatTyping(false);
    setTyping(false);
    try {
      const result = selectedFile
        ? await uploadChatAttachment(
          activeId,
          selectedFile,
          messageText,
          pendingMessageRef.current.key,
          (event) => setUploadProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0)
        )
        : await apiSendMessage(activeId, messageText, pendingMessageRef.current.key);
      if (result.success) {
        setMessages((current) => current.some((message) => message._id === result.message._id)
          ? current
          : [...current, result.message]);
        pendingMessageRef.current = null;
        setText("");
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Message could not be sent. Please retry.");
    } finally {
      setSending(false);
    }
  };

  const onTextChange = (event) => {
    const value = event.target.value;
    setText(value);
    if (!activeId) return;
    if (!typing) {
      setTyping(true);
      setChatTyping(true);
    }
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      setTyping(false);
      setChatTyping(false);
    }, 1000);
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Attachments must be 25 MB or smaller");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const addEmoji = (emoji) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(next);
    setShowEmojis(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const removeMessage = async (message) => {
    try {
      await deleteChatMessage(activeId, message._id);
      setMessages((current) => current.filter((item) => item._id !== message._id));
      await loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete message");
    }
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text ?? "");
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy message");
    }
  };

  const visibleConversations = conversations.filter((conversation) =>
    (conversation.displayName ?? "").toLowerCase().includes(conversationQuery.trim().toLowerCase())
  );

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white dark:bg-gray-950"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      <aside className={`${activeId ? "hidden sm:flex" : "flex"} w-full min-w-0 shrink-0 flex-col border-r border-gray-100 bg-[#f7f8fa] dark:border-gray-800 dark:bg-black/50 sm:w-72 lg:w-80`}>
        <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Chats</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">Private conversations</p>
            </div>
            <MessageCircle size={20} className="text-[#2C2DE0]" />
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 dark:bg-gray-900">
            <Search size={15} className="shrink-0 text-gray-400" />
            <input
              value={conversationQuery}
              onChange={(event) => setConversationQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-gray-900 outline-none dark:text-white"
            />
          </label>
        </div>

        <div className="border-b border-gray-100 p-3 dark:border-gray-800">
          <label className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Start a conversation
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              value={peopleQuery}
              onChange={(event) => setPeopleQuery(event.target.value)}
              placeholder="Find people"
              aria-label="Search people to message"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-gray-900 outline-none dark:text-white"
            />
            {peopleQuery && (
              <button onClick={() => setPeopleQuery("")} aria-label="Clear user search" className="text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          {peopleQuery.trim().length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {people.length ? people.map((person) => (
                <button
                  key={person._id}
                  onClick={() => startChat(person)}
                  disabled={!person.canMessage}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-900"
                >
                  <Avatar name={person.displayName ?? person.name} photo={person.photo} size={30} />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {person.displayName ?? person.name}
                    <span className="block truncate text-[10px] font-normal text-gray-500">
                      {person.canMessage ? person.department || person.role : "Message unavailable"}
                    </span>
                  </span>
                </button>
              )) : <p className="px-2 py-2 text-xs text-gray-500">No matching people.</p>}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-xs text-gray-400">Loading conversations…</p>
          ) : visibleConversations.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs leading-relaxed text-gray-500">
              {conversationQuery ? "No conversations match that search." : "No private chats yet. Search for someone above or open their profile to start."}
            </p>
          ) : visibleConversations.map((conversation) => (
            <button
              key={conversation._id}
              onClick={() => selectChat(conversation._id)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${activeId === conversation._id ? "bg-white dark:bg-gray-900" : "hover:bg-white/80 dark:hover:bg-gray-900/60"}`}
            >
              <span className="relative">
                <Avatar name={conversation.displayName} photo={conversation.displayPhoto} size={44} />
                {conversation.otherUser?.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f7f8fa] bg-emerald-500 dark:border-gray-950" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-gray-900 dark:text-white">{conversation.displayName}</span>
                  <span className="shrink-0 text-[10px] text-gray-400">{timeLabel(conversation.lastMessageAt)}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-gray-500">{conversation.lastMessage || "Start chatting"}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2C2DE0] px-1.5 text-[10px] font-bold text-white">
                      {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className={`${activeId ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-white dark:bg-gray-950 sm:flex`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2C2DE0] dark:bg-[#2C2DE0]/30">
              <MessageCircle size={28} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t["chat.select"] ?? "Select a conversation"}</p>
            <p className="mt-1 text-xs text-gray-400">Your private messages will appear here.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-gray-100 bg-white/90 px-3 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-5">
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="-ml-2 shrink-0 rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 sm:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="relative">
                <Avatar name={active.displayName} photo={active.displayPhoto} size={38} />
                {active.otherUser?.isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{active.displayName}</p>
                <p className="text-[10px] text-gray-500">
                  {otherTyping ? "Typing…" : active.otherUser?.isOnline ? "Online" : "Private chat"}
                </p>
              </div>
            </header>

            <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f6f7f9] px-3 py-4 dark:bg-black/30 sm:px-5 lg:px-8" aria-label="Messages">
              {messagesLoading ? (
                <p className="m-auto text-xs text-gray-500">Loading messages…</p>
              ) : messages.length === 0 ? (
                <div className="m-auto max-w-xs text-center">
                  <MessageCircle size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Start the conversation</p>
                  <p className="mt-1 text-xs text-gray-500">Send a message, photo, video, or document.</p>
                </div>
              ) : messages.map((message) => {
                const isMine = String(message.sender?._id ?? message.sender) === String(user?._id);
                const recipientId = String(active.otherUser?._id ?? "");
                const hasBeenRead = (message.readBy ?? []).some((id) => String(id?._id ?? id) === recipientId);
                return (
                  <article key={message._id} className={`group mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && <div className="mr-2 mt-1 shrink-0"><Avatar name={message.sender?.name} photo={message.sender?.photo} size={28} /></div>}
                    <div className={`flex max-w-[88%] min-w-0 flex-col sm:max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                      <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 shadow-sm ${isMine ? "rounded-br-sm bg-[#2C2DE0] text-white" : "rounded-bl-sm bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200"}`}>
                        {message.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>}
                        {(message.attachments ?? []).map((attachment, index) => {
                          const url = chatAttachmentUrl(activeId, message._id, index);
                          if (attachment.mimeType.startsWith("image/")) {
                            return <a key={`${message._id}-${index}`} href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} loading="lazy" className="mt-1 max-h-72 max-w-full rounded-xl object-contain" /></a>;
                          }
                          if (attachment.mimeType.startsWith("video/")) {
                            return <video key={`${message._id}-${index}`} src={url} controls preload="metadata" className="mt-1 max-h-72 max-w-full rounded-xl" />;
                          }
                          return (
                            <a key={`${message._id}-${index}`} href={url} className="mt-1 flex items-center gap-2 rounded-lg bg-black/10 px-2.5 py-2 text-xs underline" target="_blank" rel="noreferrer">
                              <FileText size={16} /> <span className="truncate">{attachment.name}</span>
                            </a>
                          );
                        })}
                      </div>
                      <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-gray-400">
                        <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
                        {isMine && (hasBeenRead ? <span className="flex items-center gap-0.5 text-[#2C2DE0]"><CheckCheck size={13} /> Read</span> : <span className="flex items-center gap-0.5"><Check size={12} /> Sent</span>)}
                        {isMine && (
                          <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {message.text && <button onClick={() => copyMessage(message)} aria-label="Copy message" className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800"><Copy size={12} /></button>}
                            <button onClick={() => removeMessage(message)} aria-label="Delete message" className="rounded p-1 text-red-500 hover:bg-gray-200 dark:hover:bg-gray-800"><Trash2 size={12} /></button>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
              <div ref={endRef} />
            </section>

            <div className="shrink-0 border-t border-gray-100 bg-white px-3 pt-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-4" style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}>
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-gray-900">
                  <FileText size={15} className="text-[#2C2DE0]" />
                  <span className="min-w-0 flex-1 truncate">{selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <button type="button" disabled={sending} onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remove attachment" className="disabled:opacity-40"><X size={15} /></button>
                </div>
              )}
              {sending && selectedFile && <div className="mb-2 h-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-800"><div className="h-full bg-[#2C2DE0] transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
              <div className="flex items-end gap-1.5 sm:gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                  onChange={handleFile}
                  disabled={sending}
                  className="hidden"
                  aria-label="Choose attachment"
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} aria-label="Attach file" className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-900"><Paperclip size={18} /></button>
                <div className="relative">
                  <button type="button" onClick={() => setShowEmojis((value) => !value)} disabled={sending} aria-label="Choose emoji" className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-900"><Smile size={18} /></button>
                  {showEmojis && <div className="absolute bottom-12 left-0 z-10 grid w-48 grid-cols-6 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">{EMOJIS.map((emoji) => <button key={emoji} onClick={() => addEmoji(emoji)} className="rounded p-1.5 text-lg hover:bg-gray-100 dark:hover:bg-gray-800">{emoji}</button>)}</div>}
                </div>
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={onTextChange}
                  disabled={sending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t["chat.placeholder"] ?? "Type a message…"}
                  aria-label="Message"
                  rows={1}
                  className="max-h-28 min-h-10 min-w-0 flex-1 resize-y rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 dark:bg-gray-900 dark:text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={(!text.trim() && !selectedFile) || sending}
                  aria-label="Send message"
                  className="rounded-xl bg-[#2C2DE0] p-2.5 text-white shadow-[0_3px_0_#1E1FAA] transition hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-gray-400">Enter to send · Shift+Enter for a new line · Files up to 25 MB</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Chats;
