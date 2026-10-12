import React, { useState, useEffect } from "react";
import { Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateGroupInfo } from "@/api/groupApi";

const BTN_PRIMARY =
    "bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none";

const InfoCard = ({ label, children }) => (
    <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4">
        <p className="text-xs font-bold text-black/50 dark:text-white/50 mb-1">{label}</p>
        {children}
    </div>
);

// Info tab is view-only for everyone except group_admin (spec: "No editing except by Group Administrators").
const InfoTab = ({ group, canManage, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ description: "", purpose: "", rules: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setForm({
            description: group?.description || "",
            purpose: group?.purpose || "",
            rules: group?.rules || "",
        });
        setError(null);
    }, [group]);

    if (!group) {
        return (
            <div className="text-center py-12 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-6">
                <p className="text-sm text-black/40 dark:text-white/40">No group information available.</p>
            </div>
        );
    }

    // Populate may return null for a member whose User document was deleted
    // (orphaned ObjectId). Filter those out so the map below never touches null.
    const groupAdmins = (group?.members || []).filter(
        (m) => m && m.adminLevel === "group_admin" && m.user != null
    );

    const handleSave = async () => {
        if (!group?._id) return;
        setSaving(true);
        setError(null);
        try {
            const res = await updateGroupInfo(group._id, form);
            if (res.success) {
                toast.success("Group settings updated successfully");
                onSaved?.(res.group);
                setEditing(false);
            } else {
                const msg = res.message || "Failed to update group settings";
                setError(msg);
                toast.error(msg);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to save group info";
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="flex justify-end">
                    {editing ? (
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-black/60 dark:text-white/60">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className={`px-3 py-1.5 rounded-lg ${BTN_PRIMARY}`}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <InfoCard label="GROUP NAME">
                <p className="text-black dark:text-white font-bold">{group?.name || "—"}</p>
            </InfoCard>

            <InfoCard label="DESCRIPTION">
                {editing ? (
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    />
                ) : (
                    <p className="text-black dark:text-white">{group?.description || "No description"}</p>
                )}
            </InfoCard>

            <InfoCard label="PURPOSE">
                {editing ? (
                    <textarea
                        value={form.purpose}
                        onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                        rows={2}
                        className="w-full mt-1 p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    />
                ) : (
                    <p className="text-black dark:text-white">{group?.purpose || "Official university communication"}</p>
                )}
            </InfoCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard label="WHO CAN SEND ANNOUNCEMENTS">
                    <p className="text-black dark:text-white text-sm">Announcement Admins & Group Administrators</p>
                </InfoCard>
                <InfoCard label="WHO CAN JOIN">
                    <p className="text-black dark:text-white text-sm">Automatic — based on role & academic record</p>
                </InfoCard>
                {(group?.department || group?.departmentId) && (
                    <InfoCard label="DEPARTMENT">
                        <p className="text-black dark:text-white text-sm">
                            {typeof group.department === "object"
                                ? (group.department?.name || "Department")
                                : (group.department || group.departmentId?.name || "Department")}
                        </p>
                    </InfoCard>
                )}
                <InfoCard label="MEMBERS">
                    <p className="text-black dark:text-white text-sm">
                        {group?.memberCount ?? group?.members?.length ?? 0}
                    </p>
                </InfoCard>
                <InfoCard label="CREATED">
                    <p className="text-black dark:text-white text-sm">
                        {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : "—"}
                    </p>
                </InfoCard>
            </div>

            <InfoCard label="GROUP RULES">
                {editing ? (
                    <textarea
                        value={form.rules}
                        onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
                        rows={3}
                        placeholder="No rules set"
                        className="w-full mt-1 p-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none"
                    />
                ) : (
                    <p className="text-black dark:text-white">{group?.rules || "No rules set"}</p>
                )}
            </InfoCard>

            <InfoCard label="ADMINISTRATORS">
                <div className="flex flex-wrap gap-2 mt-1">
                    {groupAdmins.length ? (
                        groupAdmins.map((m, idx) => (
                            <span
                                key={m.user?._id ?? m.user?.id ?? `admin-${idx}`}
                                className="text-xs font-bold px-2 py-1 rounded-full bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]"
                            >
                                {m.user?.name || m.user?.fullName || "Group Administrator"}
                            </span>
                        ))
                    ) : (
                        <p className="text-sm text-black/40 dark:text-white/40">No group administrator assigned yet</p>
                    )}
                </div>
            </InfoCard>
        </div>
    );
};

export default InfoTab;