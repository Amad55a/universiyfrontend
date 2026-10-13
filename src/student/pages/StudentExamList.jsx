import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/api/client";

function formatSchedule(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Schedule unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function fetchStudentExams() {
  const { data } = await api.get("/exams/student");
  return data?.data?.exams || [];
}

export default function StudentExamList() {
  const {
    data: exams = [],
    error,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["student", "exams"],
    queryFn: fetchStudentExams,
    staleTime: 30_000,
  });

  return (
    <section aria-labelledby="student-exams-heading" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="student-exams-heading" className="text-lg font-bold text-gray-900 dark:text-white">Upcoming and available exams</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Exam access and attempt status are checked by UniCORE.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh exams"
          className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-indigo-300 dark:focus-visible:ring-offset-zinc-900 dark:active:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <p role="status" className="py-5 text-sm text-gray-500">Loading exams…</p>
      ) : error ? (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          <p>{error.response?.data?.message || error.message || "Could not load your exams."}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 font-semibold underline">Try again</button>
        </div>
      ) : exams.length === 0 ? (
        <p className="py-5 text-sm text-gray-500 dark:text-zinc-400">No upcoming or available exams were found for your enrolled classes.</p>
      ) : (
        <ul className="space-y-2">
          {exams.map((exam) => (
            <li key={exam.id} className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 sm:flex-row sm:items-center dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-indigo-700 dark:hover:bg-zinc-800 dark:focus-within:ring-indigo-300 dark:focus-within:ring-offset-zinc-900">
              <div className="min-w-0">
                <Link to={`/exams/${exam.id}`} className="rounded-sm font-semibold text-[#1E1FAA] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:text-indigo-300 dark:focus-visible:ring-indigo-300">{exam.title}</Link>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatSchedule(exam.availableFrom)}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{exam.duration} minutes</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-800 dark:bg-zinc-800 dark:text-zinc-100">{exam.status.replaceAll("-", " ")}</span>
                <Link to={`/exams/${exam.id}`} className="rounded-lg border border-[#1E1FAA] bg-white px-3 py-2 text-sm font-semibold text-[#1E1FAA] transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:bg-indigo-100 dark:border-indigo-300 dark:bg-zinc-900 dark:text-indigo-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-indigo-300 dark:focus-visible:ring-offset-zinc-900 dark:active:bg-zinc-700">View details</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
