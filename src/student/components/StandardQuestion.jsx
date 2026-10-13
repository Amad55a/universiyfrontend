import React from "react";

export default function StandardQuestion({ question, value, onChange }) {
  if (question.type === "mcq") {
    return (
      <div className="space-y-3">
        {question.options?.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
              ${value === opt
                ? "border-[#2C2DE0] bg-[#2C2DE0] dark:border-[#2C2DE0] dark:bg-[#2C2DE0]/20"
                : "border-neutral-200 hover:border-[#2C2DE0] dark:border-neutral-700 dark:hover:border-neutral-600"}
            `}
          >
            <input
              type="radio"
              name={`q-${question._id}`}
              value={opt}
              checked={value === opt}
              onChange={e => onChange(e.target.value)}
              className="w-5 h-5 text-[#2C2DE0] border-neutral-300 focus:ring-[#2C2DE0]"
            />
            <span className="text-lg">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm text-neutral-500">Select all that apply.</legend>
        {question.options?.map((option, index) => (
          <label
            key={`${index}-${option}`}
            className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all
              ${selected.includes(option)
                ? "border-[#2C2DE0] bg-[#2C2DE0]/10"
                : "border-neutral-200 hover:border-[#2C2DE0] dark:border-neutral-700"}
            `}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) => onChange(
                event.target.checked
                  ? [...selected, option]
                  : selected.filter((answer) => answer !== option),
              )}
              className="h-5 w-5 accent-[#2C2DE0]"
            />
            <span className="text-lg">{option}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (question.type === "truefalse") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {["True", "False"].map(opt => (
          <label
            key={opt}
            className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 cursor-pointer transition-all text-center
              ${value === (opt === "True")
                ? "border-[#2C2DE0] bg-[#2C2DE0] dark:border-[#2C2DE0] dark:bg-[#2C2DE0]/20"
                : "border-neutral-200 hover:border-[#2C2DE0] dark:border-neutral-700 dark:hover:border-neutral-600"}
            `}
          >
            <input
              type="radio"
              name={`q-${question._id}`}
              checked={value === (opt === "True")}
              onChange={() => onChange(opt === "True")}
              className="hidden"
            />
            <span className="font-display text-2xl font-semibold">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "essay") {
    return (
      <div className="space-y-2">
        <textarea
          className="w-full h-64 border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 rounded-xl p-4 focus:ring-[#2C2DE0] focus:border-[#2C2DE0] resize-none"
          placeholder="Type your answer here…"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
        />
        <div className="text-right text-sm text-neutral-500">Word limit: {question.wordLimit}</div>
      </div>
    );
  }

  if (question.type === "short_answer") {
    return (
      <div className="space-y-2">
        <label htmlFor={`answer-${question._id}`} className="block text-sm font-medium">
          Short answer
        </label>
        <textarea
          id={`answer-${question._id}`}
          className="w-full min-h-28 border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 rounded-xl p-4 focus:ring-[#2C2DE0] focus:border-[#2C2DE0] resize-y"
          placeholder="Type your answer here…"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
        <p className="text-right text-sm text-neutral-500">
          Word limit: {question.wordLimit || 100}
        </p>
      </div>
    );
  }

  return null;
}