import React, { useState, useEffect } from "react";
import api from "@/api/client";
import { History, Loader2, AlertCircle } from "lucide-react";

export default function HistoryTab({ examId, subId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/api/exams/teacher/${examId}/submissions/${subId}/logs`
        );
        setLogs(data.data.logs || []);
      } catch (err) {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [examId, subId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2C2DE0]" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No activity history logged yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Activity History</h3>
      <div className="relative border-l-2 border-gray-200 dark:border-zinc-800 pl-5 ml-2.5 space-y-5">
        {logs.map((log, idx) => {
          const dateStr = new Date(log.timestamp).toLocaleString();
          const teacherName = log.teacherId?.fullName || "System / Student";

          return (
            <div key={idx} className="relative">
              {/* Dot */}
              <span className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-[#2C2DE0]" />

              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {log.action?.replace(/_/g, " ").toUpperCase()}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  by {teacherName} · {dateStr}
                </p>
                {log.note && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-zinc-800/40 px-2 py-1 rounded">
                    {log.note}
                  </p>
                )}
                {log.action === "score_changed" && (
                  <p className="text-[10px] text-blue-500 font-mono mt-0.5">
                    Score: {log.before ?? "—"} → {log.after ?? "—"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
