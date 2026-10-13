/**
 * StudentExamSession.jsx
 * ─────────────────────
 * Enterprise-grade exam session page.
 *
 * Key behaviours:
 *  ● All lab answers (coding, design, linux, essay, mcq) are persisted to
 *    localStorage on every keystroke so navigating away and back to any
 *    question NEVER loses work.  The store is keyed by `examId` and cleared
 *    on submit.
 *
 *  ● Dynamic watermark: student name, ID, exam ID, session ID, live clock —
 *    tiles across the full viewport with pointer-events:none.
 *
 *  ● Security: fullscreen enforcement, tab-switch detection, copy/paste
 *    blocking, print prevention, devtools heuristic — all via
 *    useExamSecurity.  Violations are logged to the backend in real time.
 *
 *  ● LinuxLab session ID is stored in answers so returning to a terminal
 *    question reconnects the SAME container (no data loss, no wasted
 *    container spin-up).
 *
 *  ● DesignLab design ID is stored in answers so the student's canvas is
 *    reloaded from the DB when they navigate back to the question.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import {
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";

import "../../styles/examtheme.css";
import useExamSecurity from "@/teacher/hooks/useexamsecurity";
import ExamWatermark from "../components/ExamWatermark";
import ExamCameraMonitor from "../components/ExamCameraMonitor";
import StandardQuestion from "../components/StandardQuestion";
import { StudentCodingLab } from "@/teacher/components/CodingLab";
import LinuxLab from "@/teacher/components/LinuxLab";
import DesignLab from "@/teacher/components/DesignLab";
import NetworkingLab from "@/teacher/components/NetworkingLab";
import WindowsLab from "@/teacher/components/WindowsLab";
import { uploadDesignToCloudinary } from "@/utils/designUploadUtils.js";

// ─── Shared Duolingo-style primary button ─────────────────────────────────────
const PRIMARY_BTN =
  "bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] " +
  "hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] " +
  "active:translate-y-1 active:shadow-none transition-all duration-150";

function unescapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Build the localStorage key for this exam's answer draft. */
const draftKey = (examId) => `exam_draft_${examId}`;

function readStoredDraft(examId) {
  try {
    const raw = localStorage.getItem(draftKey(examId));
    if (!raw) return { draft: null, error: "" };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { draft: null, error: "Saved browser draft has an invalid format." };
    }
    if (parsed.answers && typeof parsed.answers === "object" && !Array.isArray(parsed.answers)) {
      return {
        draft: {
          answers: parsed.answers,
          revision: Number.isSafeInteger(parsed.revision) ? parsed.revision : 0,
        },
        error: "",
      };
    }
    return { draft: { answers: parsed, revision: 0 }, error: "" };
  } catch (error) {
    return {
      draft: null,
      error: `Could not read the saved browser draft: ${error.message}`,
    };
  }
}

function buildServerAnswers(serverAnswers = []) {
  const initial = {};
  serverAnswers.forEach((answer) => {
    initial[answer.questionId] = {
      questionId: answer.questionId,
      type: answer.type,
      answer: answer.answer,
      codeOutput: answer.codeOutput ?? "",
    };
  });
  return initial;
}

function loadInitialAnswers(examId, serverAnswers = [], serverRevision = 0) {
  const stored = readStoredDraft(examId);
  const server = buildServerAnswers(serverAnswers);
  const local = stored.draft;
  const useLocal = local &&
    (local.revision > serverRevision ||
      (Object.keys(server).length === 0 && Object.keys(local.answers).length > 0));

  return {
    answers: useLocal ? local.answers : server,
    revision: Math.max(serverRevision, local?.revision || 0),
    storageError: stored.error,
  };
}

export default function StudentExamSession() {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [examSession, setExamSession] = useState(location.state?.examSession || null);
  const [sessionLoading, setSessionLoading] = useState(!location.state?.examSession);
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [answersReady, setAnswersReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveRetry, setSaveRetry] = useState(0);
  const answerRevisionRef = useRef(0);
  const [fullscreenError, setFullscreenError] = useState("");

  const exam = examSession?.exam;
  const questions = exam?.questions || [];

  // A session is restored by the server so a refresh never creates a new attempt.
  useEffect(() => {
    if (examSession || !examId) return;
    let cancelled = false;
    setSessionLoading(true);
    setSessionError("");
    (async () => {
      try {
        const { data } = await axios.get(`/api/exams/student/${examId}/start`);
        if (!data?.data?.exam || String(data.data.exam._id) !== String(examId)) {
          throw new Error("The server returned an invalid exam session.");
        }
        if (!cancelled) setExamSession(data.data);
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.message || err.message ||
            "Could not load your exam session. Check your connection and retry.";
          setSessionError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId, examSession, sessionRetry]);

  // ─── answers: ALL student work lives here ───────────────────────────────────
  useEffect(() => {
    if (!examId || !examSession) return;
    setAnswersReady(false);
    const initial = loadInitialAnswers(
      examId,
      examSession.answers,
      examSession.answerRevision || 0,
    );
    answerRevisionRef.current = initial.revision;
    setAnswers(initial.answers);
    setStorageWarning(initial.storageError);
    setAnswersReady(true);
  }, [examId, examSession]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Persist answers to localStorage on every change ────────────────────────
  // This is the core of "don't lose work when switching questions".
  // The write is synchronous (localStorage.setItem) so data survives
  // unmount/remount of individual lab components.
  useEffect(() => {
    if (!examId || !examSession || !answersReady) return;
    try {
      localStorage.setItem(draftKey(examId), JSON.stringify({
        answers,
        revision: answerRevisionRef.current,
      }));
      setStorageWarning("");
    } catch (error) {
      setStorageWarning(`Browser draft storage is unavailable: ${error.message}`);
    }
  }, [answers, answersReady, examId, examSession]);

  // ─── Universal answer change handler ────────────────────────────────────────
  const handleAnswerChange = useCallback(
    (questionId, value, extra = {}) => {
      answerRevisionRef.current = Math.max(
        Date.now(),
        answerRevisionRef.current + 1,
      );
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          questionId,
          type: questions.find((q) => q._id === questionId)?.type,
          answer: value,
          codeOutput: extra.codeOutput ?? value?.codeOutput ?? prev[questionId]?.codeOutput ?? "",
        },
      }));
    },
    [questions]
  );

  // ─── Submit exam ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (isAuto = false) => {
      if (!isAuto) {
        const ok = window.confirm(
          t("exam.confirmSubmit") ||
          "Are you sure you want to submit? You cannot change answers after submitting."
        );
        if (!ok) return;
      }
      setIsSubmitting(true);
      try {
        // Prepare answers for submission
        let finalAnswers = Object.values(answers);

        // For design_lab questions, we already have the designImageUrl stored
        // If not, try to grab it from the exam HTML canvas if available
        finalAnswers = finalAnswers.map((ans) => {
          const question = exam?.questions?.find((q) => q._id === ans.questionId);
          // If it's a design lab and we don't have an image URL yet, keep designId
          // The backend will handle storing what we have
          return {
            ...ans,
            answer: ans.answer, // Will contain { designId, designImageUrl } if exported
          };
        });

        const clientRevision = Math.max(
          Date.now(),
          answerRevisionRef.current + 1,
        );
        answerRevisionRef.current = clientRevision;
        await axios.post(`/api/exams/student/${examId}/submit`, {
          answers: finalAnswers,
          clientRevision,
        });
        // Clear draft on successful submit
        localStorage.removeItem(draftKey(examId));
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        toast.success(
          isAuto
            ? "Exam auto-submitted."
            : `${t("exam.submit") || "Exam"} submitted successfully!`
        );
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Submit failed");
        setIsSubmitting(false);
      }
    },
    [answers, examId, navigate, t]
  );

  // ─── Security hook ───────────────────────────────────────────────────────────
  const { violations, isFullscreen, violationCount, sessionId } =
    useExamSecurity({
      enabled: !!exam,
      rules: {
        fullscreenRequired: exam?.security?.fullscreenRequired,
        preventTabSwitch: exam?.security?.detectTabSwitch ?? exam?.security?.preventTabSwitch,
        blockClipboard:
          exam?.security?.disableCopy !== false ||
          exam?.security?.disablePaste !== false,
        blockRightClick: exam?.security?.disableRightClick !== false,
        detectDevtools: true,
        preventDuplicateTabs: true,
        recordViolations: exam?.security?.recordViolations !== false,
      },
      maxViolations: 5,
      onViolation: (entry) => {
        if (exam?.security?.recordViolations !== false) {
          axios
            .post(`/api/exams/student/${examId}/log-cheating`, {
              action: entry.type,
            })
            .catch((error) => {
              console.error("Could not record the configured exam integrity event:", error);
            });
        }
        toast.error(
          t("exam.cheatingWarning") ||
          "This action may be recorded under your exam's integrity policy."
        );
      },
      onMaxViolations: () => {
        if (exam?.security?.recordViolations !== false && exam?.security?.autoSubmit) {
          toast.error(
            t("exam.autoSubmitted") ||
            "Exam auto-submitted due to repeated violations."
          );
          handleSubmit(true);
        }
      },
    });

  // ─── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam) return;
    const sessionEnd = new Date(exam.endTime).getTime();
    setTimeLeft(Math.max(0, Math.floor((sessionEnd - Date.now()) / 1000)));

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (exam.security?.autoSubmit) handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  // ─── Backend autosave (3-second debounce, belt-and-suspenders) ──────────────
  // Browser draft storage covers refresh; this writes the same answers to the
  // server so recovery works across browsers and devices.
  useEffect(() => {
    if (!examId || !examSession || !answersReady || isSubmitting) return;
    const timer = setTimeout(() => {
      const clientRevision = Math.max(
        Date.now(),
        answerRevisionRef.current + 1,
      );
      answerRevisionRef.current = clientRevision;
      setSaveError("");
      axios.post(`/api/exams/student/${examId}/autosave`, {
          answers: Object.values(answers),
          clientRevision,
        })
        .then(({ data }) => {
          answerRevisionRef.current = Math.max(
            answerRevisionRef.current,
            data.data?.answerRevision || 0,
          );
        })
        .catch((error) => {
          setSaveError(
            error.response?.data?.message ||
              error.message ||
              "Answers could not be saved. Retry before leaving this page.",
          );
        });
    }, 3000);
    return () => clearTimeout(timer);
  }, [answers, answersReady, examId, examSession, isSubmitting, saveRetry]);

  const handleEnterFullscreen = useCallback(async () => {
    if (!document.fullscreenEnabled) {
      setFullscreenError("Fullscreen is not supported by this browser. Use a supported browser or contact your instructor.");
      return;
    }
    try {
      const root = document.querySelector(".exam-root") || document.documentElement;
      await root.requestFullscreen();
      setFullscreenError("");
    } catch (error) {
      setFullscreenError(
        error?.message
          ? `Chrome did not enter fullscreen: ${error.message}. Select the button to try again.`
          : "Chrome did not enter fullscreen. Select the button to try again.",
      );
    }
  }, []);

  if (sessionLoading) {
    return (
      <div role="status" className="p-8 text-center font-display text-lg">
        {t("exam.loadingSession") || "Loading your exam session…"}
      </div>
    );
  }
  if (sessionError || !examSession || !exam) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Your exam session could not be loaded</h1>
        <p role="alert" className="text-red-700 dark:text-red-300">
          {sessionError || "The server did not return a valid exam session."}
        </p>
        <button
          type="button"
          onClick={() => setSessionRetry((attempt) => attempt + 1)}
          className="rounded-lg bg-[#2C2DE0] px-5 py-3 font-semibold text-white"
        >
          Retry session recovery
        </button>
        <Link to="/exam-portal" className="ml-3 text-[#2C2DE0] underline">
          Return to exam portal
        </Link>
        {sessionError.includes("logged in") && (
          <Link to="/login" className="ml-3 text-[#2C2DE0] underline">
            Sign in
          </Link>
        )}
      </main>
    );
  }

  const activeQuestion = questions[currentQ];
  if (!activeQuestion) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-8">
        <p role="alert">This exam session has no available questions. Your attempt has not been submitted.</p>
        <Link to="/exam-portal" className="text-[#2C2DE0] underline">Return to exam portal</Link>
      </main>
    );
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const answeredCount = questions.filter(
    (q) =>
      answers[q._id]?.answer !== undefined && answers[q._id]?.answer !== ""
  ).length;

  // Student identity for watermark — use what the server gave us
  const studentName = examSession?.studentName || examSession?.student?.fullName || "";
  const studentId = examSession?.studentId || examSession?.student?.studentId || "";

  return (
    <div className="exam-root h-screen w-full flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 overflow-hidden">
      {/* ── Dynamic watermark (pointer-events:none overlay) ──────────────── */}
      <ExamWatermark
        studentName={studentName}
        studentId={studentId}
        examId={String(examId)}
        examTitle={exam.title}
        sessionId={sessionId || examSession?.submissionId}
      />
      <ExamCameraMonitor
        examId={examId}
        required={!!exam?.security?.cameraRequired}
        microphoneRequired={!!exam?.security?.microphoneRequired}
      />
      {exam.security?.fullscreenRequired && !isFullscreen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-neutral-950/95 p-6 text-white">
          <section className="max-w-xl space-y-4 text-center" role="alert">
            <h2 className="text-2xl font-semibold">Enter fullscreen to continue</h2>
            <p>
              This exam's policy requires browser fullscreen. Chrome only permits this after you click below.
              If you exit fullscreen, this screen will return and you can re-enter.
            </p>
            <p className="text-sm text-white/70">
              Browser fullscreen cannot prevent operating-system actions, screenshots, application switching, or all keyboard shortcuts.
            </p>
            {!document.fullscreenEnabled && (
              <p className="font-medium text-amber-200">
                This browser does not support fullscreen. Use a supported browser or contact your instructor;
                this attempt remains available for recovery and has not been submitted.
              </p>
            )}
            {fullscreenError && <p className="text-amber-200">{fullscreenError}</p>}
            {document.fullscreenEnabled ? (
              <button
                type="button"
                onClick={handleEnterFullscreen}
                className={`${PRIMARY_BTN} rounded-lg px-6 py-3`}
              >
                Enter fullscreen
              </button>
            ) : (
              <Link to="/exam-portal" className="inline-block underline">
                Return to exam portal
              </Link>
            )}
          </section>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#2C2DE0]/10 rounded-lg flex items-center justify-center text-[#1E1FAA] dark:text-[#2C2DE0] font-display font-bold tracking-wider">
            EX
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg leading-tight exam-no-select">
              {exam.title}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 exam-no-select">
              {t("exam.secureEnvironment") || "Browser exam session"}
              {studentName && ` · ${studentName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-lg font-semibold border ${timeLeft < 300
              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              : "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600"
              }`}
          >
            <Clock className="w-5 h-5 opacity-70" />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className={`${PRIMARY_BTN} px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50`}
          >
            {isSubmitting
              ? t("exam.submitting") || "Submitting…"
              : t("exam.submit") || "Submit exam"}
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {storageWarning && (
        <p role="alert" className="shrink-0 bg-amber-100 px-4 py-2 text-sm text-amber-950">
          {storageWarning} Server autosave remains available while this page is connected.
        </p>
      )}
      {saveError && (
        <div role="alert" className="flex shrink-0 items-center justify-between gap-4 bg-red-100 px-4 py-2 text-sm text-red-950">
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveRetry((attempt) => attempt + 1)}
            className="shrink-0 rounded border border-red-700 px-3 py-1 font-semibold"
          >
            Retry save
          </button>
        </div>
      )}

      {/* ── Integrity status strip ───────────────────────────────────────── */}
      <div
        className={`h-9 flex items-center justify-center gap-6 text-xs font-medium shrink-0 border-b exam-no-select ${violationCount > 0
          ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          : "bg-[#2C2DE0]/15 border-[#2C2DE0]/40 text-[#1E1FAA] dark:bg-[#2C2DE0]/20 dark:border-[#2C2DE0]/50 dark:text-[#A5A6FF]"
          }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`integrity-dot ${isFullscreen ? "text-[#2C2DE0]" : "text-orange-500"
              }`}
          />
          {isFullscreen
            ? t("exam.fullscreenActive") || "Fullscreen active"
            : t("exam.fullscreenInfo") || "Fullscreen recommended"}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          {violationCount === 0
              ? t("exam.noViolations") || "No violations"
              : `${violationCount} ${t("exam.violations") || "violation(s)"}`}
          </span>
        <span>
          {answeredCount}/{questions.length} {t("exam.answered") || "answered"}
        </span>
        {sessionId && (
          <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">
            Session {sessionId}
          </span>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question navigator */}
        <aside className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto shrink-0 hidden md:block">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800">
            <h3 className="font-semibold text-xs text-neutral-500 uppercase tracking-wider exam-no-select">
              {t("exam.questionsLabel") || "Questions"}
            </h3>
          </div>
          <div className="p-4 grid grid-cols-4 gap-2">
            {questions.map((q, idx) => {
              const ans = answers[q._id];
              const isAnswered =
                ans?.answer !== undefined && ans?.answer !== "" && ans?.answer !== null;
              const isActive = currentQ === idx;
              return (
                <button
                  key={q._id}
                  onClick={() => setCurrentQ(idx)}
                  className={`aspect-square rounded-lg flex items-center justify-center font-medium text-sm border-2 ${isActive
                    ? `${PRIMARY_BTN} border-transparent`
                    : isAnswered
                      ? "border-transparent bg-[#2C2DE0]/20 text-[#2f6b01] dark:bg-[#2C2DE0]/20 dark:text-[#8fe040] transition-colors"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
                    }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div
              className={`mx-auto space-y-8 ${["lab", "os_linux", "design_lab"].includes(activeQuestion.type)
                ? "max-w-none"
                : "max-w-4xl"
                }`}
            >
              {/* Question header */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold exam-no-select">
                  <span className="text-neutral-400 mr-2">{currentQ + 1}.</span>
                  {unescapeHtml(activeQuestion.question)}
                </h2>
                <div className="bg-[#2C2DE0]/15 text-[#2f6b01] dark:text-[#8fe040] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap exam-no-select">
                  {activeQuestion.marks} {t("exam.marks") || "marks"}
                </div>
              </div>

              {/* Attached image */}
              {activeQuestion.image && (
                <div className="mt-4 mb-6">
                  <img
                    src={activeQuestion.image}
                    alt="Question attachment"
                    className="max-w-full h-auto rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm"
                    style={{ maxHeight: "400px" }}
                  />
                </div>
              )}

              {/* ── Lab / answer area ────────────────────────────────────────── */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700">
                {/* Standard questions: MCQ, T/F, Essay */}
                {["mcq", "multi_select", "truefalse", "short_answer", "essay"].includes(activeQuestion.type) && (
                  <StandardQuestion
                    question={activeQuestion}
                    value={answers[activeQuestion._id]?.answer}
                    onChange={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}

                {/* ── Coding Lab ─────────────────────────────────────────────── */}
                {activeQuestion.type === "lab" && (
                  <StudentCodingLab
                    key={activeQuestion._id}
                    question={activeQuestion}
                    value={answers[activeQuestion._id]?.answer}
                    onSave={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}

                {/* ── Linux / Terminal Lab ────────────────────────────────────
                  We pass the previously stored sessionId back so the lab
                  reconnects to the SAME Docker container instead of spawning
                  a new one every time the student navigates back.
                ─────────────────────────────────────────────────────────── */}
                {activeQuestion.type === "os_linux" && (
                  <LinuxLab
                    key={activeQuestion._id}
                    examId={examId}
                    question={activeQuestion}
                    initialSessionId={
                      answers[activeQuestion._id]?.answer?.sessionId ||
                      (typeof answers[activeQuestion._id]?.answer === "string"
                        ? answers[activeQuestion._id]?.answer
                        : null)
                    }
                    onSessionReady={(sid) =>
                      handleAnswerChange(activeQuestion._id, {
                        ...(typeof answers[activeQuestion._id]?.answer === "object"
                          ? answers[activeQuestion._id]?.answer
                          : {}),
                        sessionId: sid,
                      })
                    }
                    value={answers[activeQuestion._id]?.answer}
                    onChange={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}

                {/* ── Design Lab ──────────────────────────────────────────────
                  We pass the previously stored designId back so the design
                  canvas loads the student's saved design instead of creating
                  a new blank one every time they navigate back.
                ─────────────────────────────────────────────────────────── */}
                {activeQuestion.type === "design_lab" && (
                  <DesignLab
                    key={activeQuestion._id}
                    question={activeQuestion}
                    initialDesignId={
                      answers[activeQuestion._id]?.answer?.designId ||
                      (typeof answers[activeQuestion._id]?.answer === "string"
                        ? answers[activeQuestion._id]?.answer
                        : null)
                    }
                    onDesignCreated={(designId) =>
                      handleAnswerChange(activeQuestion._id, {
                        ...(typeof answers[activeQuestion._id]?.answer === "object"
                          ? answers[activeQuestion._id]?.answer
                          : {}),
                        designId,
                      })
                    }
                    value={answers[activeQuestion._id]?.answer}
                    onChange={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}

                {activeQuestion.type === "networking_lab" && (
                  <NetworkingLab
                    key={activeQuestion._id}
                    question={activeQuestion}
                    value={answers[activeQuestion._id]?.answer}
                    onChange={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}

                {activeQuestion.type === "os_windows" && (
                  <WindowsLab
                    key={activeQuestion._id}
                    question={activeQuestion}
                    value={answers[activeQuestion._id]?.answer}
                    onChange={(val) =>
                      handleAnswerChange(activeQuestion._id, val)
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer navigation */}
          <div className="h-20 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-6 lg:px-10 shrink-0">
            <button
              onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className={`${PRIMARY_BTN} px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-30 disabled:shadow-none disabled:translate-y-0`}
            >
              <ChevronLeft className="w-5 h-5" />
              {t("exam.previous") || "Previous"}
            </button>

            <div className="text-sm font-medium text-neutral-500 exam-no-select">
              {t("exam.question") || "Question"} {currentQ + 1}{" "}
              {t("exam.of") || "of"} {questions.length}
            </div>

            <button
              onClick={() =>
                setCurrentQ((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
              disabled={currentQ === questions.length - 1}
              className={`${PRIMARY_BTN} px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-30 disabled:shadow-none disabled:translate-y-0`}
            >
              {t("exam.next") || "Next"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}