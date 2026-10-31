import React, { useState } from "react";
import api from "@/api/client";
import { toast } from "sonner";
import { Sparkles, Loader2, BookOpen, AlertCircle, RefreshCw } from "lucide-react";

export default function AiFeedbackTab({ submission, examId, subId, onRefresh }) {
  const [generating, setGenerating] = useState(false);

  const triggerFeedback = async () => {
    try {
      setGenerating(true);
      await api.post(
        `/api/exams/teacher/${examId}/submissions/${subId}/ai-feedback`
      );
      toast.success("AI feedback generated successfully!");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate AI feedback");
    } finally {
      setGenerating(false);
    }
  };

  const answers = submission?.answers || [];

  return (
    <div className="space-y-6">
      {/* Trigger section */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
            AI Student Feedback
          </h3>
          <p className="text-purple-200 text-sm mt-1 max-w-xl">
            Generate educational, personalized post-exam explanations for all answers. Students will see these explanations only after results are published.
          </p>
        </div>
        <button
          onClick={triggerFeedback}
          disabled={generating}
          className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-950" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate All Feedback
            </>
          )}
        </button>
      </div>

      {/* Generated feedback view */}
      <div className="space-y-4">
        {answers.map((ans, idx) => {
          const suggestions = ans.aiSuggestions || {};
          const aiFeedback = ans.aiFeedback;

          return (
            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2">
                <span className="text-xs font-bold text-gray-400">Question {idx + 1}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">Score: {ans.finalScore} / {ans.maxMarks}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ans.questionText}</p>

              {aiFeedback ? (
                <div className="bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> Post-Exam Explanation
                  </div>
                  {suggestions.explanation && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{suggestions.explanation}</p>
                  )}
                  {suggestions.correctApproach && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-bold">Correct Approach: </span>{suggestions.correctApproach}
                    </div>
                  )}
                  {suggestions.conceptsToReview?.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                      <BookOpen className="w-3 h-3" />
                      Review: {suggestions.conceptsToReview.join(", ")}
                    </div>
                  )}
                  {suggestions.encouragement && (
                    <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-2">"{suggestions.encouragement}"</p>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-400 flex items-center gap-1.5 italic">
                  <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                  No AI feedback generated for this question yet.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
