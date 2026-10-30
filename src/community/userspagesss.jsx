// pages/community/UserDetailsPage.jsx
// Full page (not a modal) shown at /community/user/:id.
// Shows a user's profile, stats (posts/likes/comments), their posts, and an
// "About" tab. If you're viewing your own profile, "Edit Profile" lets you
// change display name, bio, and photo in place (uploads go to Cloudinary
// via updateProfile → uploadProfilePhoto middleware on the backend).

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Loader2, Camera, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AuthorName, timeAgo } from "./ui";
import { getOrCreatePrivateChat } from "@/api/chatApi";
import { getCommunityUser, getUserPosts, getUserProfileStats } from "@/api/Communityapi";
import { updateProfile } from "@/api/communcitysettingapi";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

const fmtJoinDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch {
    return null;
  }
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser: setCurrentUser } = useAuth();
  const { t } = useLanguage();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const isSelf = currentUser && (String(id) === String(currentUser._id) || String(id) === String(currentUser.id));

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getCommunityUser(id), getUserProfileStats(id)])
      .then(([userData, statsData]) => {
        if (!active) return;
        if (userData.success) {
          setProfile(userData.user);
          setNameInput(userData.user.displayName || userData.user.name || "");
          setBioInput(userData.user.bio || "");
        }
        if (statsData.success) setStats(statsData.stats);
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (tab !== "posts" || !id) return;
    setPostsLoading(true);
    getUserPosts(id)
      .then((data) => setPosts(data?.posts ?? []))
      .catch(() => toast.error("Could not load posts"))
      .finally(() => setPostsLoading(false));
  }, [tab, id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({ displayName: nameInput.trim(), bio: bioInput, photoFile });
      if (data.user) {
        setProfile(data.user);
        setCurrentUser?.(data.user);
      }
      setPhotoFile(null);
      setPhotoPreview(null);
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      const data = await getOrCreatePrivateChat(id);
      if (!data?.success || !data.conversation?._id) {
        throw new Error(data?.message || "Could not start chat");
      }
      navigate(`/community/chat?id=${data.conversation._id}`, {
        state: { conversation: data.conversation },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not start chat");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-[#2C2DE0]" />
      </div>
    );
  }
  if (!profile) {
    return <div className="text-center py-24 text-gray-400">User not found.</div>;
  }

  const joinDate = fmtJoinDate(profile.createdAt || profile.joinedAt);
  const displayPhoto = photoPreview || profile.photo;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" style={{ fontFamily: "'Geist Variable','Inter',sans-serif" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center relative">
        <div className="flex justify-center mb-4 relative">
          <Avatar name={profile.name} photo={displayPhoto} size={88} />
          {editing && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-[calc(50%-50px)] w-8 h-8 rounded-xl bg-[#2C2DE0] text-white flex items-center justify-center shadow"
            >
              <Camera size={14} />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} />
        </div>

        {!editing ? (
          <>
            <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
              <AuthorName user={profile} />
            </h1>
            <p className="text-xs text-gray-400 capitalize mt-1">{profile.role}</p>
            {joinDate && <p className="text-[11px] text-gray-400 mt-1">Joined {joinDate}</p>}
            {profile.bio && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 max-w-md mx-auto">{profile.bio}</p>}
          </>
        ) : (
          <div className="flex flex-col gap-3 max-w-sm mx-auto text-left">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Display Name</label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={60}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">About</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={280}
                rows={3}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-5 text-sm">
          <div>
            <span className="font-black text-gray-900 dark:text-white">{stats?.postsCount ?? 0}</span>{" "}
            <span className="text-gray-400">Posts</span>
          </div>
          <div>
            <span className="font-black text-gray-900 dark:text-white">{stats?.totalLikes ?? 0}</span>{" "}
            <span className="text-gray-400">Likes</span>
          </div>
          <div>
            <span className="font-black text-gray-900 dark:text-white">{stats?.totalComments ?? 0}</span>{" "}
            <span className="text-gray-400">Comments</span>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {isSelf ? (
            editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold"
                >
                  <XIcon size={14} /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200"
              >
                Edit Profile
              </button>
            )
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={startingChat}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold disabled:cursor-wait disabled:opacity-60"
            >
              {startingChat ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              {startingChat ? "Opening chat…" : "Send message"}
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-100 dark:border-gray-800 mt-6">
        {["posts", "about"].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 capitalize ${
              tab === k ? "border-[#2C2DE0] text-[#1E1FAA]" : "border-transparent text-gray-400"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="mt-4">
          {postsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No posts yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((p) => (
                <button
                  key={p._id}
                  onClick={() => navigate(`/community/post/${p._id}`)}
                  className="text-left rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {p.title && <p className="font-bold text-sm text-gray-900 dark:text-white">{p.title}</p>}
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{p.content}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                    <span>{timeAgo(p.createdAt, t)}</span>
                    <span>{p.likes?.length ?? 0} likes</span>
                    <span>{p.comments?.length ?? 0} comments</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "about" && (
        <div className="mt-4 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {[
            ["Department", profile.department],
            ["Faculty", profile.faculty],
            ["Semester", profile.role === "student" && profile.semester ? `Semester ${profile.semester}` : null],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-400 font-semibold">{label}</span>
                <span className="text-gray-700 dark:text-gray-200">{value}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default UserProfile;