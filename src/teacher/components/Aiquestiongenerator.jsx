import React, { useState } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import { Sparkles, X, Loader2, Trash2, BookOpen } from "lucide-react";

const TYPE_OPTIONS = [
  { id: "mcq", label: "MCQ" },
  { id: "truefalse", label: "True/False" },
  { id: "essay", label: "Essay" },
  { id: "short_answer", label: "Short Answer" },
  { id: "programming", label: "Programming Lab" },
  { id: "sql", label: "SQL Lab" },
  { id: "html_css_js", label: "Design (HTML/CSS/JS)" },
];

export default function AIQuestionGenerator({ onClose, onSaved }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState(["mcq"]);
  const [count, setCount] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null); // null = not generated yet

  const toggleType = (id) => {
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic first.");
      return;
    }
    if (types.length === 0) {
      toast.error("Select at least one question type.");
      return;
    }
    try {
      setGenerating(true);
      const { data } = await api.post("/api/exams/teacher/generate-ai-questions", {
        topic, difficulty, types, count,
      });
      setPreview(data.data.questions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const removePreviewItem = (idx) => {
    setPreview(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveToBank = async () => {
    if (!preview || preview.length === 0) return;
    try {
      setSaving(true);
      await api.post("/api/question-bank/bulk-import", { questions: preview });
      toast.success(`Saved ${preview.length} question${preview.length > 1 ? "s" : ""} to the Question Bank`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save to Question Bank");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2C2DE0]" />
            AI Question Generator
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!preview && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Binary Search Trees"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-[#2C2DE0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-[#2C2DE0] focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={e => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-[#2C2DE0] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Question Types</label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleType(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${types.includes(opt.id)
                          ? "bg-[#2C2DE0]/15 border-[#2C2DE0]/40 text-[#1E1FAA] dark:bg-[#2C2DE0]/40 dark:text-[#2C2DE0]"
                          : "bg-white border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Generating..." : "Generate Preview"}
              </button>
            </>
          )}

          {preview && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {preview.length} question{preview.length !== 1 ? "s" : ""} generated — review before saving
                </p>
                <button onClick={() => setPreview(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                  ↺ Start over
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {preview.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-zinc-800 text-gray-500">
                          {q.type}
                        </span>
                        <span className="text-[10px] text-gray-400">{q.marks} pt{q.marks !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{q.question}</p>
                    </div>
                    <button onClick={() => removePreviewItem(idx)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {preview.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">All items removed — generate again or start over.</p>
                )}
              </div>

              <button
                onClick={handleSaveToBank}
                disabled={saving || preview.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                {saving ? "Saving..." : "Save to Question Bank"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Saved questions land in your Question Bank — add them to this exam from the "Add from Question Bank" button.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}