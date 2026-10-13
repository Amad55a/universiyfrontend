import React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Download, MonitorDown, RefreshCw } from "lucide-react";
import { detectExamGuardPlatform } from "./examguardPlatform";

const PLATFORMS = [
  { id: "windows", label: "Windows", installer: null, packageType: "NSIS installer" },
  { id: "macos", label: "macOS", installer: null, packageType: "DMG installer" },
  { id: "linux", label: "Linux", installer: null, packageType: "AppImage or Debian package" },
];

export default function StudentExamGuardDownloadPage() {
  const location = useLocation();
  const examId = new URLSearchParams(location.search).get("examId");
  const detectedPlatform = detectExamGuardPlatform();
  const [selectedPlatform, setSelectedPlatform] = useState(detectedPlatform);
  const [checkedAgain, setCheckedAgain] = useState(false);
  const selected = PLATFORMS.find(({ id }) => id === selectedPlatform);
  const returnTo = /^[a-f\d]{24}$/i.test(examId || "")
    ? `/exams/${examId}`
    : "/dashboard";

  const checkAgain = () => {
    setSelectedPlatform(detectExamGuardPlatform());
    setCheckedAgain(true);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <Link to={returnTo} className="text-sm font-semibold text-[#2C2DE0] underline">Return to your exam</Link>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <MonitorDown className="h-8 w-8 text-[#2C2DE0]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Download UniCORE Desktop Exam App</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-300">The UniCORE Desktop Exam App opens an exam session authorized by UniCORE. It does not provide operating-system lockdown.</p>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="platform-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="platform-heading" className="font-semibold">Choose your platform</h2>
            <button type="button" onClick={checkAgain} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700">
              <RefreshCw className="h-4 w-4" /> Check Again
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400" aria-live="polite">
            {checkedAgain
              ? detectedPlatform
                ? `Platform detected: ${PLATFORMS.find(({ id }) => id === detectedPlatform)?.label}.`
                : "Could not detect your platform; select it manually."
              : detectedPlatform
                ? `Recommended: ${PLATFORMS.find(({ id }) => id === detectedPlatform)?.label}. You can change this selection.`
                : "Could not detect your platform; select it manually."}
          </p>

          <div role="group" aria-label="Operating system" className="mt-4 grid gap-3 sm:grid-cols-3">
            {PLATFORMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={selectedPlatform === id}
                onClick={() => setSelectedPlatform(id)}
                className={`rounded-xl border p-4 text-left font-semibold ${selectedPlatform === id ? "border-[#2C2DE0] bg-[#2C2DE0]/5 text-[#2C2DE0]" : "border-gray-200 dark:border-zinc-700"}`}
              >
                {selectedPlatform === id && <Check className="mr-1 inline h-4 w-4" />}
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" aria-live="polite">
          {selected?.installer ? (
            <a href={selected.installer} aria-label="Download ExamGuard" className="inline-flex items-center gap-2 font-semibold underline">
              <Download className="h-4 w-4" /> Download UniCORE Desktop Exam App for {selected.label}
            </a>
          ) : (
            <>
              <h2 className="font-semibold">{selected ? `${selected.label} installer not published yet` : "Select a platform"}</h2>
              <p className="mt-1 text-sm">
                {selected
                  ? `A ${selected.packageType} release artifact is not available yet. This page will show the official UniCORE Desktop Exam App installer after a tested build is published.`
                  : "Choose Windows, macOS, or Linux to check its release status."}
              </p>
            </>
          )}
        </section>

        <section className="mt-6 space-y-2 text-sm text-gray-700 dark:text-zinc-300">
          <h2 className="font-semibold text-gray-900 dark:text-white">Install and launch</h2>
          <ol className="list-inside list-decimal space-y-1">
            <li>Download the official UniCORE Desktop Exam App installer when it is published.</li>
            <li>Install the desktop app using your operating system’s installer prompts.</li>
            <li>Return to your exam page and select <strong>Open UniCORE Exam App</strong>.</li>
            <li>If the browser asks for permission, allow the app launch and retry. If it still does not open, copy the current one-time ticket from the exam page and manually paste it into ExamGuard to verify it. Request a fresh ticket if it expired or was already used.</li>
          </ol>
          <h2 className="pt-3 font-semibold text-gray-900 dark:text-white">System requirements</h2>
          <p>No platform installer has been published yet. Linux x86_64 is the only configured build target; Windows and macOS installers are not available. Linux AppImage packages may require FUSE or extraction support. The release page will list only tested, published installers.</p>
        </section>

        <Link to="/desktop-exam-app" target="_blank" rel="noreferrer" className="mt-5 inline-flex font-semibold text-[#1E1FAA] underline dark:text-indigo-300">
          Read the full installation and troubleshooting guide
        </Link>

        <Link to={returnTo} className="mt-6 inline-flex rounded-lg bg-[#2C2DE0] px-5 py-3 font-semibold text-white">
          Return to your exam
        </Link>
      </section>
    </main>
  );
}
