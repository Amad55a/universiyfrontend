import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleHelp, MonitorDown, ShieldCheck } from "lucide-react";

const PLATFORMS = [
  { name: "Linux", detail: "x86_64 AppImage and Debian packages build locally; no official download has been published." },
  { name: "Windows", detail: "Not currently available." },
  { name: "macOS", detail: "Not currently available." },
];

const INSTALL_STEPS = [
  "Use an official installer link only after UniCORE publishes a tested release. Do not install a build from an unverified source.",
  "On Ubuntu, the planned packages are a Debian .deb installer or an AppImage. Follow the institution's instructions for installing software and opening downloaded applications.",
  "Launch the installed UniCORE Desktop Exam App. If prompted by the operating system, allow the browser to open the UniCORE exam link.",
];

const LAUNCH_STEPS = [
  "Sign in to your student account in the UniCORE portal.",
  "Open the exam details page. Only exams for which the server confirms your eligibility can be launched.",
  "Choose Open UniCORE Exam App. The portal requests a short-lived, single-use ticket and passes it to the desktop app.",
  "If the app does not appear, copy the one-time ticket displayed on the exam page, open the installed app, paste the ticket, and select Verify Invitation. Do not reuse an expired or consumed ticket.",
  "The server validates the ticket and exam eligibility. Exam timing, saved answers, and submission are managed by UniCORE.",
];

const TROUBLESHOOTING = [
  {
    title: "Ticket expired or already used",
    detail: "Return to the exam details page and launch again to request a fresh ticket. A ticket cannot be reused.",
  },
  {
    title: "Login or saved-session problem",
    detail: "Sign in again in the UniCORE portal, open the eligible exam, and start a new launch. Do not retry an old ticket.",
  },
  {
    title: "App does not open",
    detail: "Confirm the app is installed, then use the portal's launch button again and allow the browser's open-app prompt.",
  },
  {
    title: "Connection failure",
    detail: "Check that your device can reach UniCORE over HTTPS, then retry from the portal. If the service remains unavailable, contact your instructor or campus support.",
  },
];

export default function DesktopExamAppPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
      <header className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-indigo-50 p-3 text-[#2C2DE0] dark:bg-indigo-950/60 dark:text-indigo-300">
            <MonitorDown aria-hidden="true" className="h-8 w-8" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1E1FAA] dark:text-indigo-300">Exam access guide</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">UniCORE Desktop Exam App</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-700 dark:text-zinc-300">
              The desktop app opens designated UniCORE exam sessions on your computer. It works with your student portal; it does not replace your UniCORE account or decide whether you may take an exam.
            </p>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C2DE0] px-5 py-3 font-bold text-white transition hover:bg-[#1E1FAA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">
            Open student portal <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link to="/examguard/download" className="inline-flex items-center justify-center rounded-xl border border-indigo-300 bg-white px-5 py-3 font-semibold text-[#1E1FAA] transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-indigo-800 dark:bg-zinc-950 dark:text-indigo-200 dark:hover:bg-zinc-900">
            Check platform availability
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3" aria-labelledby="platform-heading">
        <h2 id="platform-heading" className="sr-only">Supported platforms</h2>
        {PLATFORMS.map((platform) => (
          <article key={platform.name} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-bold text-gray-950 dark:text-white">{platform.name}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-zinc-300">{platform.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">Install the app</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-700 dark:text-zinc-300">
            {INSTALL_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">Launch an exam</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-700 dark:text-zinc-300">
            {LAUNCH_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="troubleshooting-heading">
        <div className="flex items-center gap-2">
          <CircleHelp aria-hidden="true" className="h-5 w-5 text-[#1E1FAA] dark:text-indigo-300" />
          <h2 id="troubleshooting-heading" className="text-xl font-bold text-gray-950 dark:text-white">Troubleshooting</h2>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {TROUBLESHOOTING.map(({ title, detail }) => (
            <div key={title} className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-900">
              <dt className="font-semibold text-gray-900 dark:text-white">{title}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 dark:text-zinc-300">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <aside className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="flex items-center gap-2 font-bold"><ShieldCheck aria-hidden="true" className="h-5 w-5" /> Security and compatibility</h2>
        <p className="mt-2">Some exam restrictions use desktop-window fullscreen, kiosk, and focus monitoring. These do not disable every operating-system shortcut, virtual terminal, system menu, or force-quit option. Available behavior differs by operating system; this app does not claim guaranteed OS-level lockdown. Follow your instructor's exam rules and contact campus support if the app cannot restore your session.</p>
      </aside>

      <p className="mt-6 flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        Launch availability, eligibility, timing, and submission are confirmed by UniCORE. Windows and macOS downloads are not currently offered; Linux builds are not yet published as official downloads.
      </p>
    </main>
  );
}
