import React, { useState, useEffect, useMemo } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import { X, Search, Loader2, CheckCircle2, Circle, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { mapBankQuestionsToExamQuestions } from "../../utils/examQuestionMapping";

const TYPE_LABELS = {
  mcq: "MCQ",
  truefalse: "True/False",
  essay: "Essay",
  short_answer: "Short Answer",
  programming: "Programming Lab",
  sql: "SQL Lab",
  html_css_js: "Design (HTML/CSS/JS)",
};

const DIFF_STYLES = {
  easy: "bg-[#2C2DE0] text-white dark:bg-[#2C2DE0]/10 dark:text-[#2C2DE0]",
  medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  hard: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

export default function QuestionBankPicker({ onClose, onAddQuestions, alreadyAddedIds = [] }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/question-bank", {
        params: { page, limit: 10, search, type: typeFilter, difficulty: diffFilter },
      });
      setQuestions(data.data.questions || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, typeFilter, diffFilter]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const handleAddSelected = async () => {
    const selected = questions.filter(q => selectedIds.has(q._id));
    if (selected.length === 0) return;

    const examQuestions = mapBankQuestionsToExamQuestions(selected);
    onAddQuestions(examQuestions);

    // Best-effort usage tracking — never blocks the exam-builder flow.
    try {
      await api.post("/api/question-bank/mark-used", { ids: selected.map(q => q._id) });
    } catch {
      /* non-fatal */
    }

    toast.success(`Added ${selected.length} question${selected.length > 1 ? "s" : ""} to the exam`);
    onClose();
  };

  const allAddedSet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2C2DE0]" />
            Add from Question Bank
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex flex-1 items-center gap-2 bg-gray-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by text or topic..."
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value); }}
              className="w-full bg-transparent border-0 text-sm focus:outline-none text-gray-800 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => { setPage(1); setTypeFilter(e.target.value); }}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-0 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            value={diffFilter}
            onChange={e => { setPage(1); setDiffFilter(e.target.value); }}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-0 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#2C2DE0]" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No questions found</p>
              <p className="text-xs mt-1">Try a different search, or generate some with AI first.</p>
            </div>
          ) : (
            questions.map(q => {
              const checked = selectedIds.has(q._id);
              const alreadyInExam = allAddedSet.has(q._id);
              return (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => !alreadyInExam && toggleSelect(q._id)}
                  disabled={alreadyInExam}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    alreadyInExam
                      ? "opacity-50 cursor-not-allowed border-gray-100 dark:border-zinc-800"
                      : checked
                        ? "border-[#2C2DE0] bg-[#2C2DE0] dark:bg-[#2C2DE0]/20 dark:border-[#2C2DE0]"
                        : "border-gray-100 dark:border-zinc-800 hover:border-[#2C2DE0]"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-[#2C2DE0]">
                    {checked ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-gray-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-zinc-800 text-gray-500">
                        {TYPE_LABELS[q.type] || q.type}
                      </span>
                      {q.difficulty && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${DIFF_STYLES[q.difficulty] || ""}`}>
                          {q.difficulty}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{q.marks} pt{q.marks !== 1 ? "s" : ""}</span>
                      {alreadyInExam && <span className="text-[10px] text-[#2C2DE0] font-semibold">Already in exam</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{q.question}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{total > 0 ? `Showing ${(page - 1) * 10 + 1}-${Math.min(page * 10, total)} of ${total}` : "No results"}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 border rounded disabled:opacity-30 dark:border-zinc-700">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 10 >= total} className="p-1 border rounded disabled:opacity-30 dark:border-zinc-700">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{selectedCount} selected</span>
            <button
              onClick={handleAddSelected}
              disabled={selectedCount === 0}
              className="bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold text-sm text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            >
              Add to Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}