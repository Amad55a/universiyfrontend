import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { AIAssistant } from "./AIAssistant";
import InteractiveQuiz from "./InteractiveQuiz";

vi.mock("@/api/client", () => ({
  default: { post: vi.fn() },
}));

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: String(index),
  question: `Question ${index + 1}`,
  options: ["Choice A", "Choice B", "Choice C", "Choice D"],
}));

describe("interactive AI quizzes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps answers while navigating and only reveals the key after server grading", async () => {
    api.post.mockResolvedValue({
      data: {
        score: 3,
        totalPoints: 15,
        pointsPerQuestion: 3,
        results: questions.map((_, index) => ({
          questionIndex: index,
          selectedIndex: index === 0 ? 1 : null,
          correctIndex: index === 0 ? 1 : 0,
          explanation: `Why ${index + 1}`,
          pointsAwarded: index === 0 ? 3 : 0,
        })),
      },
    });

    render(<InteractiveQuiz quiz={{ quizId: "quiz-1", questions }} onCreateAnother={vi.fn()} />);
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choice B" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Question 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByRole("button", { name: "Choice B" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/why 1/i)).not.toBeInTheDocument();

    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /finish quiz/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/ai/quiz/grade", {
      quizId: "quiz-1",
      answers: { 0: 1 },
    }));
    expect(await screen.findByText("Why 5")).toBeInTheDocument();
    expect(screen.getByText("0 points")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Correct answer")).toHaveLength(1);
    expect(screen.getByText("Score: 3 / 15 points")).toBeInTheDocument();
  });

  it("shows generation errors and retries with the same source material", async () => {
    api.post
      .mockRejectedValueOnce({ response: { data: { message: "Generation unavailable" } } })
      .mockResolvedValueOnce({ data: { quizId: "quiz-2", questions, pointsPerQuestion: 3 } });

    render(<AIAssistant meetingTitle="Real meeting" course="CS 101" />);
    fireEvent.click(screen.getByRole("button", { name: /create quick quiz/i }));
    const source = "The class notes describe the binary search algorithm and its sorted input.";
    fireEvent.change(screen.getByRole("textbox", { name: /quiz source material/i }), {
      target: { value: source },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate quiz" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Generation unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry generation" }));
    expect(await screen.findByText("Question 1 of 5")).toBeInTheDocument();
    expect(api.post).toHaveBeenNthCalledWith(1, "/ai/quiz/generate", {
      sourceContent: source,
      meetingTitle: "Real meeting",
      course: "CS 101",
    });
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
