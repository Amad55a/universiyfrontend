import React from "react";
import { Link } from "react-router-dom";
import "../../styles/examtheme.css";

export default function ExamGuardOnlyPage() {
  return (
    <main className="exam-root min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 flex items-center justify-center">
      <section className="max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="mb-3 text-2xl font-semibold text-neutral-900 dark:text-white">
          Continue in UniCORE ExamGuard
        </h1>
        <p className="mb-6 text-neutral-600 dark:text-neutral-300">
          Exam questions and active sessions are available only in the authenticated desktop app.
          Return to the exam portal to verify your invitation and open ExamGuard.
        </p>
        <Link
          to="/exam-portal"
          className="inline-flex rounded-lg bg-[#2C2DE0] px-6 py-3 font-semibold text-white"
        >
          Return to exam portal
        </Link>
      </section>
    </main>
  );
}
