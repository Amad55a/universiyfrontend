import React, { useState } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import DesignSnapshotPreview from "../../../components/DesignSnapshotPreview";
import SubmittedCodeFiles from "../../../components/SubmittedCodeFiles";
import {
  AlertCircle, CheckCircle2, XCircle, Award, ChevronUp, ChevronDown,
  Sparkles, Loader2, Code2, Terminal, Monitor
} from "lucide-react";
import AiAssistPanel from "../AiAssistPanel";
import LinuxLab from "../../components/LinuxLab";
import { LINUX_TERMINAL_ENABLED } from "../../../config/features";
export { decodeLegacyHtmlSource, extractSubmittedCodeFiles } from "../../../components/SubmittedCodeFiles";

function extractCodeAndLang(answer) {
  if (!answer) return { code: "", lang: "" };
  if (typeof answer === "string") return { code: answer, lang: "" };
  if (typeof answer === "object") {
    const lang = answer.langId || answer.language || "";
    let code = answer.code || "";
    if (!code && answer.codes && lang && answer.codes[lang]) {
      code = answer.codes[lang];
    }
    if (!code && answer.codes) {
      const firstKey = Object.keys(answer.codes)[0];
      if (firstKey) code = answer.codes[firstKey];
    }
    if (!code && answer.codeSolution) code = answer.codeSolution;
    if (!code && answer.html) {
      code = `<!-- HTML -->\n${answer.html}\n\n/* CSS */\n${answer.css || ""}\n\n// JavaScript\n${answer.javascript || ""}`;
    }
    return { code: code || "", lang: lang || "code" };
  }
  return { code: String(answer), lang: "" };
}

function formatAnswer(answer) {
  if (answer === undefined || answer === null || answer === "") return "";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "object") {
    const { code } = extractCodeAndLang(answer);
    return code || JSON.stringify(answer, null, 2);
  }
  return String(answer);
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
      const { data } = await api.post(
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
        const isCodeQ = ["lab", "programming", "labhtml", "html_css_js", "react_project"].includes(qType) ||
          (typeof ans.answer === "object" && (ans.answer?.code || ans.answer?.codes));
        const isDesignQ = qType === "design_lab" || (typeof ans.answer === "object" && ans.answer?.designId);

        const { lang: studentLang } = extractCodeAndLang(ans.answer);
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
                  <div className="space-y-3">
                    <SubmittedCodeFiles answer={ans.answer} answerType={qType} />
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
                    <DesignSnapshotPreview snapshot={ans.designSnapshot} label="Student's submitted design" />
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
