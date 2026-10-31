import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/api/client";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, AlertCircle, Save, Loader2, Shield, Award
} from "lucide-react";

import QuestionsTab from "../grading/tabs/QuestionsTab";
import PublishButton from "../grading/PublishButton";

export default function TeacherGradingWorkspace() {
  const { examId, subId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromExamId = new URLSearchParams(location.search).get("exam") || examId;

  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Local grading state — mirrors answers for draft saving
  const [grades, setGrades] = useState({}); // { [questionId]: { manualScore, teacherFeedback, privateNotes } }

  // ── Fetch submission detail ─────────────────────────────────────────────────
  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/api/exams/teacher/${fromExamId}/submissions/${subId}`
      );
      const sub = data.data.submission;
      const examMeta = data.data.exam;
      setSubmission(sub);
      setExam(examMeta);

      // Pre-fill grades from existing manual scores
      const init = {};
      (sub.answers || []).forEach((ans) => {
        const qid = ans.questionId?.toString?.() || ans.questionId;
        init[qid] = {
          manualScore: ans.manualScore ?? "",
          teacherFeedback: ans.teacherFeedback || "",
          privateNotes: ans.privateNotes || "",
          maxMarks: ans.maxMarks || 0,
        };
      });
      setGrades(init);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [fromExamId, subId]);

  useEffect(() => { fetchSubmission(); }, [fetchSubmission]);

  // ── Update a single question's grade ───────────────────────────────────────
  const updateGrade = (questionId, field, value) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    try {
      setSaving(true);
      const answers = Object.entries(grades).map(([questionId, g]) => ({
        questionId,
        manualScore: g.manualScore !== "" ? Number(g.manualScore) : null,
        teacherFeedback: g.teacherFeedback,
        privateNotes: g.privateNotes,
      }));
      await api.put(`/api/exams/teacher/${fromExamId}/submissions/${subId}/grade`, {
        answers,
        finalize: false,
      });
      toast.success("Draft saved. Finalize grading when ready to publish.");
      fetchSubmission();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  // ── Finalize grading ──────────────────────────────────────────────────────
  const finalizeGrading = async () => {
    try {
      setSaving(true);
      const answers = Object.entries(grades).map(([questionId, g]) => ({
        questionId,
        manualScore: g.manualScore !== "" ? Number(g.manualScore) : null,
        teacherFeedback: g.teacherFeedback,
        privateNotes: g.privateNotes,
      }));
      await api.put(`/api/exams/teacher/${fromExamId}/submissions/${subId}/grade`, {
        answers,
        finalize: true,
      });
      toast.success("Grading finalized! Publish results for students to see them.");
      fetchSubmission();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to finalize");
    } finally {
      setSaving(false);
    }
  };

  // ── Publish result ────────────────────────────────────────────────────────
  const publishResult = async () => {
    try {
      setPublishing(true);
      await api.put(`/api/exams/teacher/${fromExamId}/submissions/${subId}/publish`);
      toast.success("Result published to student!");
      fetchSubmission();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  // ── Computed score summary ────────────────────────────────────────────────
  const computedTotal = (submission?.answers || []).reduce((sum, answer) => {
    const questionId = answer.questionId?.toString?.() || answer.questionId;
    const manualScore = grades[questionId]?.manualScore;
    const selectedScore = manualScore !== "" && manualScore !== null && manualScore !== undefined
      ? Number(manualScore)
      : Number(answer.autoScore) || 0;
    return sum + (Number.isFinite(selectedScore) ? selectedScore : 0);
  }, 0);
  const maxMarksTotal = exam
    ? submission?.answers?.reduce((s, a) => s + (a.maxMarks || 0), 0) || 0
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2DE0]" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-500">
        <AlertCircle className="w-12 h-12" />
        <p>Submission not found.</p>
        <button onClick={() => navigate(-1)} className="text-[#2C2DE0] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const student = submission.studentId || {};
  const pct = maxMarksTotal > 0 ? Math.round((computedTotal / maxMarksTotal) * 100) : 0;
  const isPublished = submission.status === "published";

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-zinc-950">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-3">
          <button
            onClick={() => navigate(`/teacher/submissions?examId=${fromExamId}`)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Student info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2C2DE0] to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(student.fullName || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {student.fullName || "Unknown Student"}
              </p>
              <p className="text-xs text-gray-500">
                ID: {student.universityId || student.studentId || "—"} · {exam?.title}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="hidden md:flex items-center gap-3">
            <StatusBadge status={submission.status} />
            {submission.cheatingLogs?.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                <Shield className="w-3.5 h-3.5" />
                {submission.cheatingLogs.length} violation{submission.cheatingLogs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Score pill */}
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            <Award className="w-4 h-4 text-[#2C2DE0]" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {computedTotal} / {maxMarksTotal}
            </span>
            <span className={`text-xs font-semibold ${pct >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              ({pct}%)
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </button>
            <button
              onClick={finalizeGrading}
              disabled={saving || isPublished}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Finalize
            </button>
            <PublishButton
              isPublished={isPublished}
              isGraded={["graded", "auto-graded"].includes(submission.status)}
              loading={publishing}
              onPublish={publishResult}
            />
          </div>
        </div>
      </div>

      {/* ── Content: Clean Single Page (No Tabs) ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <QuestionsTab
          submission={submission}
          grades={grades}
          onUpdateGrade={updateGrade}
          examId={fromExamId}
          onRefresh={fetchSubmission}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    "in-progress": { label: "In Progress", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
    "submitted": { label: "Submitted", cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300" },
    "auto-graded": { label: "Auto-Graded", cls: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300" },
    "manual-review": { label: "Needs Review", cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300" },
    "graded": { label: "Graded", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
    "published": { label: "Published", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300" },
  };
  const c = config[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
}
