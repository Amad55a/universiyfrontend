import React, { useState, useEffect } from "react";
import axios from "axios";
import * as fabric from "fabric";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, XCircle, Award, ChevronUp, ChevronDown,
  Sparkles, Loader2, Code2, Terminal, Monitor
} from "lucide-react";
import AiAssistPanel from "../AiAssistPanel";
import LinuxLab from "../../components/LinuxLab";
import { LINUX_TERMINAL_ENABLED } from "../../../config/features";

/**
 * Extracts student code and language reliably from any answer format.
 */
function extractCodeAndLang(ansVal) {
  if (!ansVal) return { code: "", lang: "" };
  if (typeof ansVal === "string") return { code: ansVal, lang: "" };
  if (typeof ansVal === "object") {
    const lang = ansVal.langId || ansVal.language || "";
    let code = ansVal.code || "";
    if (!code && ansVal.codes && lang && ansVal.codes[lang]) {
      code = ansVal.codes[lang];
    }
    if (!code && ansVal.codes) {
      const firstKey = Object.keys(ansVal.codes)[0];
      if (firstKey) code = ansVal.codes[firstKey];
    }
    if (!code && ansVal.codeSolution) code = ansVal.codeSolution;
    if (!code && ansVal.html) {
      code = `<!-- HTML -->\n${ansVal.html}\n\n/* CSS */\n${ansVal.css || ""}\n\n// JavaScript\n${ansVal.javascript || ""}`;
    }
    return { code: code || "", lang: lang || "code" };
  }
  return { code: String(ansVal), lang: "" };
}

function formatAnswer(ans) {
  if (ans === undefined || ans === null || ans === "") return "";
  if (Array.isArray(ans)) return ans.join(", ");
  if (typeof ans === "object") {
    const { code } = extractCodeAndLang(ans);
    if (code) return code;
    return JSON.stringify(ans, null, 2);
  }
  return String(ans);
}

function DesignPreview({ designId }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!designId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setPreview(null);

    const loadPreview = async () => {
      try {
        const { data } = await axios.get(`/api/designs/${designId}`);
        if (cancelled) return;
        const page = data.pages?.[0];
        const width = Number(data.width) || 1080;
        const height = Number(data.height) || 1080;
        if (!page?.canvas_json || page.canvas_json === "{}") {
          setError("No design preview is available for this submission.");
          return;
        }

        const canvas = document.createElement("canvas");
        const sc = new fabric.StaticCanvas(canvas, { width, height });
        try {
          const parsed = JSON.parse(page.canvas_json);
          sc.loadFromJSON(parsed, () => {
            if (cancelled) {
              sc.dispose();
              return;
            }
            sc.renderAll();
            const multiplier = Math.min(320 / width, 320 / height, 1);
            setPreview(sc.toDataURL({ format: "png", multiplier }));
            sc.dispose();
          });
        } catch (err) {
          sc.dispose();
          setError("Unable to render the design preview.");
        }
      } catch (err) {
        if (!cancelled) setError("Unable to load the submitted design.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [designId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4 text-sm text-gray-500 dark:text-gray-400">
        Loading design preview…
      </div>
    );
  }

  if (preview) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <img src={preview} alt="Student design preview" className="w-full h-auto object-contain" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4 text-sm text-gray-500 dark:text-gray-400">
      {error || "No design preview is available for this submission."}
    </div>
  );
}

/**
 * QuestionsTab — single clean list of all questions & student answers for teacher grading.
 */
export default function QuestionsTab({ submission, grades, onUpdateGrade, examId, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState({});

  const answers = submission?.answers || [];

  const requestAi = async (questionId) => {
    try {
      setAiLoading(questionId);
      const { data } = await axios.post(
        `/api/exams/teacher/${examId}/submissions/${submission._id}/ai-assist`,
        { questionId }
      );
      setAiSuggestions((prev) => ({ ...prev, [questionId]: data.data.suggestions }));
      toast.success("AI suggestions ready");
    } catch (err) {
      toast.error(err.response?.data?.message || "AI assist failed");
    } finally {
      setAiLoading(null);
    }
  };

  const applyAiScore = (questionId, score) => {
    onUpdateGrade(questionId, "manualScore", score);
    toast.success("AI suggested score applied — review before saving");
  };

  const applyAiFeedback = (questionId, feedback) => {
    onUpdateGrade(questionId, "teacherFeedback", feedback);
    toast.success("AI feedback applied");
  };

  return (
    <div className="space-y-4">
      {answers.map((ans, idx) => {
        const qid = ans.questionId?.toString?.() || ans.questionId;
        const g = grades[qid] || {};
        const isExpanded = expandedId === qid || true; // Always expanded for easy scrolling & grading
        const suggestions = aiSuggestions[qid];

        const scoreSet = g.manualScore !== "" && g.manualScore !== null && g.manualScore !== undefined;
        const scoreVal = scoreSet ? Number(g.manualScore) : null;
        const isFullMark = scoreSet && scoreVal >= (ans.maxMarks || 0);
        const isZero = scoreSet && scoreVal === 0;

        const qType = ans.questionType || ans.type || "";
        const isTerminalQ = ["os_linux", "os_windows"].includes(qType);
        const isCodeQ = ["lab", "programming"].includes(qType) ||
          (typeof ans.answer === "object" && (ans.answer?.code || ans.answer?.codes));
        const isDesignQ = qType === "design_lab" || (typeof ans.answer === "object" && ans.answer?.designId);

        const { code: studentCode, lang: studentLang } = extractCodeAndLang(ans.answer);
        const terminalOutput = ans.codeOutput || ans.answer?.codeOutput || "";
        const sessionId = (typeof ans.answer === "object") ? ans.answer?.sessionId : (typeof ans.answer === "string" ? String(ans.answer) : null);

        return (
          <div
            key={qid}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 transition-all shadow-sm overflow-hidden"
          >
            {/* Question header */}
            <div className="flex items-center gap-3 p-4 bg-gray-50/80 dark:bg-zinc-850 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 font-bold font-mono">Question {idx + 1}</span>
                  <TypeBadge type={qType} />
                  {studentLang && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {studentLang}
                    </span>
                  )}
                  {!scoreSet ? <AlertCircle className="w-3.5 h-3.5 text-zinc-400" title="Not graded" /> :
                    isFullMark ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" title="Full marks" /> :
                      isZero ? <XCircle className="w-3.5 h-3.5 text-red-500" title="Zero" /> :
                        <Award className="w-3.5 h-3.5 text-indigo-600" title="Partial" />
                  }
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {ans.questionText || "(no question text)"}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-base font-black text-gray-900 dark:text-white">
                    {scoreSet ? scoreVal : "—"}
                    <span className="text-gray-400 font-normal text-xs"> / {ans.maxMarks} marks</span>
                  </p>
                  {ans.autoScore !== undefined && (
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Auto score: {ans.autoScore}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Question Body */}
            <div className="p-5 space-y-4">

              {/* Student's Answer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    {isCodeQ ? <Code2 className="w-3.5 h-3.5 text-emerald-500" /> : isDesignQ ? <Monitor className="w-3.5 h-3.5 text-indigo-500" /> : null}
                    Student's Submission
                  </p>
                </div>

                {/* Code Questions */}
                {isCodeQ ? (
                  <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                      <span>📄 main.{studentLang || "code"}</span>
                      <span className="text-[10px] uppercase text-emerald-400 font-bold">{studentLang || "code"} editor view</span>
                    </div>
                    <pre className="p-4 text-sm font-mono text-emerald-400 bg-zinc-950 overflow-auto max-h-96 leading-relaxed whitespace-pre">
                      {studentCode || "(no code submitted)"}
                    </pre>
                  </div>
                ) : isTerminalQ ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-2">
                        <Terminal className="w-4 h-4" /> Interactive Terminal Submission
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                        This answer is an interactive {qType === "os_linux" ? "Linux" : "Windows"} sandbox session. The student’s work is preserved in the session and displayed below.
                      </p>
                    </div>

                    {/* If we have a recorded session id, show a read-only terminal viewer */}
                    {qType === "os_linux" && !LINUX_TERMINAL_ENABLED ? (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                        Linux Terminal is temporarily unavailable; the saved terminal session cannot be opened.
                      </div>
                    ) : sessionId ? (
                      <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-80">
                        <LinuxLab initialSessionId={sessionId} readOnly={true} examId={examId} />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4 text-sm text-gray-500 dark:text-gray-400">
                        No terminal session was recorded for this submission.
                      </div>
                    )}
                  </div>
                ) : isDesignQ ? (
                  /* Design Lab Questions */
                  <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      <Monitor className="w-4 h-4" /> Design Lab Canvas Submission
                    </div>
                    {((typeof ans.answer === "object" && ans.answer?.designId) || typeof ans.answer === "string") ? (
                      <div className="flex justify-center">
                        <div className="max-w-sm max-h-96 overflow-auto">
                          <DesignPreview designId={typeof ans.answer === "object" ? ans.answer?.designId : String(ans.answer)} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4 text-sm text-gray-500 dark:text-gray-400">
                        No submitted design preview is available.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard / Text / MCQ Questions */
                  <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto max-h-48">
                    {ans.answer !== undefined && ans.answer !== null && ans.answer !== "" ? (
                      formatAnswer(ans.answer)
                    ) : (
                      <span className="text-gray-400 italic">No answer submitted</span>
                    )}
                  </div>
                )}
              </div>

              {/* Terminal / Execution Console Output */}
              {terminalOutput && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Real Terminal / Console Output
                  </p>
                  <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                    <div className="px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
                      CONSOLE EXECUTION LOGS
                    </div>
                    <pre className="p-3 text-xs font-mono text-emerald-400 bg-zinc-950 overflow-auto max-h-44 whitespace-pre-wrap">
                      {terminalOutput}
                    </pre>
                  </div>
                </div>
              )}

              {/* Correct answer display (for objective questions) */}
              {ans.correctAnswer !== undefined && ans.correctAnswer !== null && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">Correct Answer</p>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300 font-mono">
                    {Array.isArray(ans.correctAnswer)
                      ? ans.correctAnswer.join(", ")
                      : String(ans.correctAnswer)}
                  </div>
                </div>
              )}

              {/* Options (for MCQ) */}
              {ans.options?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Options</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ans.options.map((opt, i) => {
                      const isChosen = String(ans.answer) === opt;
                      const isCorrect = String(ans.correctAnswer) === opt;
                      return (
                        <div
                          key={i}
                          className={`px-3 py-2 rounded-lg text-sm border font-medium
                            ${isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300" :
                              isChosen ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-200" :
                                "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400"}`}
                        >
                          {opt}
                          {isCorrect && " ✓"}
                          {isChosen && !isCorrect && " ✗"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Grading Section ──────────────────────────────────────────── */}
              <div className="bg-gray-50/70 dark:bg-zinc-850 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-3 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Score input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Score Granted <span className="text-gray-400 font-normal">(Max {ans.maxMarks} points)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={ans.maxMarks}
                      step={0.5}
                      value={g.manualScore ?? ""}
                      onChange={(e) => onUpdateGrade(qid, "manualScore", e.target.value)}
                      placeholder={`0 - ${ans.maxMarks}`}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none font-bold text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Feedback */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Teacher Comments / Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={g.teacherFeedback ?? ""}
                      onChange={(e) => onUpdateGrade(qid, "teacherFeedback", e.target.value)}
                      placeholder="Enter feedback for student..."
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-y text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* AI assist button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => requestAi(qid)}
                    disabled={aiLoading === qid}
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                  >
                    {aiLoading === qid
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    }
                    AI Grading Assistance
                  </button>
                </div>

                {/* AI suggestions panel */}
                {suggestions && (
                  <AiAssistPanel
                    suggestions={suggestions}
                    maxMarks={ans.maxMarks}
                    onApplyScore={(s) => applyAiScore(qid, s)}
                    onApplyFeedback={(f) => applyAiFeedback(qid, f)}
                  />
                )}
              </div>

            </div>
          </div>
        );
      })}

      {answers.length === 0 && (
        <div className="text-center py-16 text-gray-500 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No answers found in this submission.</p>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      {type?.replace(/_/g, " ") || "—"}
    </span>
  );
}
