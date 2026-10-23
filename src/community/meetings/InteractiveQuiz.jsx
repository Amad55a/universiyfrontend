import React, { useState } from "react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from "lucide-react";
import api from "@/api/client";

export default function InteractiveQuiz({ quiz, onCreateAnother }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");

  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const questionResult = result?.results?.[index];

  const gradeQuiz = async () => {
    if (grading) return;
    setError("");
    setGrading(true);
    try {
      const { data } = await api.post("/ai/quiz/grade", {
        quizId: quiz.quizId,
        answers,
      });
      const validResults = Array.isArray(data?.results)
        && data.results.length === quiz.questions.length
        && data.results.every((item, itemIndex) =>
          item.questionIndex === itemIndex
          && item.selectedIndex === (answers[itemIndex] ?? null)
          && Number.isInteger(item.correctIndex)
          && item.correctIndex >= 0
          && item.correctIndex < quiz.questions[itemIndex].options.length
          && typeof item.explanation === "string"
          && item.pointsAwarded === (item.selectedIndex === item.correctIndex ? 3 : 0)
        );
      const calculatedScore = validResults
        ? data.results.reduce((total, item) => total + item.pointsAwarded, 0)
        : -1;
      if (
        data?.pointsPerQuestion !== 3 ||
        data.totalPoints !== quiz.questions.length * 3 ||
        data.score !== calculatedScore
      ) {
        throw new Error("The quiz grader returned an invalid result. Please retry.");
      }
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Could not grade this quiz. Please retry.");
    } finally {
      setGrading(false);
    }
  };

  return (
    <section aria-label="Interactive quiz" className="flex flex-col gap-4 rounded-xl border border-white/15 bg-gray-950 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/60">
            {result ? "Quiz complete" : `Question ${index + 1} of ${quiz.questions.length}`}
          </p>
          {!result && <p className="mt-1 text-[10px] text-white/45">3 points per question</p>}
          {result && (
            <p className="mt-1 text-sm font-bold">
              Score: {result.score} / {result.totalPoints} points
            </p>
          )}
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <div
            className="h-full bg-[#2C2DE0] transition-all"
            style={{ width: `${((index + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold leading-relaxed">{question.question}</h3>
        <div className="flex flex-col gap-2">
          {question.options.map((option, optionIndex) => {
            const selected = answers[index] === optionIndex;
            const correct = questionResult?.correctIndex === optionIndex;
            let stateClass = selected
              ? "border-[#7778ff] bg-[#2C2DE0]/25"
              : "border-white/15 bg-white/5 hover:border-white/35";
            if (result && correct) stateClass = "border-green-400 bg-green-500/15";
            else if (result && selected) stateClass = "border-red-400 bg-red-500/15";

            return (
              <button
                key={`${optionIndex}-${option}`}
                type="button"
                aria-pressed={selected}
                onClick={() => !result && setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                disabled={Boolean(result)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors disabled:cursor-default ${stateClass}`}
              >
                <span>{option}</span>
                {result && correct && <Check size={15} aria-label="Correct answer" className="shrink-0 text-green-300" />}
              </button>
            );
          })}
        </div>
        {result && questionResult && (
          <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs leading-relaxed">
            <p className={questionResult.pointsAwarded ? "text-green-300" : "text-white/70"}>
              {questionResult.pointsAwarded ? "+3 points" : "0 points"}
            </p>
            <p className="mt-1 text-white/75">{questionResult.explanation}</p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-300">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0 || grading}
          className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        {isLast && !result ? (
          <button
            type="button"
            onClick={gradeQuiz}
            disabled={grading}
            className="ml-auto flex items-center gap-2 rounded-lg bg-[#2C2DE0] px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            {grading ? <><LoaderCircle size={14} className="animate-spin" /> Grading…</> : error ? "Retry grading" : "Finish quiz"}
          </button>
        ) : isLast && result ? (
          <button
            type="button"
            onClick={onCreateAnother}
            className="ml-auto flex items-center gap-2 rounded-lg bg-[#2C2DE0] px-4 py-2 text-xs font-bold"
          >
            <RotateCcw size={14} /> Create another quiz
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((current) => Math.min(quiz.questions.length - 1, current + 1))}
            disabled={grading}
            className="ml-auto flex items-center gap-1 rounded-lg bg-[#2C2DE0] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            Next <ChevronRight size={14} />
          </button>
        )}
      </div>
    </section>
  );
}
