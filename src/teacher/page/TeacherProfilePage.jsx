import React, { useEffect, useMemo, useState } from "react";
import { UserCircle, Key, Save, Mail, Briefcase, Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTeacherLanguage } from "../hooks/useLanguages";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/client";

const allowedFields = ["name", "phone", "department", "bio", "displayName"];

export default function TeacherProfilePage() {
  const { user, setUser } = useAuth();
  const { t } = useTeacherLanguage();
  const p = t?.profile || {};

  const [form, setForm] = useState({
    fullName: user?.fullName || user?.name || "Teacher",
    displayName: user?.displayName || user?.name || "",
    email: user?.email || "teacher@uniso.edu.so",
    department: user?.department || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      fullName: user?.fullName || user?.name || current.fullName || "Teacher",
      displayName: user?.displayName || user?.name || "",
      email: user?.email || current.email || "teacher@uniso.edu.so",
      department: user?.department || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    }));
  }, [user]);

  const trimmedName = useMemo(() => form.fullName.trim(), [form.fullName]);
  const canSubmit = trimmedName.length > 0 && !saving;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (status.message) setStatus({ type: "", message: "" });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const name = trimmedName;
    const phone = form.phone.trim();
    const department = form.department.trim();
    const bio = form.bio.trim().slice(0, 280);
    const displayName = (form.displayName || name).trim().slice(0, 60);

    if (phone && phone.length < 5) {
      setStatus({ type: "error", message: "Phone must be at least 5 characters." });
      return;
    }

    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.put("/auth/profile", {
        name,
        displayName,
        phone,
        department,
        bio,
      }, { withCredentials: true });

      const userPayload = data?.data?.user || data?.user;
      if (userPayload) setUser(userPayload);

      setForm((prev) => ({
        ...prev,
        fullName: userPayload?.fullName || userPayload?.name || name,
        displayName: userPayload?.displayName || displayName,
        department: userPayload?.department || department,
        phone: userPayload?.phone || phone,
        bio: userPayload?.bio || bio,
      }));

      setStatus({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Failed to save profile.";
      setStatus({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCircle className="text-[#2C2DE0]" />
            {p.title || "Profile"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{p.subtitle || "Update your personal information and account settings."}</p>
        </div>
      </div>

      {status.message ? (
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>
          {status.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
          <span>{status.message}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-gray-400" />
              {p.personalInfo || "Personal Information"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.fullName || "Full Name"}
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.displayName || "Display Name"}
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white"
                      value={form.displayName}
                      onChange={(e) => updateField("displayName", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.email || "Email"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white"
                      value={form.email}
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.department || "Department"}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white"
                      value={form.department}
                      onChange={(e) => updateField("department", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.phone || "Phone"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="hidden sm:flex" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {p.bio || "About"}
                </label>
                <textarea
                  rows="4"
                  className="w-full p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white resize-none"
                  placeholder={p.bioPlaceholder || "Tell your students about yourself..."}
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? p.saving || "Saving..." : p.updateProfile || "Update Profile"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-400" />
              {p.changePassword || "Change Password"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {p.currentPassword || "Current Password"}
                </label>
                <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {p.newPassword || "New Password"}
                </label>
                <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0] dark:text-white" />
              </div>
              <div className="pt-2 flex justify-end">
                <button className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 px-5 py-2.5 rounded-xl font-medium transition-colors">
                  {p.updatePassword || "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#2C2DE0] dark:bg-[#2C2DE0]/20 text-[#fff] dark:text-[#2C2DE0] flex items-center justify-center text-3xl font-bold mb-4">
              {form.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "T"}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{form.fullName || user?.name || "Teacher"}</h3>
            <p className="text-sm text-gray-500">{form.department || p.department || "Teacher"}</p>

            <div className="w-full h-px bg-gray-100 dark:bg-zinc-800 my-6"></div>

            <div className="w-full space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{p.status || "Status"}</span>
                <span className="font-semibold text-[#2C2DE0] dark:text-[#2C2DE0]">{p.active || "Active"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{p.memberSince || "Member Since"}</span>
                <span className="font-medium text-gray-900 dark:text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}v>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#2C2DE0] dark:bg-[#2C2DE0]/20 text-[#fff] dark:text-[#2C2DE0] flex items-center justify-center text-3xl font-bold mb-4">
              {form.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{form.fullName}</h3>
            <p className="text-sm text-gray-500">{form.department}</p>
            
            <div className="w-full h-px bg-gray-100 dark:bg-zinc-800 my-6"></div>
            
            <div className="w-full space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{p.status || "Status"}</span>
                <span className="font-semibold text-[#2C2DE0] dark:text-[#2C2DE0]">{p.active || "Active"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{p.memberSince || "Member Since"}</span>
                <span className="font-medium text-gray-900 dark:text-white">Mar 2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
