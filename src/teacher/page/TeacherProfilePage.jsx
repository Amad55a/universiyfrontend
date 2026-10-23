import { useEffect, useMemo, useState } from "react";
import { Camera, Key, LoaderCircle, Save, UserCircle } from "lucide-react";
import { useTeacherLanguage } from "../hooks/useLanguages";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/client";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const profileFromUser = (user) => ({
  fullName: user?.fullName || user?.name || "",
  displayName: user?.displayName || user?.name || "",
  email: user?.email || "",
  department: user?.department || "",
  phone: user?.phone || "",
  bio: user?.bio || "",
});

export default function TeacherProfilePage() {
  const { user, setUser } = useAuth();
  const { t } = useTeacherLanguage();
  const p = t?.profile || {};
  const [form, setForm] = useState(() => profileFromUser(user));
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [passwordState, setPasswordState] = useState({ loading: false, error: "", success: "" });
  const initials = (form.fullName || "T").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white";

  useEffect(() => {
    setForm(profileFromUser(user));
  }, [user]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSaved(false);
  };

  const selectPhoto = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    setSaved(false);
    if (!ALLOWED_PHOTO_TYPES.includes(selected.type)) {
      setError(p.invalidPhoto || "Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (selected.size > MAX_PHOTO_SIZE) {
      setError(p.photoTooLarge || "The image must be 2 MB or smaller.");
      return;
    }
    setPhoto(selected);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = form.fullName.trim();
    const phone = form.phone.trim();
    if (!name) {
      setError(p.fullNameRequired || "Full name is required.");
      return;
    }
    if (phone && phone.length < 5) {
      setError(p.phoneTooShort || "Phone must be at least 5 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body = new FormData();
      body.append("name", name);
      body.append("displayName", (form.displayName || name).trim().slice(0, 60));
      body.append("department", form.department.trim());
      body.append("phone", phone);
      body.append("bio", form.bio.trim().slice(0, 280));
      if (photo) body.append("photo", photo);

      const response = await api.put("/auth/profile", body);
      const updatedUser = response.data?.data?.user || response.data?.user;
      if (!updatedUser) throw new Error(p.saveError || "Profile update failed.");
      setUser(updatedUser);
      setForm(profileFromUser(updatedUser));
      setPhoto(null);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || p.saveError || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    setPasswordState({ loading: true, error: "", success: "" });
    try {
      const response = await api.put("/auth/update-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordState({
        loading: false,
        error: "",
        success: response.data?.message || p.passwordUpdated || "Password updated.",
      });
    } catch (passwordError) {
      setPasswordState({
        loading: false,
        error: passwordError.response?.data?.message || p.passwordError || "Unable to update password.",
        success: "",
      });
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <UserCircle className="text-[#2C2DE0]" />
          {p.title || "Profile"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{p.subtitle || "Update your personal information and account settings."}</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{p.personalInfo || "Personal Information"}</h2>
            <div className="flex flex-col items-center gap-4 rounded-xl bg-gray-50 p-4 sm:flex-row sm:text-left dark:bg-zinc-800/40">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0] text-2xl font-bold text-white">
                {(preview || user?.photo || user?.avatar)
                  ? <img src={preview || user.photo || user.avatar} alt={p.profilePhoto || "Profile photo"} className="h-full w-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="font-semibold text-gray-900 dark:text-white">{p.profilePhoto || "Profile photo"}</p>
                <p className="mt-1 text-xs text-gray-500">{p.photoHint || "JPG, PNG, or WebP up to 2 MB."}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2C2DE0] px-3 py-2 text-xs font-bold text-white hover:brightness-110 focus-within:ring-2 focus-within:ring-[#2C2DE0]/60">
                    <Camera size={14} /> {p.changePhoto || "Change Photo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} className="sr-only" />
                  </label>
                  {photo && (
                    <button type="button" onClick={() => setPhoto(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] dark:text-gray-300 dark:hover:bg-zinc-700">
                      {p.cancel || "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="teacher-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.fullName || "Full Name"}</label>
                <input id="teacher-name" required maxLength={100} className={inputClass} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
              </div>
              <div>
                <label htmlFor="teacher-display-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.displayName || "Display Name"}</label>
                <input id="teacher-display-name" maxLength={60} className={inputClass} value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
              </div>
              <div>
                <label htmlFor="teacher-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.email || "Email"}</label>
                <input id="teacher-email" type="email" className={`${inputClass} opacity-70`} value={form.email} readOnly />
              </div>
              <div>
                <label htmlFor="teacher-department" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.department || "Department"}</label>
                <input id="teacher-department" className={inputClass} value={form.department} onChange={(event) => updateField("department", event.target.value)} />
              </div>
              <div>
                <label htmlFor="teacher-phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.phone || "Phone"}</label>
                <input id="teacher-phone" type="tel" className={inputClass} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="teacher-bio" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.bio || "About"}</label>
              <textarea id="teacher-bio" rows={4} maxLength={280} className={`${inputClass} resize-y`} value={form.bio} onChange={(event) => updateField("bio", event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            {saved && <p role="status" className="text-sm font-medium text-emerald-600">{p.profileUpdated || "Profile updated successfully."}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_#1E1FAA] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/60 disabled:opacity-60">
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? p.saving || "Saving…" : p.updateProfile || "Update Profile"}
              </button>
            </div>
          </form>

          <form onSubmit={updatePassword} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Key className="h-5 w-5 text-gray-400" />{p.changePassword || "Change Password"}</h2>
            <div>
              <label htmlFor="teacher-current-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.currentPassword || "Current Password"}</label>
              <input id="teacher-current-password" required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="teacher-new-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{p.newPassword || "New Password"}</label>
              <input id="teacher-new-password" required minLength={8} type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className={inputClass} />
            </div>
            {passwordState.error && <p role="alert" className="text-sm text-red-600">{passwordState.error}</p>}
            {passwordState.success && <p role="status" className="text-sm text-emerald-600">{passwordState.success}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={passwordState.loading} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] disabled:opacity-60 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800">
                {passwordState.loading ? p.saving || "Saving…" : p.updatePassword || "Update Password"}
              </button>
            </div>
          </form>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0] text-3xl font-bold text-white">
            {(preview || user?.photo || user?.avatar)
              ? <img src={preview || user.photo || user.avatar} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
          <h3 className="mt-4 break-words text-lg font-bold text-gray-900 dark:text-white">{form.fullName}</h3>
          <p className="text-sm text-gray-500">{form.department}</p>
          <div className="my-6 h-px bg-gray-100 dark:bg-zinc-800" />
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-gray-500">{p.status || "Status"}</span>
            <span className="font-semibold text-emerald-600">{user?.status || p.active || "Active"}</span>
          </div>
          <div className="mt-3 flex justify-between gap-3 text-sm">
            <span className="text-gray-500">{p.memberSince || "Member Since"}</span>
            <span className="font-medium text-gray-900 dark:text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
