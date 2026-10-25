import React, { useState, useEffect } from "react";
import { Pin, Paperclip, Eye, Pencil, Trash2, Video, PenSquare, Code2, ClipboardList, X, Heart } from "lucide-react";
import {
    getGroupMessages,
    sendMessage,
    pinMessage,
    editMessage,
    deleteMessage,
    markMessageSeen,
    submitMessageRequest,
    likeMessage,
    unlikeMessage,
} from "@/api/groupApi";
import { renderRichText } from "@/utils/richText";
import { Spinner } from "../ui";

// STYLE PASS — BTN_PRIMARY had the bg-[#2C2DE0]/shadow "game button" look
// (translate + drop-shadow on hover/active). Flattened to a plain solid
// blue button — same color, just no shadow/press animation — to match the
// primary-button style used in the rest of the community section.
const BTN_PRIMARY =
    "bg-[#2C2DE0] hover:bg-[#2523c0] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const LINK_ICONS = {
    meetingLink: { Icon: Video, label: "Join meeting" },
    whiteboardLink: { Icon: PenSquare, label: "Open whiteboard" },
    codingLabLink: { Icon: Code2, label: "Open coding lab" },
    examLink: { Icon: ClipboardList, label: "View exam" },
};

/* Rich text formatting hints */
const RichTextHints = () => (
    <div className="text-xs text-black/40 dark:text-white/40 space-y-1">
        <p><strong>**bold**</strong> | <em>*italic*</em> | [link](https://example.com)</p>
    </div>
);

/* ---------- Composer: only rendered for announcement_admin / group_admin ---------- */

const AnnouncementComposer = ({ groupId, onSent }) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [links, setLinks] = useState({ meetingLink: "", whiteboardLink: "", codingLabLink: "", examLink: "" });
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const canPublish = Boolean(text.trim() || attachments.length || Object.values(links).some(Boolean));

    const handleSubmit = async () => {
        if (!canPublish) return;
        setSending(true);
        setError("");
        try {
            const payload = { text, attachments, ...links };
            const res = await sendMessage(groupId, payload);
            if (res.success) {
                setText("");
                setAttachments([]);
                setLinks({ meetingLink: "", whiteboardLink: "", codingLabLink: "", examLink: "" });
                setOpen(false);
                onSent?.(res.message);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Message could not be sent. Try again.");
        } finally {
            setSending(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full text-left bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4 text-sm text-black/40 dark:text-white/40 hover:border-[#2C2DE0] transition-colors"
            >
                Write an official announcement...
            </button>
        );
    }
    return (
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4 space-y-3">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Announcement text... Use **bold**, *italic*, [link](url)"
                rows={4}
                className="w-full p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                autoFocus
            />
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <RichTextHints />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.keys(LINK_ICONS).map((key) => (
                    <input
                        key={key}
                        value={links[key]}
                        onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))}
                        placeholder={LINK_ICONS[key].label + " URL (optional)"}
                        className="min-w-0 p-2 rounded-lg text-xs bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    />
                ))}
            </div>
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                >
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={!canPublish || sending} className={`px-4 py-1.5 rounded-lg ${BTN_PRIMARY}`}>
                    {sending ? "Publishing..." : "Publish announcement"}
                </button>
            </div>
        </div>
    );
};

const MemberMessageComposer = ({ groupId, onSent }) => {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        setError("");
        try {
            const res = await sendMessage(groupId, { text: text.trim() });
            if (!res.success || !res.message) throw new Error(res.message || "Message could not be sent");
            setText("");
            onSent?.(res.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Message could not be sent. Try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4 space-y-2">
            <label htmlFor="group-message" className="sr-only">Write a group message</label>
            <textarea
                id="group-message"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Write a message to this group..."
                maxLength={10000}
                rows={3}
                className="w-full p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
            />
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end">
                <button type="submit" disabled={!text.trim() || sending} className={`px-4 py-1.5 rounded-lg ${BTN_PRIMARY}`}>
                    {sending ? "Sending..." : "Send message"}
                </button>
            </div>
        </form>
    );
};

/* ---------- Edit modal ---------- */

const EditMessageModal = ({ message, groupId, onClose, onSaved }) => {
    const [text, setText] = useState(message.text || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            const res = await editMessage(groupId, message._id, { text, attachments: message.attachments });
            if (res.success) {
                onSaved?.();
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black rounded-2xl p-5 w-full max-w-md space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-black dark:text-white">Edit announcement</h3>
                    <button onClick={onClose} disabled={saving} className="disabled:opacity-50 disabled:pointer-events-none"><X size={18} /></button>
                </div>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="Update announcement text..."
                    className="w-full p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    autoFocus
                />
                <RichTextHints />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={saving} className="px-3 py-1.5 rounded-lg text-sm font-bold text-black/60 dark:text-white/60 disabled:opacity-50 disabled:pointer-events-none">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={!text.trim() || saving} className={`px-4 py-1.5 rounded-lg ${BTN_PRIMARY}`}>
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------- Request modal: students without announcement permission ---------- */

const MessageRequestModal = ({ groupId, onClose, onSubmitted }) => {
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const canSubmitRequest = Boolean(text.trim());

    const handleSubmit = async () => {
        if (!canSubmitRequest) return;
        setSubmitting(true);
        try {
            const res = await submitMessageRequest(groupId, { text, attachments: [] });
            if (res.success) onSubmitted?.();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black rounded-2xl p-5 w-full max-w-md space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-black dark:text-white">Request to send a message</h3>
                    <button onClick={onClose} disabled={submitting} className="disabled:opacity-50 disabled:pointer-events-none"><X size={18} /></button>
                </div>
                <p className="text-xs text-black/50 dark:text-white/50">
                    An administrator will review your message before it's published as an announcement.
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="What would you like to announce?"
                    className="w-full p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={submitting} className="px-3 py-1.5 rounded-lg text-sm font-bold text-black/60 dark:text-white/60 disabled:opacity-50 disabled:pointer-events-none">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!canSubmitRequest || submitting} className={`px-4 py-1.5 rounded-lg ${BTN_PRIMARY}`}>
                        {submitting ? "Submitting..." : "Submit request"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------- One announcement card ---------- */

const AnnouncementCard = ({ message, groupId, canManage, canEditOwn, currentUserId, onChanged }) => {
    const [seen, setSeen] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [liking, setLiking] = useState(false);
    const [liked, setLiked] = useState(message.userLiked || false);
    const [likeCount, setLikeCount] = useState(message.likeCount || 0);

    useEffect(() => {
        if (!seen) {
            markMessageSeen(groupId, message._id).finally(() => setSeen(true));
        }
    }, [groupId, message._id, seen]);

    const isAuthor = message.authorId?._id === currentUserId;
    const canModify = canManage || (canEditOwn && isAuthor);

    const handlePin = async () => {
        setCardLoading(true);
        try {
            await pinMessage(groupId, message._id);
            onChanged?.();
        } finally {
            setCardLoading(false);
        }
    };

    const handleEdit = () => {
        onChanged?.("edit", message);
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this announcement?")) return;
        setCardLoading(true);
        try {
            await deleteMessage(groupId, message._id);
            onChanged?.("delete");
        } finally {
            setCardLoading(false);
        }
    };

    const handleLike = async () => {
        if (liked) {
            setLiking(true);
            try {
                await unlikeMessage(groupId, message._id);
                setLiked(false);
                setLikeCount(Math.max(0, likeCount - 1));
            } finally {
                setLiking(false);
            }
        } else {
            setLiking(true);
            try {
                await likeMessage(groupId, message._id);
                setLiked(true);
                setLikeCount(likeCount + 1);
            } finally {
                setLiking(false);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {message.authorId?.photo ? (
                        <img
                            src={message.authorId.photo}
                            alt={message.authorId?.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2C2DE0] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {message.authorId?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-black dark:text-white">{message.authorId?.name}</p>
                        <p className="text-xs text-black/50 dark:text-white/50">
                            {new Date(message.createdAt).toLocaleString()}
                            {message.editedAt && " · edited"}
                        </p>
                    </div>
                </div>
                {message.isPinned && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]">
                        <Pin size={10} /> Pinned
                    </span>
                )}
            </div>

            {message.text && (
                <p className="text-sm text-black/80 dark:text-white/80 whitespace-pre-wrap mb-3">
                    {renderRichText(message.text)}
                </p>
            )}

            {message.attachments?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {message.attachments.map((att, i) => (
                        <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-black/10 dark:hover:bg-white/20"
                        >
                            <Paperclip size={12} /> {att.name}
                        </a>
                    ))}
                </div>
            )}

            {Object.entries(LINK_ICONS).map(([key, { Icon, label }]) =>
                message[key] ? (
                    <a
                        key={key}
                        href={message[key]}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 mr-2 mb-2 px-3 py-1.5 rounded-lg ${BTN_PRIMARY}`}
                    >
                        <Icon size={14} /> {label}
                    </a>
                ) : null
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="flex gap-4 text-xs text-black/40 dark:text-white/40">
                    <p className="flex items-center gap-1">
                        <Eye size={12} /> Seen by {message.seenCount ?? 0}
                    </p>
                    <button
                        onClick={handleLike}
                        disabled={liking}
                        className={`flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors ${liked ? "text-red-500 dark:text-red-400" : "hover:text-black dark:hover:text-white"
                            }`}
                    >
                        <Heart size={12} fill={liked ? "currentColor" : "none"} /> {likeCount}
                    </button>
                </div>
                {canModify && (
                    <div className="flex gap-3 text-xs text-black/40 dark:text-white/40">
                        <button
                            onClick={handlePin}
                            disabled={cardLoading}
                            className="hover:text-black dark:hover:text-white flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Pin size={12} /> {message.isPinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                            onClick={handleEdit}
                            disabled={cardLoading}
                            className="hover:text-black dark:hover:text-white flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={cardLoading}
                            className="hover:text-red-600 flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ---------- Tab root ---------- */

const MessagesTab = ({ groupId, group, membership, currentUserId, isUniversityAdmin }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [requestOpen, setRequestOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);

    const canSend = isUniversityAdmin || ["announcement_admin", "group_admin"].includes(membership?.adminLevel);
    const canManage = isUniversityAdmin || membership?.adminLevel === "group_admin";

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await getGroupMessages(groupId);
            if (!res.success) throw new Error(res.message || "Could not load group messages");
            setMessages(Array.isArray(res.messages) ? res.messages : []);
        } catch (error) {
            setLoadError(error.response?.data?.message || error.message || "Could not load group messages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    const handleCardChange = (action, message) => {
        if (action === "edit") {
            setEditingMessage(message);
        } else {
            load();
        }
    };

    return (
        <div className="space-y-4">
            {canSend ? (
                <AnnouncementComposer groupId={groupId} onSent={(msg) => setMessages((prev) => [
                    msg,
                    ...prev.filter((current) => current._id !== msg._id),
                ])} />
            ) : (
                <>
                    <MemberMessageComposer
                        groupId={groupId}
                        onSent={(msg) => setMessages((prev) => [msg, ...prev.filter((current) => current._id !== msg._id)])}
                    />
                    <button
                        onClick={() => setRequestOpen(true)}
                        className="text-xs font-semibold text-black/50 dark:text-white/50 hover:text-[#2C2DE0]"
                    >
                        Request to publish an official announcement
                    </button>
                </>
            )}

            {requestOpen && (
                <MessageRequestModal
                    groupId={groupId}
                    onClose={() => setRequestOpen(false)}
                    onSubmitted={() => setRequestOpen(false)}
                />
            )}

            {editingMessage && (
                <EditMessageModal
                    message={editingMessage}
                    groupId={groupId}
                    onClose={() => setEditingMessage(null)}
                    onSaved={() => load()}
                />
            )}

            {loadError ? (
                <div className="rounded-xl border border-red-200 dark:border-red-900 p-6 text-center">
                    <p role="alert" className="text-sm text-red-700 dark:text-red-400 mb-3">{loadError}</p>
                    <button onClick={load} className={`px-4 py-1.5 rounded-lg ${BTN_PRIMARY}`}>Retry loading messages</button>
                </div>
            ) : loading ? (
                <div className="py-10"><Spinner /></div>
            ) : messages.map((m) => (
                <AnnouncementCard
                    key={m._id}
                    message={m}
                    groupId={groupId}
                    canManage={canManage}
                    canEditOwn={membership?.adminLevel === "announcement_admin"}
                    currentUserId={currentUserId}
                    onChanged={handleCardChange}
                />
            ))}

            {!loading && !loadError && !messages.length && (
                <div className="text-center py-16">
                    <p className="text-sm text-black/40 dark:text-white/40">No announcements yet</p>
                </div>
            )}
        </div>
    );
};

export default MessagesTab;