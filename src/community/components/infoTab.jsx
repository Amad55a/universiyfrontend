import React, { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
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

    useEffect(() => {
        setForm({ description: group?.description || "", purpose: group?.purpose || "", rules: group?.rules || "" });
    }, [group]);

    // Populate may return null for a member whose User document was deleted
    // (orphaned ObjectId). Filter those out so the map below never touches null.
    const groupAdmins = (group?.members || []).filter(
        (m) => m.adminLevel === "group_admin" && m.user != null
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateGroupInfo(group._id, form);
            if (res.success) onSaved?.(res.group);
            setEditing(false);
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

            <InfoCard label="GROUP NAME">
                <p className="text-black dark:text-white font-bold">{group?.name}</p>
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

            <div className="grid grid-cols-2 gap-3">
                <InfoCard label="WHO CAN SEND ANNOUNCEMENTS">
                    <p className="text-black dark:text-white text-sm">Announcement Admins & Group Administrators</p>
                </InfoCard>
                <InfoCard label="WHO CAN JOIN">
                    <p className="text-black dark:text-white text-sm">Automatic — based on role & academic record</p>
                </InfoCard>
                {group?.department && (
                    <InfoCard label="DEPARTMENT">
                        <p className="text-black dark:text-white text-sm">{group.department.name || group.department}</p>
                    </InfoCard>
                )}
                <InfoCard label="MEMBERS">
                    <p className="text-black dark:text-white text-sm">{group?.memberCount}</p>
                </InfoCard>
                <InfoCard label="CREATED">
                    <p className="text-black dark:text-white text-sm">{group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : "—"}</p>
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
                        groupAdmins.map((m) => (
                            <span
                                key={m.user?._id ?? m.user?.id}
                                className="text-xs font-bold px-2 py-1 rounded-full bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 text-[#2C2DE0] dark:text-[#2C2DE0]"
                            >
                                {m.user?.name ?? "Unknown admin"}
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