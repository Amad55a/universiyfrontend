import React, { useEffect, useState } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import {
  BarChart2,
  ShieldAlert,
  Users,
  FilePen,
  Activity,
} from "lucide-react";
import { useTeacherLanguage } from "../hooks/useLanguages";

export default function TeacherExamAnalyticsPage() {
  const { t } = useTeacherLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/exams/teacher/analytics")
      .then(res => setData(res.data.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-neutral-500">Loading analytics…</div>;
  }

  const { summary, submissions, securityEvents } = data || {};

  const stats = [
    { label: "Total exams", value: summary?.totalExams ?? 0, icon: FilePen, color: "text-[#2C2DE0]" },
    { label: "Active exams", value: summary?.activeExams ?? 0, icon: Activity, color: "text-[#2C2DE0]" },
    { label: "Submissions", value: summary?.totalSubmissions ?? 0, icon: Users, color: "text-[#2C2DE0]" },
    { label: "Security events", value: summary?.violationCount ?? 0, icon: ShieldAlert, color: "text-amber-500" },
    { label: "Avg score", value: summary?.avgScore ?? 0, icon: BarChart2, color: "text-[#2C2DE0]" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          {t.sidebar?.results || "Exam Analytics"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time exam results, student activity, and security violation logs.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5 backdrop-blur"
          >
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200/60 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent submissions</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-80 overflow-y-auto">
            {(submissions || []).slice(0, 10).map(s => (
              <div key={s._id} className="px-5 py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{s.studentId?.fullName || "Student"}</p>
                  <p className="text-xs text-gray-500">{s.examId?.title || "Exam"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#2C2DE0]">{s.totalScore ?? 0} pts</p>
                  <p className="text-[10px] uppercase text-gray-400">{s.status}</p>
                </div>
              </div>
            ))}
            {(!submissions || submissions.length === 0) && (
              <p className="px-5 py-8 text-center text-gray-500 text-sm">No submissions yet</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200/60 dark:border-white/10 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Security events</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-80 overflow-y-auto">
            {(securityEvents || []).map((e, i) => (
              <div key={i} className="px-5 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{e.student}</span>
                  <span className="text-[10px] text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{e.action}</p>
                <p className="text-[10px] text-gray-500">{e.exam}</p>
              </div>
            ))}
            {(!securityEvents || securityEvents.length === 0) && (
              <p className="px-5 py-8 text-center text-gray-500 text-sm">No security violations logged</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
