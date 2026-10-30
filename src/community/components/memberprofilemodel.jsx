import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, MessageCircle, Loader2, Mail, Hash, Sparkles, CalendarDays, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AuthorName, isUserVerified } from "../ui";
import { getOrCreatePrivateChat } from "@/api/chatApi";
import { getMemberProfile } from "../../api/memberApi";

// Small labeled row used in the "all their things" detail list
const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon size={16} className="mt-0.5 text-[#2C2DE0] shrink-0" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white font-medium wrap-break-word">{value}</p>
      </div>
    </div>
  );
};

const StatPill = ({ label, value }) => (
  <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-center">
    <p className="text-base font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-[11px] text-gray-400 font-medium">{label}</p>
  </div>
);

/**
 * Full profile modal for the Members module.
 * Every member — student, lecturer, or admin — sees the same complete
 * profile (email, university ID, skills, joined date, attendance) once
 * they open a member's card. There is no "public-only" trimmed view.
 */
const MemberProfileModal = ({ member, groupId, open, onClose, currentUserId }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(member);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    setProfile(member);
    if (!open || !member?._id) return;
    setLoading(true);
    getMemberProfile(groupId, member._id)
      .then((data) => { if (data?.success) setProfile(data.member); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, member, groupId]);

  if (!open || !member) return null;

  const display = profile ?? member;
  const isSelf = currentUserId && String(display._id) === String(currentUserId);
  const statusColor = display.status === "online" ? "bg-[#2C2DE0]" : display.status === "away" ? "bg-yellow-400" : "bg-gray-300";

  const handleSendMessage = async () => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      const data = await getOrCreatePrivateChat(display._id);
      if (!data?.success || !data.conversation?._id) {
        throw new Error(data?.message || "Could not start chat");
      }
      onClose();
      navigate(`/community/chat?id=${data.conversation._id}`, {
        state: { conversation: data.conversation },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not start chat");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-950 z-10">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Profile</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6 text-center relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40 z-10">
              <Loader2 size={20} className="animate-spin text-[#2C2DE0]" />
            </div>
          )}

          <div className="flex justify-center mb-4 relative">
            <Avatar name={display.fullName || display.name} photo={display.photo || display.avatar} size={72} />
            <span className={`absolute bottom-0 right-[calc(50%-40px)] w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 ${statusColor}`} />
          </div>

          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
            <AuthorName user={display} />
          </h2>
          <p className="text-xs text-[#2C2DE0] font-bold capitalize mt-1">{display.role}</p>
          {display.department && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{display.department}</p>
          )}
          {display.semester && (
            <p className="text-xs text-gray-400 mt-1">Semester {display.semester}</p>
          )}

          {isUserVerified(display) && (
            <p className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#2C2DE0] dark:text-[#2C2DE0]">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
                <circle cx="8" cy="8" r="8" className="fill-[#2C2DE0]" />
                <path d="M4.5 8.2l2 2 5-4.5" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              UNISO Verified
            </p>
          )}
        </div>

        {/* Attendance / assignments / roadmap snapshot — visible to every member */}
        {(display.attendance != null || display.assignments || display.roadmap != null) && (
          <div className="px-4 pb-2 flex gap-2">
            {display.attendance != null && <StatPill label="Attendance" value={`${display.attendance}%`} />}
            {display.assignments && <StatPill label="Assignments" value={display.assignments} />}
            {display.roadmap != null && <StatPill label="Roadmap" value={`${display.roadmap}%`} />}
          </div>
        )}

        {/* Full detail list — all members see all of this, no trimming by role */}
        <div className="px-6 py-2">
          <InfoRow icon={Mail} label="Email" value={display.email} />
          <InfoRow icon={Hash} label="University ID" value={display.universityId || display.studentId} />
          <InfoRow icon={Sparkles} label="Skills" value={Array.isArray(display.skills) ? display.skills.join(", ") : display.skills} />
          <InfoRow icon={CalendarDays} label="Joined" value={display.joinedAt ? new Date(display.joinedAt).toLocaleDateString() : null} />
          <InfoRow icon={BarChart3} label="Last seen" value={display.lastSeen ? new Date(display.lastSeen).toLocaleString() : null} />
        </div>

        {!isSelf && (
          <div className="px-4 pb-5 pt-2 flex gap-2">
            <button
              onClick={handleSendMessage}
              disabled={startingChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-[#2C2DE0] text-white font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
            >
              {startingChat ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              {startingChat ? "Opening chat…" : "Send message"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfileModal;