import React from "react";
import { Link } from "react-router-dom";
import StudentExamList from "./StudentExamList";

export default function StudentExamPortal() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">University Exam Portal</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
          Choose an exam to review its instructions and start or resume your browser session.
        </p>
      </div>
      <StudentExamList />
      <Link to="/dashboard" className="text-sm font-semibold text-[#2C2DE0] underline">
        Return to dashboard
      </Link>
    </main>
  );
}
