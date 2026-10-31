import React, { useState, useEffect } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import {
  BarChart2, Award, TrendingUp, Users, Percent, HelpCircle,
  Loader2, RefreshCw, AlertCircle, Calendar
} from "lucide-react";

export default function TeacherResultsPage() {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await api.get("/api/exams/teacher");
        const list = data.data?.exams || [];
        setExams(list);
        if (list.length > 0) {
          setSelectedExamId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load exams");
      }
    };
    fetchExams();
  }, []);

  const fetchResults = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const { data } = await api.get(
        `/api/exams/teacher/${selectedExamId}/submissions/results`
      );
      setResultsData(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load results dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedExamId]);

  if (loading && !resultsData) {
    return (
      <div className="flex items-center justify-center py-32 bg-gray-50 dark:bg-zinc-950 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C2DE0]" />
      </div>
    );
  }

  const stats = resultsData?.stats || {};
  const submissions = resultsData?.submissions || [];
  const distribution = stats.gradeDistribution || [];
  const maxCount = distribution.length > 0
    ? Math.max(...distribution.map((d) => d.count))
    : 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-[#2C2DE0]" />
            Results & Analytics
          </h1>
          <p className="text-gray-500 text-sm">
            Detailed performance analysis, grade distributions, and question statistics.
          </p>
        </div>

        {/* Exam Context Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]"
          >
            <option value="">-- Choose Exam --</option>
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.title}
              </option>
            ))}
          </select>
          <button
            onClick={fetchResults}
            disabled={loading}
            className="p-2 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#2C2DE0]" : ""}`} />
          </button>
        </div>
      </div>

      {!selectedExamId ? (
        <div className="text-center py-20 text-gray-400 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" />
          <p>Please create or select an exam first.</p>
        </div>
      ) : (
        <>
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Users}      label="Class Size"       value={stats.totalSubmissions || 0} unit="students" color="indigo" />
            <MetricCard icon={Percent}    label="Class Average"    value={stats.avgScore || 0} unit="%" color="green" />
            <MetricCard icon={Award}      label="Highest Score"    value={stats.highScore || 0} unit="%" color="blue" />
            <MetricCard icon={TrendingUp} label="Passing Rate"     value={stats.passRate || 0} unit="%" color="purple" />
          </div>

          {/* Core Analytics Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* SVG Grade Distribution Graph */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Grade Distribution</h3>
              <div className="h-64 flex items-end gap-3 pt-6 font-mono text-[10px] text-gray-400">
                {distribution.map((bar, i) => {
                  const pct = Math.round((bar.count / maxCount) * 100) || 5;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="opacity-0 group-hover:opacity-100 text-xs font-bold text-gray-800 dark:text-white transition-opacity">
                        {bar.count}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-[#2C2DE0]/80 to-emerald-400 rounded-t-md group-hover:opacity-90 transition-all cursor-pointer"
                        style={{ height: `${pct}%` }}
                        title={`${bar.count} students scored in ${bar.range}%`}
                      />
                      <span className="text-[9px] shrink-0 truncate max-w-full text-center">{bar.range}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade summary pill cards */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Performance Metrics</h3>
              <div className="space-y-4 pt-2">
                <StatRow label="Median Score" value={`${stats.median || 0}%`} />
                <StatRow label="Lowest Score" value={`${stats.lowScore || 0}%`} />
                <StatRow label="Target Benchmark" value="60%" />
                <div className="border-t border-gray-100 dark:border-zinc-800 pt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Pass / Fail split</span>
                    <span className="font-semibold text-[#2C2DE0]">{stats.passRate || 0}% passed</span>
                  </div>
                  <div className="h-3 bg-red-100 dark:bg-red-500/10 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#2C2DE0]" style={{ width: `${stats.passRate || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question-level analytics */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Question Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-3 text-left">Question snippet</th>
                    <th className="pb-3 text-left">Type</th>
                    <th className="pb-3 text-right">Attempted</th>
                    <th className="pb-3 text-right">Avg Score</th>
                    <th className="pb-3 text-right">Success Rate</th>
                    <th className="pb-3 text-right">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {(stats.questionAnalysis || []).map((q, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200 max-w-sm truncate">
                        {q.questionText}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-zinc-800 text-gray-500">
                          {q.type}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{q.attempted}</td>
                      <td className="py-3 text-right font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                        {q.avgEarned} / {q.maxMarks}
                      </td>
                      <td className="py-3 text-right font-mono text-xs font-bold text-[#2C2DE0] dark:text-[#2C2DE0]">
                        {q.correctRate}%
                      </td>
                      <td className="py-3 text-right">
                        <DifficultyBadge level={q.difficulty} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color }) {
  const colors = {
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-100 dark:border-zinc-800",
    green:  "from-[#2C2DE0]/10 to-[#2C2DE0]/5 text-[#2C2DE0] border-[#2C2DE0] dark:border-zinc-800",
    blue:   "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-100 dark:border-zinc-800",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-100 dark:border-zinc-800",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || "from-gray-50 to-gray-100 border-gray-200"} rounded-2xl border p-5`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">
        {value}
        <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function DifficultyBadge({ level }) {
  const configs = {
    easy: "bg-[#2C2DE0] text-white dark:bg-[#2C2DE0]/10 dark:text-[#2C2DE0]",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  const c = configs[level] || configs.medium;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c}`}>
      {level}
    </span>
  );
}
