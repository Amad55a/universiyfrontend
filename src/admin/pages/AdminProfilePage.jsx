import { useEffect, useMemo, useState } from "react";
import { Camera, LoaderCircle, Save, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import api from "@/api/client";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AdminProfilePage() {
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const copy = t.adminPanel.profilePage;
  const [form, setForm] = useState({
    name: user?.name || user?.fullName || "",
    department: user?.department || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const initials = useMemo(
    () => (form.name || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    [form.name]
  );
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const changePhoto = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    setSaved(false);
    if (!ALLOWED_PHOTO_TYPES.includes(selected.type)) {
      setError(copy.invalidPhoto);
      return;
    }
    if (selected.size > MAX_PHOTO_SIZE) {
      setError(copy.photoTooLarge);
      return;
    }
    setPhoto(selected);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("department", form.department.trim());
      body.append("phone", form.phone.trim());
      body.append("bio", form.bio.trim());
      if (photo) body.append("photo", photo);

      const response = await api.put("/auth/profile", body);
      const updatedUser = response.data?.data?.user;
      if (!updatedUser) throw new Error(copy.saveError);
      setUser(updatedUser);
      setPhoto(null);
      setForm({
        name: updatedUser.name || updatedUser.fullName || "",
        department: updatedUser.department || "",
        phone: updatedUser.phone || "",
        bio: updatedUser.bio || "",
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/60 dark:border-white/10 dark:bg-white/5 dark:text-white";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{copy.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{copy.subtitle}</p>
      </div>

      <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-white/10 dark:bg-gray-950">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#2C2DE0] text-2xl font-bold text-white">
            {(preview || user?.photo || user?.avatar) ? (
              <img src={preview || user.photo || user.avatar} alt={copy.profilePhoto} className="h-full w-full object-cover" />
            ) : initials ? initials : <UserRound size={34} />}
          </div>
          <h2 className="mt-4 font-bold text-gray-900 dark:text-white">{form.name || copy.title}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#2C2DE0]/60 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
            <Camera size={16} />
            {copy.changePhoto}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto} className="sr-only" />
          </label>
          <p className="mt-2 text-xs text-gray-400">{copy.photoHint}</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-gray-950">
          <div>
            <label htmlFor="admin-name" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{copy.name}</label>
            <input id="admin-name" required maxLength={100} className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{copy.email}</label>
            <input id="admin-email" type="email" className={`${inputClass} opacity-70`} value={user?.email || ""} readOnly />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="admin-department" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{copy.department}</label>
              <input id="admin-department" maxLength={100} className={inputClass} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </div>
            <div>
              <label htmlFor="admin-phone" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{copy.phone}</label>
              <input id="admin-phone" maxLength={30} className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="admin-bio" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{copy.bio}</label>
            <textarea id="admin-bio" rows={4} maxLength={280} className={`${inputClass} resize-y`} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          {saved && <p role="status" className="text-sm font-medium text-emerald-600">{copy.saved}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_#1E1FAA] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/60 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? copy.saving : copy.save}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
