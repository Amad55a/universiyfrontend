import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StandardQuestion from "./StandardQuestion";

function ExamTextQuestionHarness({ onAutosave, onSubmit }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const questions = [
    { _id: "text-1", type: "short_answer", wordLimit: 100 },
    { _id: "text-2", type: "essay", wordLimit: 500 },
  ];
  const question = questions[activeIndex];
  const answer = answers[question._id] ?? "";

  useEffect(() => {
    if (Object.keys(answers).length) onAutosave(answers);
  }, [answers, onAutosave]);

  return (
    <main>
      <button onClick={() => setActiveIndex(1)} type="button">Next question</button>
      <button onClick={() => setActiveIndex(0)} type="button">Previous question</button>
      <StandardQuestion
        question={question}
        value={answer}
        onChange={(value) => setAnswers((current) => ({
          ...current,
          [question._id]: value,
        }))}
      />
      <button onClick={() => onSubmit(answers)} type="button">Submit answer</button>
    </main>
  );
}

describe("student exam text answers", () => {
  it("accepts typing and edits, preserves answers across question navigation, autosaves, and submits the latest value", async () => {
    const onAutosave = vi.fn();
    const onSubmit = vi.fn();
    render(<ExamTextQuestionHarness onAutosave={onAutosave} onSubmit={onSubmit} />);

    const answerField = screen.getByLabelText("Short answer");
    fireEvent.change(answerField, { target: { value: "first draft" } });
    fireEvent.change(answerField, { target: { value: "final edited text" } });
    expect(answerField).toHaveValue("final edited text");
    await waitFor(() => expect(onAutosave).toHaveBeenLastCalledWith({
      "text-1": "final edited text",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    const essayField = screen.getByPlaceholderText("Type your answer here…");
    fireEvent.change(essayField, { target: { value: "essay response" } });
    fireEvent.click(screen.getByRole("button", { name: "Previous question" }));
    expect(screen.getByLabelText("Short answer")).toHaveValue("final edited text");

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(onSubmit).toHaveBeenCalledWith({
      "text-1": "final edited text",
      "text-2": "essay response",
    });
  });
});
