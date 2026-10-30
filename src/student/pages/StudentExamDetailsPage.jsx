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
  const [launchForm, setLaunchForm] = useState({
    examId: null,
    launching: false,
    launchMessage: "",
    launchMessageType: "error",
    accessToken: "",
  });
  const formForExam = launchForm.examId === examId;
  const launching = formForExam && launchForm.launching;
  const launchMessage = formForExam ? launchForm.launchMessage : "";
  const launchMessageType = formForExam ? launchForm.launchMessageType : "error";
  const accessToken = formForExam ? launchForm.accessToken : "";
  const updateLaunchForm = (updates) => setLaunchForm((current) => ({
    ...(current.examId === examId
      ? current
      : { examId, launching: false, launchMessage: "", launchMessageType: "error", accessToken: "" }),
    ...updates,
    examId,
  }));

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
  const canStartInSeb = Boolean(
    exam?.canStart && exam?.sebRequired && !exam?.security?.browserLock,
  );

  const handleStartExam = async () => {
    if (!exam?.id || (!canStartInBrowser && !canStartInSeb) || launching) return;
    if (!accessToken.trim()) {
      updateLaunchForm({ launchMessage: "Enter the exam access token provided by your instructor." });
      return;
    }
    updateLaunchForm({ launching: true, launchMessage: "" });
    try {
      if (canStartInSeb) {
        const { data: configFile } = await api.post(
          `/exams/student/${exam.id}/seb-config`,
          { token: accessToken.trim() },
          { responseType: "blob" },
        );
        const downloadUrl = URL.createObjectURL(configFile);
        const download = document.createElement("a");
        download.href = downloadUrl;
        download.download = `exam-${exam.id}.seb`;
        document.body.appendChild(download);
        download.click();
        download.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
        updateLaunchForm({
          launchMessage: "Configuration downloaded. Open the .seb file with Safe Exam Browser to continue.",
          launchMessageType: "info",
        });
        return;
      }

      const { data: validationResponse } = await api.post(
        "/exams/student/validate-token",
        { token: accessToken.trim() },
      );
      if (String(validationResponse?.data?.examId) !== exam.id) {
        throw new Error("That access token is not for this exam.");
      }

      const { data: issueResponse } = await api.post(
        `/exams/student/${exam.id}/launch-token`,
        { token: accessToken.trim() },
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
      let responseMessage = launchError.response?.data?.message;
      if (!responseMessage && launchError.response?.data instanceof Blob) {
        try {
          responseMessage = JSON.parse(await launchError.response.data.text())?.message;
        } catch {
          responseMessage = "";
        }
      }
      const message = responseMessage ||
        launchError.message ||
        "Could not start the exam. Check your connection and try again.";
      updateLaunchForm({ launchMessage: message, launchMessageType: "error" });
      toast.error(message);
    } finally {
      updateLaunchForm({ launching: false });
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

  const statusText = (exam.status || "unknown").replaceAll("-", " ");
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

        {(exam.courseName || exam.courseCode || exam.teacherName || exam.classCode) && (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {(exam.courseName || exam.courseCode) && (
              <div>
                <dt className="font-semibold text-gray-500 dark:text-zinc-400">Course or subject</dt>
                <dd>{[exam.courseCode, exam.courseName].filter(Boolean).join(" — ")}</dd>
              </div>
            )}
            {exam.teacherName && (
              <div>
                <dt className="font-semibold text-gray-500 dark:text-zinc-400">Instructor</dt>
                <dd>{exam.teacherName}</dd>
              </div>
            )}
            {(exam.classCode || exam.section) && (
              <div>
                <dt className="font-semibold text-gray-500 dark:text-zinc-400">Class</dt>
                <dd>{[exam.classCode, exam.section].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
          </dl>
        )}

        {exam.description && exam.description !== exam.instructions && (
          <section className="mt-6" aria-labelledby="exam-description">
            <h2 id="exam-description" className="font-semibold">About this exam</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-zinc-300">
              {exam.description}
            </p>
          </section>
        )}

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
              Safe Exam Browser is required. Download and open the student-specific .seb configuration to start; a standard browser cannot retrieve exam questions.
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
                ? "This exam checks camera and microphone availability. UniCORE sends device status only; video and microphone audio are not recorded or transmitted."
                : exam.security.cameraRequired
                  ? "This exam checks camera availability. UniCORE sends device status only; video is not recorded or transmitted."
                  : "This exam checks microphone permission and availability. Audio is not recorded; the microphone permission stream is stopped after the check."}
            </p>
          )}
        </section>

        {exam.resultsAvailable && (
          <Link
            to="/results"
            className="mt-5 inline-flex rounded-lg border px-4 py-2 text-sm font-semibold text-[#2C2DE0] hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-zinc-800"
          >
            Review published results
          </Link>
        )}

        {(canStartInBrowser || canStartInSeb) && (
          <div className="mt-6 space-y-3">
            <div>
              <label htmlFor="exam-access-token" className="mb-1 block text-sm font-semibold">
                Exam access token
              </label>
              <input
                id="exam-access-token"
                type="password"
                autoComplete="off"
                autoCapitalize="characters"
                value={accessToken}
                onChange={(event) => updateLaunchForm({
                  accessToken: event.target.value,
                  launchMessage: "",
                  launchMessageType: "error",
                })}
                placeholder="Enter the token provided by your instructor"
                className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleStartExam}
              disabled={launching || !accessToken.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C2DE0] px-5 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              {launching && <Loader2 className="h-4 w-4 animate-spin" />}
              {launching
                ? (canStartInSeb ? "Preparing SEB configuration…" : "Preparing exam session…")
                : canStartInSeb
                  ? "Download Safe Exam Browser configuration"
                  : exam.attemptStatus === "in-progress"
                    ? "Validate token and resume exam"
                    : "Validate token and start exam"}
            </button>
          </div>
        )}

        {launchMessage && (
          <div className="mt-4" role="alert" aria-live="polite">
            <p className={launchMessageType === "info"
              ? "text-sm text-emerald-700 dark:text-emerald-300"
              : "text-sm text-red-700 dark:text-red-300"}
            >
              {launchMessage}
            </p>
            {launchMessageType === "error" && (
              <button
                type="button"
                onClick={handleStartExam}
                disabled={launching || (!canStartInBrowser && !canStartInSeb)}
                className="mt-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {canStartInSeb ? "Download a new configuration" : "Retry launch"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
