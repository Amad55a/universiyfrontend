import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/client";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Schedule unavailable"
    : date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

export default function StudentExamDetailsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState("");

  const {
    data: exam,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student", "exam", examId],
    queryFn: async () => {
      const { data } = await api.get(`/exams/student/${examId}/details`);
      return data?.data?.exam || null;
    },
  });

  const canStartInBrowser = exam?.canStartInBrowser ??
    (exam?.canStart && !exam?.sebRequired && !exam?.security?.browserLock);

  const handleStartExam = async () => {
    if (!exam?.id || !canStartInBrowser || launching) return;
    setLaunching(true);
    setLaunchMessage("");
    try {
      const { data: issueResponse } = await api.post(
        `/exams/student/${exam.id}/launch-token`,
        {},
      );
      const issued = issueResponse?.data;
      const expiry = Date.parse(issued?.expiresAt);
      if (
        typeof issued?.token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(issued.token) ||
        issued?.exam?.id !== exam.id ||
        !Number.isFinite(expiry) ||
        expiry <= Date.now()
      ) {
        throw new Error("The exam launch token was invalid or expired. Please try again.");
      }

      const { data: redeemResponse } = await api.post(
        "/exams/student/launch-token/redeem",
        { token: issued.token },
      );
      if (redeemResponse?.data?.examId !== exam.id) {
        throw new Error("The launch token was not authorized for this exam.");
      }

      navigate(`/exam-session/${exam.id}`, { replace: true });
    } catch (launchError) {
      const message = launchError.response?.data?.message ||
        launchError.message ||
        "Could not start the exam. Check your connection and try again.";
      setLaunchMessage(message);
      toast.error(message);
    } finally {
      setLaunching(false);
    }
  };

  if (isLoading) {
    return <div role="status" className="p-8 text-center text-gray-600">Loading exam details…</div>;
  }
  if (error || !exam) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="alert" className="text-red-700">
          {error?.response?.data?.message || error?.message || "Exam not found."}
        </p>
        <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg border px-4 py-2">Try again</button>
        <Link to="/exam-portal" className="ml-3 text-[#2C2DE0] underline">Return to the exam portal</Link>
      </main>
    );
  }

  const statusText = exam.status.replaceAll("-", " ");
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <Link to="/exam-portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C2DE0]">
        <ArrowLeft className="h-4 w-4" /> Back to exam portal
      </Link>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{exam.title}</h1>
            <p className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm capitalize dark:bg-zinc-800">{statusText}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-300">
            <Clock3 className="h-4 w-4" /> {exam.duration} minutes
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800">
            <dt className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><CalendarDays className="h-4 w-4" />Available from</dt>
            <dd>{formatDate(exam.availableFrom)}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800">
            <dt className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><CalendarDays className="h-4 w-4" />Available until</dt>
            <dd>{formatDate(exam.availableUntil)}</dd>
          </div>
        </dl>

        <section className="mt-6" aria-labelledby="exam-instructions">
          <h2 id="exam-instructions" className="font-semibold">Instructions</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-zinc-300">
            {exam.instructions || "No additional instructions were provided."}
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-zinc-700" aria-labelledby="exam-eligibility">
          <h2 id="exam-eligibility" className="font-semibold">Eligibility and attempt</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
            {exam.attemptStatus === "in-progress"
              ? `You have an exam attempt in progress${exam.sessionEndsAt ? ` until ${formatDate(exam.sessionEndsAt)}` : ""}. Re-entering will resume this attempt.`
              : exam.canStart
                ? "This exam is available to your account."
                : exam.status === "upcoming"
                  ? "The exam has not opened yet."
                  : exam.status === "submitted"
                    ? "This exam has already been submitted."
                    : exam.status === "paused"
                      ? "This exam is paused by your instructor."
                      : "This exam is not currently available to start."}
          </p>
          {exam.sebRequired && (
            <p className="mt-3 flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Safe Exam Browser is required for this exam; standard Chrome launch is not allowed by the exam policy.
            </p>
          )}
          {exam.security?.browserLock && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              This exam requires a managed browser lock, which a normal browser tab cannot provide.
            </p>
          )}
          {(exam.security?.cameraRequired || exam.security?.microphoneRequired) && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              {exam.security.cameraRequired && exam.security.microphoneRequired
                ? "This exam asks for camera and microphone permission. Camera still images may be sent to exam staff; microphone audio is not recorded by UniCORE."
                : exam.security.cameraRequired
                  ? "This exam asks for camera permission and sends periodic still images to exam staff while the session is open."
                  : "This exam checks microphone permission and availability. Audio is not recorded; the microphone permission stream is stopped after the check."}
            </p>
          )}
        </section>

        {canStartInBrowser && (
          <button
            type="button"
            onClick={handleStartExam}
            disabled={launching}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C2DE0] px-5 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {launching && <Loader2 className="h-4 w-4 animate-spin" />}
            {launching
              ? "Preparing exam session…"
              : exam.attemptStatus === "in-progress"
                ? "Resume exam"
                : "Start exam"}
          </button>
        )}

        {launchMessage && (
          <div className="mt-4" role="alert" aria-live="polite">
            <p className="text-sm text-red-700 dark:text-red-300">{launchMessage}</p>
            <button
              type="button"
              onClick={handleStartExam}
              disabled={launching || !canStartInBrowser}
              className="mt-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Retry launch
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
