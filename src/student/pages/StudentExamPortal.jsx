import React, { useEffect, useRef, useState } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import { useLanguage } from "../../hooks/useLanguage";
import { ArrowRight, Clock, Download, Loader2, ShieldCheck } from "lucide-react";
import { openExamGuard } from "./examguardProtocol";
import "../../styles/examtheme.css";

export default function StudentExamPortal() {
  const [tokenInput, setTokenInput] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    return token ? token.trim().toUpperCase() : "";
  });
  const [examData, setExamData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [launchTicket, setLaunchTicket] = useState(null);
  const [launchTicketMessage, setLaunchTicketMessage] = useState("");
  const ticketTimerRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => () => clearTimeout(ticketTimerRef.current), []);

  const handleValidate = async (event) => {
    event.preventDefault();
    if (!tokenInput.trim()) return;
    clearTimeout(ticketTimerRef.current);
    setLaunchTicket(null);
    setLaunchTicketMessage("");
    setIsValidating(true);
    try {
      const { data } = await api.post("/exams/student/validate-token", { token: tokenInput });
      setExamData({ ...data.data, token: tokenInput.trim().toUpperCase() });
      toast.success(t("exam.verifyToken") || "Token verified!");
    } catch (error) {
      toast.error(error.response?.data?.message || t("exam.invalidToken") || "Invalid token");
      setExamData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateExamGuardTicket = async () => {
    if (!examData?.examId || isCreatingTicket) return;
    clearTimeout(ticketTimerRef.current);
    setLaunchTicket(null);
    setLaunchTicketMessage("");
    setIsCreatingTicket(true);
    try {
      const { data } = await api.post(
        `/exams/student/${examData.examId}/launch-ticket`,
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
      setLaunchTicketMessage(
        "We cannot confirm whether ExamGuard opened. The one-time ticket below is your manual fallback.",
      );
      try {
        openExamGuard(issued.ticket);
      } catch {
        setLaunchTicketMessage(
          "Automatic launch was blocked. Copy the one-time ticket and enter it in ExamGuard manually.",
        );
      }
      ticketTimerRef.current = setTimeout(() => {
        setLaunchTicket(null);
        setLaunchTicketMessage("The launch ticket expired. Request a new one if needed.");
      }, expiresAt - Date.now());
    } catch (error) {
      setLaunchTicketMessage(
        error.response?.data?.message || error.message || "Could not create a launch ticket.",
      );
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleCopyExamGuardTicket = async () => {
    if (!launchTicket || launchTicket.expiresAt <= Date.now()) {
      setLaunchTicket(null);
      setLaunchTicketMessage("The launch ticket expired. Request a new one if needed.");
      return;
    }
    try {
      await navigator.clipboard.writeText(launchTicket.value);
      setLaunchTicketMessage("Ticket copied. Paste it into ExamGuard and verify it before it expires.");
    } catch {
      setLaunchTicketMessage("Copy was unavailable. Select and copy the ticket manually.");
    }
  };

  const reset = () => {
    clearTimeout(ticketTimerRef.current);
    setExamData(null);
    setLaunchTicket(null);
    setLaunchTicketMessage("");
  };

  return (
    <div className="exam-root min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 p-8">
        <div className="w-12 h-12 bg-[#2C2DE0]/10 rounded-xl flex items-center justify-center mb-6 text-[#1E1FAA] dark:text-[#2C2DE0]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          {t("exam.title") || "University Exam Portal"}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
          Verify your exam token here, then take the exam in UniCORE ExamGuard.
        </p>

        {!examData ? (
          <form onSubmit={handleValidate} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("exam.enterToken") || "Exam token"}
              <input
                type="text"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="mt-1 w-full border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg p-3 text-lg tracking-wider font-mono uppercase focus:ring-[#2C2DE0] focus:border-[#2C2DE0]"
                placeholder="CS101-MID"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isValidating || !tokenInput.trim()}
              className="w-full bg-[#2C2DE0] text-white text-sm font-bold px-6 py-3 rounded-lg shadow-[0_4px_0_#1E1FAA] disabled:opacity-50"
            >
              {isValidating ? "Verifying…" : t("exam.verifyToken") || "Verify token"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#2C2DE0]/10 rounded-xl p-5 border border-[#2C2DE0]/20">
              <h2 className="font-display font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                {examData.title}
              </h2>
              <div className="space-y-3 text-neutral-700 dark:text-neutral-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5" />
                  <span>{examData.duration} {t("exam.duration") || "minutes"}</span>
                </div>
                <div>{examData.questionsCount} {t("exam.questions") || "questions"}</div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Exam session runs in ExamGuard</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
              ExamGuard applies supported exam window restrictions; it is not OS-level lockdown.
            </p>

            {!launchTicket ? (
              <button
                type="button"
                onClick={handleCreateExamGuardTicket}
                disabled={isCreatingTicket}
                aria-label="Open in ExamGuard"
                className="w-full rounded-lg bg-[#2C2DE0] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isCreatingTicket
                  ? <><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Preparing secure launch…</>
                  : <>Open UniCORE ExamGuard <ArrowRight className="inline w-4 h-4 ml-1" /></>}
              </button>
            ) : (
              <div className="space-y-3">
                <label
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="examguard-ticket"
                >
                  One-time launch ticket
                </label>
                <input
                  id="examguard-ticket"
                  aria-label="One-time ExamGuard ticket"
                  type="text"
                  readOnly
                  value={launchTicket.value}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-[#2C2DE0] bg-white p-3 font-mono text-sm tracking-wide text-[#2C2DE0]"
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopyExamGuardTicket}
                  aria-label="Copy ticket"
                  className="w-full rounded-lg bg-[#2C2DE0] px-6 py-3 text-sm font-semibold text-white"
                >
                  Copy ticket
                </button>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  If ExamGuard did not open, open it from your applications menu, paste this ticket, and choose Verify Invitation. The ticket expires shortly and can be redeemed only once.
                </p>
              </div>
            )}
            {launchTicketMessage && (
              <p className="text-center text-xs text-[#2C2DE0]" role="status" aria-live="polite">
                {launchTicketMessage}
              </p>
            )}
            <a
              href="/desktop-exam-app"
              className="w-full rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20"
            >
              <Download className="w-4 h-4" />
              Download UniCORE ExamGuard
            </a>
            <button
              type="button"
              onClick={reset}
              className="w-full text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-sm font-medium"
            >
              {t("exam.cancelGoBack") || "Cancel and go back"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
