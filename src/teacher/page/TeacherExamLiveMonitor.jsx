import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";
import { Camera, CameraOff, Mic, MicOff, RefreshCw, ShieldAlert, Users } from "lucide-react";

/**
 * Teacher live exam monitor — who is in the exam + latest camera snapshot.
 * Practical proctoring only (no ML face scoring).
 */
export default function TeacherExamLiveMonitor() {
  const [params] = useSearchParams();
  const examId = params.get("exam");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!examId) return;
    try {
      const { data: res } = await axios.get(`/api/exams/teacher/${examId}/live`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load live monitor");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    const t = setInterval(load, 5000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(t);
    };
  }, [load]);

  if (!examId) {
    return (
      <div className="p-8">
        <p className="text-neutral-600 dark:text-neutral-300">
          Open live monitor from an exam card (missing <code>?exam=</code>).
        </p>
        <Link to="/teacher/exams" className="text-[#2C2DE0] underline mt-2 inline-block">
          Back to exams
        </Link>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="p-8 text-neutral-500">Loading live monitor…</div>;
  }

  const students = data?.students || [];
  const counts = data?.counts || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Live exam monitor
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {data?.exam?.title || "Exam"} — camera snapshots and device status for lecturer review; microphone audio is not recorded
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2C2DE0] text-white text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to={`/teacher/submissions?exam=${examId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm font-medium"
          >
            Submissions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: counts.total, icon: Users },
          { label: "In progress", value: counts.inProgress, icon: Users },
          { label: "Online now", value: counts.online, icon: Camera },
          ...(data?.exam?.cameraRequired
            ? [{ label: "Camera missing", value: counts.cameraMissing, icon: CameraOff }]
            : []),
          ...(data?.exam?.microphoneRequired
            ? [{ label: "Microphone missing", value: counts.microphoneMissing, icon: MicOff }]
            : []),
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500">
              {React.createElement(icon, { className: "w-3.5 h-3.5" })} {label}
            </div>
            <div className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">{value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {students.map((s) => (
          <div
            key={s.submissionId}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
          >
            <div className="aspect-video bg-neutral-950 relative">
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-400 text-sm">
                <span>{s.cameraOk ? "Camera available" : "Camera unavailable"}</span>
                <span>{s.microphoneOk ? "Microphone available" : "Microphone unavailable"}</span>
                <span className="text-xs text-neutral-500">Device status only · no media recorded</span>
              </div>
              <span
                className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.online
                    ? "bg-emerald-500 text-white"
                    : s.status === "in-progress"
                    ? "bg-amber-500 text-white"
                    : "bg-neutral-600 text-white"
                }`}
              >
                {s.online ? "LIVE" : s.status}
              </span>
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                {data?.exam?.cameraRequired && <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    s.cameraOk ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {s.cameraOk ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
                  {s.cameraOk ? "Cam" : "No cam"}
                </span>}
                {data?.exam?.microphoneRequired && <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    s.microphoneOk ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                  }`}
                  aria-label={s.microphoneOk ? "Microphone online" : "Microphone missing"}
                  title="Microphone status only; audio is not recorded"
                >
                  {s.microphoneOk ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  {s.microphoneOk ? "Mic" : "No mic"}
                </span>}
              </div>
            </div>
            <div className="p-3 space-y-1">
              <div className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                {s.studentName}
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {s.universityId || s.studentEmail}
              </div>
              {s.violationCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {s.violationCount} violation(s)
                </div>
              )}
              <Link
                to={`/teacher/submissions/${s.submissionId}?exam=${examId}`}
                className="inline-block mt-1 text-xs font-semibold text-[#2C2DE0]"
              >
                Open grading →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <p className="text-center text-neutral-500 py-12">No students have entered this exam yet.</p>
      )}
    </div>
  );
}
