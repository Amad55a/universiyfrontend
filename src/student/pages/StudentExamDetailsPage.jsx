import React from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock3, Copy, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/client";
import { openExamGuard } from "./examguardProtocol";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Schedule unavailable"
    : date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

export default function StudentExamDetailsPage() {
  const { examId } = useParams();
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState("");
  const [launchTicket, setLaunchTicket] = useState(null);
  const [ticketMessage, setTicketMessage] = useState("");
  const ticketTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(ticketTimerRef.current), []);

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

  const handleOpenExamGuard = async () => {
    if (!exam?.canUseExamGuard || launching) return;
    clearTimeout(ticketTimerRef.current);
    setLaunching(true);
    setLaunchMessage("");
    setLaunchTicket(null);
    setTicketMessage("");
    try {
      const { data } = await api.post(
        `/exams/student/${exam.id}/launch-ticket`,
        {},
        { withCredentials: true },
      );
      const issued = data?.data;
      const expiresAt = Date.parse(issued?.expiresAt);
      if (
        typeof issued?.ticket !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(issued.ticket) ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
      ) {
        throw new Error("UniCORE returned an invalid or expired launch ticket.");
      }
      setLaunchTicket({ value: issued.ticket, expiresAt });
      setLaunchMessage("We sent a launch link to your system, but cannot confirm whether ExamGuard opened. If it did not, use the one-time ticket below.");
      ticketTimerRef.current = setTimeout(() => {
        setLaunchTicket(null);
        setTicketMessage("This ticket has expired. Select Open ExamGuard to request a fresh one.");
        setLaunchMessage("The launch ticket expired. Request a new one before trying manual entry.");
      }, Math.max(0, expiresAt - Date.now()));
      try {
        openExamGuard(issued.ticket);
      } catch {
        setLaunchMessage("Automatic launch was blocked. Copy the one-time ticket below and enter it in ExamGuard manually.");
      }
    } catch (launchError) {
      const message = launchError.response?.data?.message ||
        launchError.message ||
        "Could not open ExamGuard.";
      setLaunchMessage(message);
      toast.error(message);
    } finally {
      setLaunching(false);
    }
  };

  const handleCopyTicket = async () => {
    if (!launchTicket || launchTicket.expiresAt <= Date.now()) {
      setLaunchTicket(null);
      setTicketMessage("This ticket has expired. Select Open ExamGuard to request a fresh one.");
      return;
    }
    try {
      await navigator.clipboard.writeText(launchTicket.value);
      setTicketMessage("Ticket copied. Paste it into ExamGuard and choose Verify Invitation before it expires.");
    } catch {
      setTicketMessage("Copy is unavailable. Select the ticket and copy it manually.");
    }
  };

  if (isLoading) {
    return <div role="status" className="p-8 text-center text-gray-600">Loading exam details…</div>;
  }
  if (error || !exam) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="alert" className="text-red-700">{error?.response?.data?.message || error?.message || "Exam not found."}</p>
        <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg border px-4 py-2">Try again</button>
        <Link to="/dashboard" className="ml-3 text-[#2C2DE0] underline">Return to dashboard</Link>
      </main>
    );
  }

  const statusText = exam.status.replaceAll("-", " ");
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C2DE0]">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
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
              ? `You have an exam attempt in progress${exam.sessionEndsAt ? ` until ${formatDate(exam.sessionEndsAt)}` : ""}.`
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
              Safe Exam Browser is required. The UniCORE Exam App is the supported secure desktop client for this exam.
            </p>
          )}
          {exam.security?.microphoneRequired && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              This exam requires microphone monitoring, which the UniCORE desktop app does not currently support. The desktop launch is blocked.
            </p>
          )}
          {exam.security?.browserLock && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              This exam requires a managed browser lock, which the UniCORE desktop app does not currently provide. The desktop launch is blocked.
            </p>
          )}
        </section>

        {exam.canUseExamGuard && (
          <>
            <button
              type="button"
              onClick={handleOpenExamGuard}
              disabled={launching}
              aria-label={exam.attemptStatus === "in-progress" ? "Resume in ExamGuard" : "Open ExamGuard"}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C2DE0] px-5 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {launching ? "Preparing secure launch…" : exam.attemptStatus === "in-progress" ? "Resume in ExamGuard" : "Open ExamGuard"}
            </button>
            <p className="mt-3 text-sm text-gray-600 dark:text-zinc-300">
              Your browser may ask permission to open ExamGuard. We cannot confirm that the app opened; the one-time ticket will remain available here for manual entry.
            </p>
          </>
        )}

        {exam.canStart && exam.sebRequired && (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p>Continue using the existing Safe Exam Browser flow. Use the exam token provided by your instructor on the exam portal.</p>
            <Link to="/exam-portal" className="mt-3 inline-flex items-center gap-2 font-semibold underline">
              <ShieldCheck className="h-4 w-4" /> Continue to exam portal
            </Link>
          </div>
        )}

        {launchMessage && (
          <p role="status" aria-live="polite" className="mt-4 text-sm text-gray-600 dark:text-zinc-300">
            {launchMessage}
          </p>
        )}

        {launchTicket && exam.canUseExamGuard && (
          <section className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30" aria-labelledby="examguard-ticket-heading">
            <h2 id="examguard-ticket-heading" className="font-semibold text-gray-900 dark:text-white">One-time ExamGuard invitation</h2>
            <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
              Expires {formatDate(launchTicket.expiresAt)}. It can only be redeemed once. You may use automatic launch or enter this same ticket manually, not both.
            </p>
            <label className="sr-only" htmlFor="examguard-launch-ticket">One-time ExamGuard ticket</label>
            <input
              id="examguard-launch-ticket"
              aria-label="One-time ExamGuard ticket"
              readOnly
              value={launchTicket.value}
              onFocus={(event) => event.target.select()}
              className="mt-3 w-full rounded-lg border border-indigo-300 bg-white p-3 font-mono text-sm text-indigo-950 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-100"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={handleCopyTicket} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
              <Copy className="h-4 w-4" /> Copy invitation
            </button>
            <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
              {ticketMessage || "If ExamGuard did not open, open it from your applications menu, paste this ticket, and choose Verify Invitation."}
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
              Need installation or troubleshooting help?{" "}
              <Link
                to={`/examguard/download?examId=${encodeURIComponent(exam.id)}`}
                className="font-semibold text-[#2C2DE0] underline"
              >
                <Download className="inline h-3.5 w-3.5" /> Open installation guide
              </Link>
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
