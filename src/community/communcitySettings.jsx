// Community Settings
//
// CHANGES in this pass (FEATURE 2 — Community Settings):
//   - ProfileSection now also lets the user edit their Display Name.
//   - New "Language" tab/section lets the user set their preferred
//     interface language (English / Somali), persisted both to the backend
//     (via updateProfile's preferredLanguage field) and to localStorage as
//     an immediate fallback, mirroring how AppearanceSection persists theme.
//   - Nothing existing was removed: Notifications, Privacy, Appearance,
//     Security, and Help all work exactly as before.
//
// NOTE on backend: updateProfile is now called with an extra
// `displayName` and, from the new Language section, `preferredLanguage`
// field. If your current /profile update endpoint only accepts
// { bio, skills, photoFile }, extend it to accept and persist these two
// additional fields (see explanation at the end of the response).

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import useLanguage from "@/hooks/useLanguage";
import {
  User, Bell, Lock, Palette, Shield, HelpCircle, Globe,
  Camera, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff,
  X, Plus, Sun, Moon, Monitor, LogOut, FileText, Flag, MessageSquareWarning,
} from "lucide-react";
import {
  getMySettings, updateProfile, updateNotificationPrefs, updatePrivacyPrefs,
  changePassword, getActiveSessions, logoutOtherDevices,
} from "@/api/communcitysettingapi";

const resolvePhoto = (photo) => photo || null;

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

// ── Shared bits, matching SettingsDrawer's visual language ──────────────────
const Banner = ({ type, message }) => {
  if (!message) return null;
  const ok = type === "success";
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3.5 py-3 border text-xs leading-relaxed ${ok
      ? "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border-[#2C2DE0] dark:border-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]"
      : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400"
      }`}>
      {ok ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
};

const Card = ({ title, icon: Icon, children }) => (
  <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <Icon size={13} className="text-[#2C2DE0] flex-shrink-0" />
      <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{title}</p>
    </div>
    <div className="px-4 pt-5 pb-5 bg-white dark:bg-gray-950 flex flex-col gap-4">{children}</div>
  </div>
);

const ReadOnlyField = ({ label, value }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</label>
    <div className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      {value || "—"}
    </div>
  </div>
);

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <div>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
      {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-[#2C2DE0]" : "bg-gray-200 dark:bg-gray-700"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  </div>
);

const RadioCard = ({ active, onClick, icon: Icon, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all duration-150 w-full ${active
      ? "bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 border-[#2C2DE0] dark:border-[#2C2DE0]"
      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0]"
      } text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group`}
  >
    <div className="flex items-center gap-3">
      {Icon && <Icon size={16} className={active ? "text-[#2C2DE0] dark:text-[#2C2DE0]" : "text-gray-400"} />}
      <div>
        <p className={`text-sm font-bold leading-tight ${active ? "text-[#2C2DE0] dark:text-[#2C2DE0]" : "text-gray-700 dark:text-gray-200"}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {active && <CheckCircle2 size={17} className="text-[#2C2DE0] flex-shrink-0" />}
  </button>
);

const SAVE_LABEL = { en: "Save Changes", so: "Keydi Isbedelada" };
const SAVING_LABEL = { en: "Saving…", so: "Keydinaya…" };

const SaveButton = ({ saving, onClick, isSo, disabled }) => (
  <button
    onClick={onClick}
    disabled={saving || disabled}
    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2C2DE0] text-white text-sm font-bold px-6 py-3 rounded-xl shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_#1E1FAA] disabled:cursor-not-allowed transition-all duration-150"
  >
    {saving && <Loader2 size={14} className="animate-spin" />}
    {saving ? SAVING_LABEL[isSo ? "so" : "en"] : SAVE_LABEL[isSo ? "so" : "en"]}
  </button>
);

// ── Section 1: Profile ───────────────────────────────────────────────────────
const ProfileSection = ({ user, setUser, isSo }) => {
  const fileRef = useRef(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [status, setStatus] = useState({ type: null, msg: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setSkills(Array.isArray(user.skills) ? user.skills : []);
    }
  }, [user]);

  const displayPhoto = previewPhoto || resolvePhoto(user?.photo) || null;

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewPhoto(URL.createObjectURL(file));
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setSkillInput("");
  };

  const removeSkill = (s) => setSkills(skills.filter((k) => k !== s));

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, msg: null });
    try {
      const data = await updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio,
        skills,
        photoFile,
      });
      if (setUser && data.user) setUser(data.user);
      setPhotoFile(null);
      setPreviewPhoto(null);
      setStatus({ type: "success", msg: isSo ? "Profile si guul leh ayaa loo cusboonaysiiyay." : "Profile updated successfully." });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || (isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card title={isSo ? "Sawirka Profile" : "Profile Photo"} icon={Camera}>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#2C2DE0] to-[#1E1FAA] flex items-center justify-center text-white font-black text-2xl shadow">
              {displayPhoto ? (
                <img src={displayPhoto} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-[#2C2DE0] text-white flex items-center justify-center shadow-[0_3px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_1px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
            >
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/png, image/jpeg" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => fileRef.current?.click()} className="text-sm font-bold text-[#2C2DE0] hover:text-[#1E1FAA] text-left transition-colors">
              {isSo ? "Bedel Sawirka" : "Change Photo"}
            </button>
            <p className="text-[11px] text-gray-400 leading-relaxed">{isSo ? "JPG ama PNG, ugu badnaan 2 MB." : "JPG or PNG, max 2 MB."}</p>
            {photoFile && (
              <p className="text-[10px] text-yellow-500 font-semibold">{isSo ? "Sawir cusub — wali lama keydin" : "New photo — not saved yet"}</p>
            )}
          </div>
        </div>
      </Card>

      <Card title={isSo ? "Macluumaadka Jaamacadda" : "University Information"} icon={User}>
        <p className="text-[11px] text-gray-400 -mt-1 mb-1 leading-relaxed">
          {isSo
            ? "Xogtan waxaa xaqiijiyay jaamacadda ee lama badali karo halkan."
            : "This comes from university verification and can't be edited here."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReadOnlyField label={isSo ? "Magaca Buuxa" : "Full Name"} value={user?.name} />
          <ReadOnlyField label={isSo ? "Aqoonsiga Ardayga" : "Student ID"} value={user?.universityId || user?.studentId} />
          <ReadOnlyField label={isSo ? "Qaybta" : "Department"} value={user?.department} />
          <ReadOnlyField label={isSo ? "Semester-ka" : "Semester"} value={user?.semester ? `Semester ${user.semester}` : null} />
        </div>
      </Card>

      <Card title={isSo ? "Bio, Magaca & Xirfadaha" : "Bio, Display Name & Skills"} icon={User}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {isSo ? "Magaca lagu muujiyo" : "Display Name"}
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder={isSo ? "Sida ay kuula muuqan doonto bulshada" : "How your name appears to the community"}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] dark:focus:border-[#2C2DE0] transition-all py-3 px-3.5"
          />
          <p className="text-[10px] text-gray-400">
            {isSo ? "Waxay ka duwan tahay magacaad ee jaamacadda ee la xaqiijiyay." : "Separate from your verified university name shown above."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {isSo ? "Magaca isticmaale" : "Username"}
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={41}
            autoCapitalize="none"
            autoComplete="username"
            placeholder="@ahmedali"
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] dark:focus:border-[#2C2DE0] transition-all py-3 px-3.5"
          />
          <p className="text-[10px] text-gray-400">
            {isSo
              ? "2–40 xaraf, tiro, dhibco, ama xariiq-hoose; waa inuu gaar kuu yahay."
              : "2–40 letters, numbers, periods, or underscores. Must be unique."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {isSo ? "Bio" : "Bio"}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={isSo ? "Wax yar naga sheeg..." : "Tell your classmates a little about yourself…"}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] dark:focus:border-[#2C2DE0] transition-all p-3.5 resize-none"
          />
          <p className="text-[10px] text-gray-400 text-right">{bio.length}/280</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {isSo ? "Xirfadaha" : "Skills"}
          </label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder={isSo ? "Geli xirfad kuxiga Enter" : "Add a skill, press Enter"}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] dark:focus:border-[#2C2DE0] transition-all py-2.5 px-3.5"
            />
            <button
              type="button"
              onClick={addSkill}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-[#2C2DE0] dark:hover:bg-[#2C2DE0]/20 text-gray-500 hover:text-[#2C2DE0] flex items-center justify-center transition-colors text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            >
              <Plus size={16} />
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 bg-[#2C2DE0] dark:bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0] text-xs font-semibold px-3 py-1.5 rounded-full">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0]">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Banner type={status.type} message={status.msg} />
        <SaveButton saving={saving} onClick={handleSave} isSo={isSo} />
      </Card>
    </div>
  );
};

// ── Section 2: Notifications ─────────────────────────────────────────────────
const DEFAULT_NOTIFS = {
  groupPosts: true,
  commentsReplies: true,
  newMessages: true,
  meetingReminders: true,
  assignmentNotifications: true,
};

const NotificationsSection = ({ initial, isSo }) => {
  const [prefs, setPrefs] = useState({ ...DEFAULT_NOTIFS, ...initial });
  const [status, setStatus] = useState({ type: null, msg: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setPrefs((p) => ({ ...p, ...initial }));
    }
  }, [initial]);

  const set = (key) => (val) => setPrefs((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, msg: null });
    try {
      await updateNotificationPrefs(prefs);
      setStatus({ type: "success", msg: isSo ? "Ogeysiisyada waa la keydiyay." : "Notification preferences saved." });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || (isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={isSo ? "Ogeysiisyada" : "Notifications"} icon={Bell}>
      <ToggleRow
        label={isSo ? "Boostiyada kooxda cusub" : "New group posts"}
        checked={prefs.groupPosts}
        onChange={set("groupPosts")}
      />
      <ToggleRow
        label={isSo ? "Faallooyin iyo jawaabaha" : "Comments and replies"}
        checked={prefs.commentsReplies}
        onChange={set("commentsReplies")}
      />
      <ToggleRow
        label={isSo ? "Fariimo cusub" : "New messages"}
        checked={prefs.newMessages}
        onChange={set("newMessages")}
      />
      <ToggleRow
        label={isSo ? "Xasuusinta kulanka" : "Meeting reminders"}
        checked={prefs.meetingReminders}
        onChange={set("meetingReminders")}
      />
      <ToggleRow
        label={isSo ? "Ogeysiisyada hawlaha" : "Assignment notifications"}
        checked={prefs.assignmentNotifications}
        onChange={set("assignmentNotifications")}
      />
      <Banner type={status.type} message={status.msg} />
      <SaveButton saving={saving} onClick={handleSave} isSo={isSo} />
    </Card>
  );
};

// ── Section 3: Privacy ────────────────────────────────────────────────────────
const PrivacySection = ({ initial, isSo }) => {
  const [showOnlineStatus, setShowOnlineStatus] = useState(initial?.showOnlineStatus ?? true);
  const [allowMessagesFrom, setAllowMessagesFrom] = useState(initial?.allowMessagesFrom ?? "groups");
  const [status, setStatus] = useState({ type: null, msg: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      if (initial.showOnlineStatus !== undefined) setShowOnlineStatus(initial.showOnlineStatus);
      if (initial.allowMessagesFrom !== undefined) setAllowMessagesFrom(initial.allowMessagesFrom);
    }
  }, [initial]);

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, msg: null });
    try {
      await updatePrivacyPrefs({ showOnlineStatus, allowMessagesFrom });
      setStatus({ type: "success", msg: isSo ? "Arrimaha sirta waa la keydiyay." : "Privacy settings saved." });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || (isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={isSo ? "Sirta" : "Privacy"} icon={Shield}>
      <ToggleRow
        label={isSo ? "Muuji xaaladda online" : "Show online status"}
        description={isSo ? "Dadka kale way arki karaan markaad online tahay" : "Let others see when you're active"}
        checked={showOnlineStatus}
        onChange={setShowOnlineStatus}
      />

      <div className="pt-2">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block">
          {isSo ? "Ku ogolow fariimaha ka yimaada" : "Allow messages from"}
        </label>
        <div className="flex flex-col gap-2">
          <RadioCard
            active={allowMessagesFrom === "groups"}
            onClick={() => setAllowMessagesFrom("groups")}
            title={isSo ? "Qof kasta oo kooxahayga ku jira" : "Everyone in my groups"}
          />
          <RadioCard
            active={allowMessagesFrom === "nobody"}
            onClick={() => setAllowMessagesFrom("nobody")}
            title={isSo ? "Qofna" : "Nobody"}
          />
        </div>
      </div>

      <Banner type={status.type} message={status.msg} />
      <SaveButton saving={saving} onClick={handleSave} isSo={isSo} />
    </Card>
  );
};

// ── Section 4: Appearance ─────────────────────────────────────────────────────
const THEME_KEY = "unicore-theme";

const applyTheme = (theme) => {
  const root = document.documentElement;
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  root.classList.toggle("dark", resolved === "dark");
};

const AppearanceSection = ({ isSo }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system");

  const choose = (val) => {
    setTheme(val);
    localStorage.setItem(THEME_KEY, val);
    applyTheme(val);
  };

  return (
    <Card title={isSo ? "Muuqaalka" : "Appearance"} icon={Palette}>
      <div className="flex flex-col gap-2">
        <RadioCard active={theme === "light"} onClick={() => choose("light")} icon={Sun} title={isSo ? "Iftiin" : "Light"} />
        <RadioCard active={theme === "dark"} onClick={() => choose("dark")} icon={Moon} title={isSo ? "Mugdi" : "Dark"} />
        <RadioCard active={theme === "system"} onClick={() => choose("system")} icon={Monitor} title={isSo ? "Nidaamka" : "System"} subtitle={isSo ? "La socoo dejinta jihaadka" : "Match your device setting"} />
      </div>
    </Card>
  );
};

// ── Section 5 (NEW): Preferred Language — FEATURE 2 ─────────────────────────
const LANG_KEY = "unicore-language";

const LanguageSection = ({ user, setUser, isSo }) => {
  const langHook = useLanguage();
  const [lang, setLang] = useState(langHook?.language || localStorage.getItem(LANG_KEY) || "en");
  const [status, setStatus] = useState({ type: null, msg: null });
  const [saving, setSaving] = useState(false);

  const choose = async (val) => {
    setLang(val);
    setStatus({ type: null, msg: null });
    setSaving(true);
    try {
      localStorage.setItem(LANG_KEY, val);
      // Update immediately if the language hook exposes a setter.
      langHook?.setLanguage?.(val);
      const data = await updateProfile({ preferredLanguage: val });
      if (setUser && data?.user) setUser(data.user);
      setStatus({
        type: "success",
        msg: val === "so" ? "Luqadda waa la beddelay." : "Language preference updated.",
      });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || (isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={isSo ? "Luqadda" : "Language"} icon={Globe}>
      <p className="text-[11px] text-gray-400 -mt-1 mb-1 leading-relaxed">
        {isSo
          ? "Dooro luqadda aad rabto in bulshada lagugu tuso."
          : "Choose the language you'd like the Community section shown in."}
      </p>
      <div className="flex flex-col gap-2">
        <RadioCard active={lang === "en"} onClick={() => choose("en")} title="English" />
        <RadioCard active={lang === "so"} onClick={() => choose("so")} title="Soomaali" />
      </div>
      {saving && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> {isSo ? "Keydinaya…" : "Saving…"}
        </p>
      )}
      <Banner type={status.type} message={status.msg} />
    </Card>
  );
};

// ── Section 6: Security ───────────────────────────────────────────────────────
const SecuritySection = ({ isGoogleUser, isSo }) => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState({ type: null, msg: null });
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);
  const [sessionMsg, setSessionMsg] = useState(null);

  useEffect(() => {
    setLoadingSessions(true);
    getActiveSessions()
      .then((d) => { if (d.success) setSessions(d.sessions ?? []); })
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  const handleChangePassword = async () => {
    setStatus({ type: null, msg: null });
    if (newPw !== confirmPw) {
      setStatus({ type: "error", msg: isSo ? "Erayga sirta cusub isku mid ma aha." : "New passwords do not match." });
      return;
    }
    if (newPw.length < 6) {
      setStatus({ type: "error", msg: isSo ? "Erayga sirta waa inuu ahaadaa ugu yaraan 6 xaraf." : "Password must be at least 6 characters." });
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setStatus({ type: "success", msg: isSo ? "Erayga sirta waa la beddelay." : "Password changed successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || (isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutOthers = async () => {
    setLoggingOutOthers(true);
    setSessionMsg(null);
    try {
      await logoutOtherDevices();
      setSessionMsg(isSo ? "Waa laga saaray dhammaan qalabka kale." : "Logged out of all other devices.");
      setSessions((prev) => prev.filter((s) => s.current));
    } catch {
      setSessionMsg(isSo ? "Wax qalad ah ayaa dhacay." : "Something went wrong.");
    } finally {
      setLoggingOutOthers(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {isGoogleUser ? (
        <Card title={isSo ? "Erayga Sirta" : "Password"} icon={Lock}>
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              {isSo
                ? "Waxaad isku dinwaan galisay Google sidaas darteed wax password ah malahid waxaad ka badalankrtaa Google."
                : "You signed in with Google. Your account doesn't use a password."}
            </p>
          </div>
        </Card>
      ) : (
        <Card title={isSo ? "Beddel Erayga Sirta" : "Change Password"} icon={Lock}>
          {[
            { label: isSo ? "Erayga Sirta Hadda" : "Current Password", value: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent((s) => !s) },
            { label: isSo ? "Erayga Sirta Cusub" : "New Password", value: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew((s) => !s) },
            { label: isSo ? "Xaqiiji Erayga Cusub" : "Confirm New Password", value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm((s) => !s) },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{f.label}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={f.show ? "text" : "password"}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 focus:border-[#2C2DE0] dark:focus:border-[#2C2DE0] transition-all py-3 pl-10 pr-11"
                />
                <button type="button" onClick={f.toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <Banner type={status.type} message={status.msg} />
          <SaveButton
            saving={saving}
            onClick={handleChangePassword}
            isSo={isSo}
            disabled={!currentPw || !newPw || !confirmPw}
          />
        </Card>
      )}

      <Card title={isSo ? "Fadhiyada Firfircoon" : "Active Sessions"} icon={Shield}>
        {loadingSessions ? (
          <p className="text-xs text-gray-400 py-2">{isSo ? "Waa la soo raraya…" : "Loading…"}</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">{isSo ? "Fadhi kale lama helin." : "No other sessions found."}</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {sessions.map((s, i) => (
              <div key={s.id || i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.device || (isSo ? "Qalab aan la aqoon" : "Unknown device")}</p>
                  <p className="text-[11px] text-gray-400">{s.location || ""} {s.lastActive ? `· ${s.lastActive}` : ""}</p>
                </div>
                {s.current && (
                  <span className="text-[10px] font-bold text-[#2C2DE0] dark:text-[#2C2DE0] uppercase">{isSo ? "Hadda" : "This device"}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleLogoutOthers}
          disabled={loggingOutOthers}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          {loggingOutOthers ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {isSo ? "Ka bax qalabka kale" : "Logout from other devices"}
        </button>
        {sessionMsg && <Banner type="success" message={sessionMsg} />}
      </Card>
    </div>
  );
};

// ── Section 7: Help ───────────────────────────────────────────────────────────
const HelpSection = ({ isSo }) => (
  <Card title={isSo ? "Caawimaad" : "Help"} icon={HelpCircle}>
    {[
      { icon: FileText, label: isSo ? "Tilmaamaha Bulshada" : "Community Guidelines", href: "/community/guidelines" },
      { icon: MessageSquareWarning, label: isSo ? "Ka Warbixi Dhibaato" : "Report a Problem", href: "/community/report" },
      { icon: HelpCircle, label: isSo ? "La Xiriir Taageerada" : "Contact Support", href: "/community/support" },
    ].map((item) => (
      <a
        key={item.label}
        href={item.href}
        className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0] hover:bg-[#2C2DE0]/50 dark:hover:bg-[#2C2DE0]/5 transition-colors"
      >
        <span className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <item.icon size={16} className="text-gray-400" />
          {item.label}
        </span>
        <span className="text-gray-300 dark:text-gray-600">→</span>
      </a>
    ))}
  </Card>
);

// ── Main page ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "profile", icon: User, en: "Profile", so: "Profile" },
  { key: "notifications", icon: Bell, en: "Notifications", so: "Ogeysiisyada" },
  { key: "privacy", icon: Shield, en: "Privacy", so: "Sirta" },
  { key: "appearance", icon: Palette, en: "Appearance", so: "Muuqaalka" },
  { key: "language", icon: Globe, en: "Language", so: "Luqadda" },
  { key: "security", icon: Lock, en: "Security", so: "Ammaanka" },
  { key: "help", icon: HelpCircle, en: "Help", so: "Caawimaad" },
];

const CommunitySettings = () => {
  const { user, setUser, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isSo = language === "so";
  const isGoogleUser = !!(user?.googleId || user?.provider === "google");

  const [active, setActive] = useState("profile");
  const [remoteSettings, setRemoteSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  const fetchSettings = () => {
    if (!user) return;
    setSettingsLoading(true);
    setSettingsError(null);
    getMySettings()
      .then((d) => {
        if (d.success) setRemoteSettings(d.settings ?? null);
        else setSettingsError(d.message || "Failed to load settings");
      })
      .catch((err) => {
        setSettingsError(err.response?.data?.message || (isSo ? "Lama soo rari karin dejinta." : "Could not load settings from server."));
      })
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else if (!authLoading) {
      setSettingsLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="w-full flex justify-center items-center py-28">
        <Loader2 size={32} className="animate-spin text-[#2C2DE0]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <Shield size={44} className="mx-auto text-[#2C2DE0] mb-3" />
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            {isSo ? "Fadlan soo gal" : "Sign in Required"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {isSo
              ? "Waa inaad akoonkaaga gashaa si aad u maamusho dejinta bulshada."
              : "Please sign in with your university account to access and manage your collaboration settings."}
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
          >
            {isSo ? "Gal Akoonkaaga" : "Sign In to UniCore"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 sm:px-8 py-6"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="lg:w-56 flex-shrink-0">
        <p className="text-lg font-black text-gray-900 dark:text-white mb-1">
          {isSo ? "Dejinta Bulshada" : "Community Settings"}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          {isSo ? "Maamul profile-kaaga bulshada" : "Manage your community profile"}
        </p>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                  ? "bg-[#2C2DE0]/10 text-[#1E1FAA] dark:text-[#8FE02C]"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                  }`}
              >
                <item.icon size={15} />
                {isSo ? item.so : item.en}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {settingsError && (
          <div className="mb-4">
            <Banner type="error" message={settingsError} />
          </div>
        )}
        {active === "profile" && <ProfileSection user={user} setUser={setUser} isSo={isSo} />}
        {active === "notifications" && <NotificationsSection initial={remoteSettings?.notifications} isSo={isSo} />}
        {active === "privacy" && <PrivacySection initial={remoteSettings?.privacy} isSo={isSo} />}
        {active === "appearance" && <AppearanceSection isSo={isSo} />}
        {active === "language" && <LanguageSection user={user} setUser={setUser} isSo={isSo} />}
        {active === "security" && <SecuritySection isGoogleUser={isGoogleUser} isSo={isSo} />}
        {active === "help" && <HelpSection isSo={isSo} />}
      </div>
    </div>
  );
};

export default CommunitySettings;