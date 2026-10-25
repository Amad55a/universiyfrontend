import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Trash2, ExternalLink, CheckCircle2, Circle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getRoadmap, deleteRoadmap, toggleRoadmapLike, toggleTopicComplete } from "@/api/roadmapApi";
import { Avatar, AuthorName, Tag, Spinner, timeAgo } from "./ui";

const RoadmapDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [completedTopicIds, setCompletedTopicIds] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRoadmap(id)
      .then((d) => {
        if (d.success) {
          setRoadmap(d.roadmap);
          setCompletedTopicIds(d.roadmap.completedTopicIds ?? []);
        }
      })
      .catch(() => toast.error("Roadmap not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Lock page scroll behind the drawer
  useEffect(() => {
    if (!selectedId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedId]);

  const isOwner = user && roadmap && String(roadmap.author?._id) === String(user._id);
  const liked = user && roadmap?.likes?.some((lid) => String(lid) === String(user._id));

  const topics = useMemo(
    () => [...(roadmap?.topics ?? [])].sort((a, b) => a.order - b.order),
    [roadmap]
  );

  const progressPercent = useMemo(() => {
    if (!topics.length) return 0;
    return Math.round((completedTopicIds.length / topics.length) * 100);
  }, [completedTopicIds, topics]);

  const handleLike = async () => {
    try {
      const d = await toggleRoadmapLike(id);
      if (d.success) setRoadmap((r) => ({ ...r, likesCount: d.likesCount }));
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this roadmap?")) return;
    try {
      await deleteRoadmap(id);
      toast.success("Deleted");
      navigate("/community/roadmaps");
    } catch {
      toast.error("Could not delete");
    }
  };

  const handleToggleTopic = async (topicId) => {
    setBusy(true);
    try {
      const d = await toggleTopicComplete(id, topicId);
      if (d.success) setCompletedTopicIds(d.completedTopicIds);
    } catch {
      toast.error("Could not update progress");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-32"><Spinner size={24} className="text-[#2C2DE0]" /></div>;
  if (!roadmap) return <p className="text-center py-32 text-gray-500">Not found</p>;

  const selectedTopic = topics.find((t) => t.topicId === selectedId) || null;
  const selectedDone = selectedTopic && completedTopicIds.includes(selectedTopic.topicId);

  return (
    <article
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6"
      style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
    >
      <Link to="/community/roadmaps" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={14} /> Back to roadmaps
      </Link>

      <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3 break-words">
        <span className="text-2xl sm:text-3xl flex-shrink-0">{roadmap.icon ?? "🗺️"}</span>
        <span className="min-w-0 break-words">{roadmap.title}</span>
      </h1>
      {roadmap.description && (
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 break-words">{roadmap.description}</p>
      )}

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-4 text-sm">
        <Avatar name={roadmap.author?.name} photo={roadmap.author?.photo} size={32} />
        <AuthorName user={roadmap.author} className="font-semibold" />
        <span className="text-gray-400">{timeAgo(roadmap.createdAt)}</span>
        {roadmap.semesterTag && (
          <span className="text-xs font-bold text-white bg-[#2C2DE0] px-2 py-1 rounded-full">
            {roadmap.semesterTag}
          </span>
        )}
      </div>

      {roadmap.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roadmap.tags.map((tag) => <Tag key={tag} label={tag} />)}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Your progress</span>
          <span className="text-xs font-bold text-[#2C2DE0] dark:text-[#8b8cff]">
            {progressPercent}% · {completedTopicIds.length}/{topics.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div className="h-full bg-[#2C2DE0] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-semibold ${liked ? "text-[#2C2DE0] dark:text-[#8b8cff]" : "text-gray-400"}`}
        >
          <Heart size={16} className={liked ? "fill-current" : ""} />
          {roadmap.likesCount ?? 0}
        </button>
        {isOwner && (
          <button onClick={handleDelete} className="flex items-center gap-1 text-sm text-red-500 ml-auto">
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      {/* Topic path — everything is clickable, nothing is locked */}
      {topics.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <p className="text-sm font-semibold text-gray-500">This roadmap has no topics yet</p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-3">
          {topics.map((t, i) => {
            const done = completedTopicIds.includes(t.topicId);
            return (
              <li key={t.topicId} className="relative ml-5">
                <span
                  className={`absolute -left-[31px] top-5 flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                    done ? "bg-[#2C2DE0] border-[#2C2DE0]" : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {done && <CheckCircle2 size={12} className="text-white" />}
                </span>
                <button
                  onClick={() => setSelectedId(t.topicId)}
                  className="w-full text-left p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0] hover:shadow-sm transition-all"
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Topic {i + 1}</span>
                  <p className={`text-sm font-bold mt-1 break-words ${done ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 break-words">{t.description}</p>
                  )}
                  {t.resources?.length > 0 && (
                    <span className="text-[10px] text-gray-400 mt-1 inline-block">
                      {t.resources.length} resource{t.resources.length > 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Topic detail drawer */}
      {selectedTopic && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/40" onClick={() => setSelectedId(null)}>
          <div
            className="w-full sm:max-w-sm h-[100dvh] bg-white dark:bg-gray-950 shadow-2xl px-4 sm:px-5 overflow-y-auto"
            style={{
              paddingTop: "max(1rem, env(safe-area-inset-top))",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/30 text-[#2C2DE0] dark:text-white">
                Topic
              </span>
              <button
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 break-words">{selectedTopic.title}</h3>
            {selectedTopic.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words mb-4">
                {selectedTopic.description}
              </p>
            )}

            {selectedTopic.resources?.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Resources</p>
                <div className="space-y-1.5">
                  {selectedTopic.resources.map((r) => (
                    <a
                      key={r.resourceId}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-1.5 text-sm text-[#2C2DE0] dark:text-[#8b8cff] hover:underline break-all"
                    >
                      <ExternalLink size={12} className="mt-1 flex-shrink-0" /> {r.title || r.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleToggleTopic(selectedTopic.topicId)}
              disabled={busy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 ${
                selectedDone
                  ? "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  : "bg-[#2C2DE0] text-white hover:bg-[#2523c0]"
              }`}
            >
              {selectedDone ? (
                <>
                  <CheckCircle2 size={16} /> Learned
                </>
              ) : (
                <>
                  <Circle size={16} /> Mark as learned
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default RoadmapDetail;