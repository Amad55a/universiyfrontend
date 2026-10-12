import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, Users, Shield, Info as InfoIcon, MoreVertical, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getGroup } from "@/api/groupApi";
import { Spinner } from "./ui";
import MessagesTab from "./components/messageTab";
import MembersTab from "./components/memberTab";
import ManagementTab from "./components/management";
import InfoTab from "./components/infoTab";

// Colors intentionally unchanged from the original Duolingo palette — only structure/typography differ.
const TABS = [
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "members", label: "Members", icon: Users },
    { id: "management", label: "Management", icon: Shield }, // hidden below for non-group_admins
    { id: "info", label: "Info", icon: InfoIcon },
];

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const currentUserId = user?._id;
    const isUniversityAdmin = user?.role === "admin";

    const [group, setGroup] = useState(null);
    const [membership, setMembership] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "messages");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef(null);

    const canManage = isUniversityAdmin || membership?.adminLevel === "group_admin";

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam && ["messages", "members", "management", "info"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadGroup = async () => {
        if (!id) {
            setError("No group ID specified");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getGroup(id);
            if (res.success && res.group) {
                setGroup(res.group);
                setMembership(res.membership);
            } else {
                setError(res.message || "Failed to load group");
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not load group details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (tabId === "messages") {
            searchParams.delete("tab");
            setSearchParams(searchParams, { replace: true });
        } else {
            setSearchParams({ tab: tabId }, { replace: true });
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard?.writeText(window.location.href);
        setCopied(true);
        toast.success("Group link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
        setMenuOpen(false);
    };

    // Management tab is only ever shown to Level 2 admins — never rendered for others,
    // matching "Only users with management permission can access this page."
    const visibleTabs = TABS.filter((t) => t.id !== "management" || canManage);

    if (loading || authLoading) return <Spinner />;

    if (error || !group) {
        return (
            <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
                <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-8 shadow-sm">
                    <AlertCircle size={44} className="mx-auto text-amber-500 mb-3" />
                    <h2 className="text-xl font-black text-black dark:text-white mb-2">Group Unavailable</h2>
                    <p className="text-sm text-black/60 dark:text-white/60 mb-6 leading-relaxed">
                        {error || "The requested group could not be found or you do not have permission to view it."}
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => navigate("/community/groups")}
                            className="px-5 py-2.5 rounded-xl bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150"
                        >
                            Back to Groups
                        </button>
                        <button
                            onClick={loadGroup}
                            className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 max-w-6xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
            <div className="mb-6">
                <button onClick={() => navigate(-1)} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white mb-4">
                    ← Back
                </button>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl sm:text-4xl font-black text-black dark:text-white mb-2 truncate">{group?.name}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-black/60 dark:text-white/60">
                            <p>👥 {group?.memberCount ?? group?.members?.length ?? 0} Members</p>
                            {group?.semester && <p>📅 Semester {group.semester}</p>}
                            <p className="text-amber-600 dark:text-amber-400 font-bold">Official announcement channel</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
                        <button
                            onClick={() => handleTabClick("info")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                                activeTab === "info"
                                    ? "bg-[#2C2DE0] text-white shadow-[0_3px_0_#1E1FAA]"
                                    : "bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20"
                            }`}
                            title="Group Information"
                        >
                            <InfoIcon size={14} />
                            <span>Info</span>
                        </button>
                        <button
                            onClick={() => setMenuOpen((o) => !o)}
                            className="p-2 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="More options"
                        >
                            <MoreVertical size={18} />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-xl py-2 z-40">
                                <button
                                    onClick={() => { handleTabClick("info"); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                    <InfoIcon size={15} />
                                    <span>Group Info</span>
                                </button>
                                <button
                                    onClick={() => { handleTabClick("members"); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                    <Users size={15} />
                                    <span>View Members</span>
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                    {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-6 border-b border-black/10 dark:border-white/10 overflow-x-auto">
                <div className="flex gap-1">
                    {visibleTabs.map(({ id: tabId, label, icon: Icon }) => (
                        <button 
                            key={tabId}
                            onClick={() => handleTabClick(tabId)}
                            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap text-sm font-semibold ${
                                activeTab === tabId
                                    ? "border-[#2C2DE0] text-[#2C2DE0]"
                                    : "border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {activeTab === "messages" && (
                    <MessagesTab
                        groupId={id}
                        group={group}
                        membership={membership}
                        currentUserId={currentUserId}
                        isUniversityAdmin={isUniversityAdmin}
                    />
                )}
                {activeTab === "members" && (
                    <MembersTab groupId={id} canManage={canManage} onRefreshNeeded={loadGroup} />
                )}
                {activeTab === "management" && canManage && <ManagementTab groupId={id} />}
                {activeTab === "info" && (
                    <InfoTab group={group} canManage={canManage} onSaved={(g) => setGroup(g)} />
                )}
            </div>
        </div>
    );
};

export default GroupDetailPage;