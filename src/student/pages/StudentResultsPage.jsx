import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import DesignSnapshotPreview from "../../components/DesignSnapshotPreview";
import {
  Award, AlertCircle, FileText, CheckCircle2, ChevronRight, ArrowLeft,
  MessageSquare, Send, Sparkles, Loader2, Calendar, Shield, Play
} from "lucide-react";

export default function StudentResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Appeal Modal/Form State
  const [appealingQId, setAppealingQId] = useState(null); // null = not appealing, or questionId, or "overall"
  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/student/results");
      setResults(data.data.results || []);
    } catch (err) {
      toast.error("Failed to load results list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchDetail = async (subId) => {
    try {
      setDetailLoading(true);
      const { data } = await axios.get(`/api/student/results/${subId}`);
      setDetail(data.data.submission);
      setSelectedSubId(subId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load result details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    try {
      setSubmittingAppeal(true);
      await axios.post("/api/grade-appeals", {
        submissionId: selectedSubId,
        examId: detail.examId || detail._id,
        questionId: appealingQId === "overall" ? null : appealingQId,
        reason: appealReason,
      });
      toast.success("Grade appeal submitted successfully!");
      setAppealReason("");
      setAppealingQId(null);
      fetchDetail(selectedSubId); // refresh to show pending appeal badge
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit appeal");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-gray-50 dark:bg-zinc-950 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2DE0]" />
      </div>
    );
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selectedSubId && detail) {
    const isFailed = detail.percentage < 60;
    return (
      <div className="space-y-6 w-full p-4 md:p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen">
        {/* Detail Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedSubId(null); setDetail(null); }}
            className="p-2 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">{detail.examTitle}</h1>
            <p className="text-xs text-gray-500">
              Published on: {new Date(detail.publishedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Big score metric row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <div className="text-center p-3">
            <p className={`text-3xl font-black ${isFailed ? "text-red-500" : "text-[#2C2DE0]"}`}>
              {detail.percentage}%
            </p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">Grade</p>
          </div>
          <div className="text-center p-3 border-y sm:border-y-0 sm:border-x border-gray-100 dark:border-zinc-800">
            <p className="text-3xl font-black text-gray-800 dark:text-white">
              {detail.totalScore} <span className="text-sm font-normal text-gray-400">/ {detail.totalMaxMarks}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">Points Earned</p>
          </div>
          <div className="text-center p-3 flex flex-col items-center justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest
              ${isFailed ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-[#2C2DE0] text-white dark:bg-[#2C2DE0]/10 dark:text-[#2C2DE0]"}`}
            >
              {isFailed ? "Failed" : "Passed"}
            </span>
          </div>
        </div>

        {/* Global/Overall Appeal Section */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Dispute Overall Exam Grade?</p>
            <p className="text-xs text-gray-400">You can submit a formal grade appeal directly to your instructor.</p>
          </div>
          {detail.appeals?.find((ap) => !ap.questionId) ? (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">
              Appeal Pending
            </span>
          ) : (
            <button
              onClick={() => setAppealingQId("overall")}
              className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Appeal Score
            </button>
          )}
        </div>

        {/* Appeal Form Drawer (if active) */}
        {appealingQId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-gray-200 dark:border-zinc-800 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Submit Grade Appeal</h3>
                <button onClick={() => setAppealingQId(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400">✕</button>
              </div>
              <form onSubmit={handleAppealSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Explain your reason</label>
                  <textarea
                    required
                    rows={4}
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Provide clear educational grounds or reference rubric issues..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-[#2C2DE0] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white font-bold rounded-xl disabled:opacity-50 text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
                >
                  {submittingAppeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Dispute
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Question-by-question review cards */}
        <div className="space-y-4">
          {(detail.answers || []).map((ans, idx) => {
            const qid = ans.questionId?.toString();
            const appeal = detail.appeals?.find((ap) => ap.questionId?.toString() === qid);
            const scoreSet = ans.finalScore !== undefined;

            return (
              <div key={qid} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-gray-400">Question {idx + 1} ({ans.questionType})</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                      {scoreSet ? ans.finalScore : 0} / {ans.maxMarks}
                    </span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ans.questionText}</p>

                {/* Student submitted answer */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Your Answer</p>

                  {ans.questionType === "design_lab" ? (
                    <DesignSnapshotPreview snapshot={ans.designSnapshot} label="Your submitted design" />
                  ) : ["os_linux", "os_windows"].includes(ans.questionType) ? (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-800 dark:text-gray-200">
                      {ans.studentAnswer ? (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Interactive terminal session recorded.</p>
                          {typeof ans.studentAnswer === "object" && ans.studentAnswer?.sessionId ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Session ID: {ans.studentAnswer.sessionId}</p>
                          ) : null}
                          <p>
                            Your terminal work was saved with this submission. The execution output is shown below if available.
                          </p>
                        </>
                      ) : (
                        <span className="italic text-gray-400">No terminal session was recorded.</span>
                      )}
                    </div>
                  ) : ["lab", "programming"].includes(ans.questionType) || (typeof ans.studentAnswer === "object" && ans.studentAnswer?.code) ? (
                    <pre className="p-4 bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-xl font-mono text-xs overflow-auto max-h-60 leading-relaxed">
                      {typeof ans.studentAnswer === "object" ? ans.studentAnswer.code || JSON.stringify(ans.studentAnswer, null, 2) : String(ans.studentAnswer || "")}
                    </pre>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-150 dark:border-zinc-800 rounded-xl font-mono text-sm text-gray-800 dark:text-gray-200 max-h-36 overflow-auto">
                      {ans.studentAnswer !== undefined && ans.studentAnswer !== ""
                        ? (Array.isArray(ans.studentAnswer) ? ans.studentAnswer.join(", ") : String(ans.studentAnswer))
                        : <span className="italic text-gray-400">No answer submitted</span>
                      }
                    </div>
                  )}
                </div>

                {/* Real terminal / console output if available */}
                {ans.codeOutput && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Execution / Terminal Output</p>
                    <pre className="p-3 bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-xl font-mono text-xs overflow-auto max-h-36 whitespace-pre-wrap">
                      {ans.codeOutput}
                    </pre>
                  </div>
                )}

                {/* Correct answer display */}
                {ans.correctAnswer !== undefined && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Correct Answer</p>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-800 dark:text-emerald-300 font-mono">
                      {Array.isArray(ans.correctAnswer) ? ans.correctAnswer.join(", ") : String(ans.correctAnswer)}
                    </div>
                  </div>
                )}

                {/* Gemini AI explanation */}
                {ans.aiFeedback && (
                  <div className="bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/25 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Gemini Tutor Explanation
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{ans.aiFeedback}</p>
                  </div>
                )}

                {/* Teacher feedback */}
                {ans.teacherFeedback && (
                  <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl p-4">
                    <div className="text-blue-700 dark:text-blue-400 text-xs font-bold mb-1">Teacher's Comment</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{ans.teacherFeedback}</p>
                  </div>
                )}

                {/* Appeal handler for question */}
                <div className="flex justify-end pt-2 border-t border-gray-50 dark:border-zinc-800">
                  {appeal ? (
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider
                      ${appeal.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        appeal.status === "modified" || appeal.status === "accepted" ? "bg-[#2C2DE0] text-white" :
                          "bg-red-100 text-red-800"}`}
                    >
                      Dispute: {appeal.status} {appeal.modifiedScore !== null && `(New score: ${appeal.modifiedScore})`}
                    </span>
                  ) : (
                    <button
                      onClick={() => setAppealingQId(qid)}
                      className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:underline"
                    >
                      <MessageSquare className="w-3 h-3" /> Flag Rubric Issue / Appeal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Results list view ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full mx-auto p-4 md:p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-7 h-7 text-[#2C2DE0]" />
          Exam Results
        </h1>
        <p className="text-gray-500 text-sm">
          Review your published exam performance, tutor explanations, and submit grade appeals.
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">No results published yet</p>
          <p className="text-xs text-gray-400 mt-1">Grades will appear here once your instructor publishes them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((res) => {
            const isFailed = res.percentage < 60;
            return (
              <div
                key={res._id}
                className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-[#2C2DE0] dark:hover:border-[#2C2DE0]/30 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{res.examTitle}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0
                      ${isFailed ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-[#2C2DE0] text-white dark:bg-[#2C2DE0]/10 dark:text-[#2C2DE0]"}`}
                    >
                      {isFailed ? "Fail" : "Pass"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Published: {new Date(res.publishedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-end gap-3 pt-2">
                    <div>
                      <p className="text-2xl font-black text-gray-800 dark:text-white">{res.percentage}%</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Percent</p>
                    </div>
                    <div className="border-l border-gray-100 dark:border-zinc-800 pl-3">
                      <p className="text-2xl font-bold text-gray-500">{res.totalScore} / {res.totalMaxMarks}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => fetchDetail(res._id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-250 text-xs font-bold rounded-xl transition-colors"
                >
                  <Play className="w-3 h-3 text-[#2C2DE0] fill-current" /> View Detailed Feedback
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
