import React, { useState } from "react";
import { X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Link2, Info } from "lucide-react";
import { toast } from "sonner";
import { createRoadmap } from "@/api/roadmapApi";

const RESOURCE_TYPES = ["article", "video", "docs", "book", "course", "link"];

const makeId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

const newTopic = () => ({
  topicId: makeId("t"),
  title: "",
  description: "",
  resources: [],
});

const RoadmapCreator = ({ open, onClose, onCreated, user }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [semesterTag, setSemesterTag] = useState(user?.semester ? `S${user.semester}` : "");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [tags, setTags] = useState("");
  const [icon, setIcon] = useState("🗺️");

  const [topics, setTopics] = useState([{ ...newTopic(), title: "Getting started" }]);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const updateTopic = (id, patch) =>
    setTopics((ts) => ts.map((t) => (t.topicId === id ? { ...t, ...patch } : t)));

  const addTopic = () => {
    const t = newTopic();
    setTopics((ts) => [...ts, t]);
    setExpandedId(t.topicId);
  };

  const removeTopic = (id) => {
    setTopics((ts) => ts.filter((t) => t.topicId !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveTopic = (id, dir) => {
    setTopics((ts) => {
      const idx = ts.findIndex((t) => t.topicId === id);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= ts.length) return ts;
      const copy = [...ts];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  };

  // --- resources ---
  const addResource = (topicId) => {
    const t = topics.find((tt) => tt.topicId === topicId);
    updateTopic(topicId, {
      resources: [...t.resources, { resourceId: makeId("r"), title: "", type: "link", url: "" }],
    });
  };
  const updateResource = (topicId, resourceId, patch) => {
    const t = topics.find((tt) => tt.topicId === topicId);
    updateTopic(topicId, {
      resources: t.resources.map((r) => (r.resourceId === resourceId ? { ...r, ...patch } : r)),
    });
  };
  const removeResource = (topicId, resourceId) => {
    const t = topics.find((tt) => tt.topicId === topicId);
    updateTopic(topicId, { resources: t.resources.filter((r) => r.resourceId !== resourceId) });
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    const cleanTopics = topics.filter((t) => t.title.trim());
    if (cleanTopics.length === 0) return toast.error("Add at least one topic with a title");
    if (cleanTopics.length < topics.length) toast.info("Untitled topics were skipped");

    setSaving(true);
    try {
      const data = await createRoadmap({
        title,
        description,
        icon,
        semesterTag: semesterTag || null,
        faculty: faculty || null,
        department: department || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        topics: cleanTopics,
      });
      if (data.success) {
        toast.success("Roadmap published!");
        onCreated?.(data.roadmap);
        onClose();
        setTitle("");
        setDescription("");
        setTopics([{ ...newTopic(), title: "Getting started" }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to create roadmap");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="m-auto w-full max-w-3xl h-[92vh] flex flex-col bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Geist Variable', 'Inter', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Build a roadmap</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSubmit} disabled={saving} className={`px-5 py-2 rounded-xl bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 disabled:opacity-50`}>
              {saving ? "Publishing…" : "Publish roadmap"}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex gap-2 sm:col-span-2">
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-16 text-center text-xl px-2 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Roadmap title, e.g. Zero to Advanced IT"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="One or two lines on what this roadmap takes someone from and to."
              className="sm:col-span-2 px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/40 resize-none"
            />
            <input
              value={semesterTag}
              onChange={(e) => setSemesterTag(e.target.value)}
              placeholder="Semester (optional)"
              className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            />
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Department (optional)"
              className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            />
            <input
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="Faculty (optional)"
              className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              Just list what to learn, in order, and add resources for each topic. That's it — no assignments,
              no quizzes, no locking. Students simply check things off as they learn them.
            </p>
          </div>

          {/* Topics list */}
          <div className="space-y-3">
            {topics.map((t, i) => {
              const isOpen = expandedId === t.topicId;
              return (
                <div key={t.topicId} className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 dark:bg-gray-900/40">
                    <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveTopic(t.topicId, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                        <ChevronUp size={12} />
                      </button>
                      <button onClick={() => moveTopic(t.topicId, 1)} disabled={i === topics.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-400 flex-shrink-0 w-6">{i + 1}.</span>
                    <input
                      value={t.title}
                      onChange={(e) => updateTopic(t.topicId, { title: e.target.value })}
                      placeholder="Topic title"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                    />
                    <button
                      onClick={() => setExpandedId(isOpen ? null : t.topicId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 flex-shrink-0"
                    >
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => removeTopic(t.topicId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="p-4 space-y-3 border-t border-gray-100 dark:border-gray-800">
                      <textarea
                        value={t.description}
                        onChange={(e) => updateTopic(t.topicId, { description: e.target.value })}
                        rows={2}
                        placeholder="What is this topic, briefly?"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 resize-none"
                      />

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                            <Link2 size={12} /> Resources
                          </label>
                          <button onClick={() => addResource(t.topicId)} className="flex items-center gap-1 text-xs font-bold text-[#2C2DE0] hover:text-[#2C2DE0]">
                            <Plus size={12} /> Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {t.resources.map((r) => (
                            <div key={r.resourceId} className="flex items-center gap-1.5">
                              <select
                                value={r.type}
                                onChange={(e) => updateResource(t.topicId, r.resourceId, { type: e.target.value })}
                                className="px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                              >
                                {RESOURCE_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                              </select>
                              <input
                                value={r.title}
                                onChange={(e) => updateResource(t.topicId, r.resourceId, { title: e.target.value })}
                                placeholder="Label"
                                className="w-28 px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                              />
                              <input
                                value={r.url}
                                onChange={(e) => updateResource(t.topicId, r.resourceId, { url: e.target.value })}
                                placeholder="https://…"
                                className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                              />
                              <button onClick={() => removeResource(t.topicId, r.resourceId)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addTopic}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-sm font-bold text-gray-500 hover:border-[#2C2DE0] hover:text-[#2C2DE0] transition-colors"
            >
              <Plus size={16} /> Add topic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapCreator;