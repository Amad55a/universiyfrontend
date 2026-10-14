import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { StudentCodingLab } from "./CodingLab";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("./monocoEditor", () => ({
  default: ({ value, onChange }) => (
    <textarea
      aria-label="Source code"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const question = {
  _id: "question-1",
  allowedLanguages: ["python"],
  starterCode: { python: "print('starter')" },
};

describe("exam coding lab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("runs the latest editor source and stdin through the exam-scoped runner", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          ok: true,
          stdout: "first line\nsecond line\n",
          stderr: "",
          output: "first line\nsecond line\n",
          exitCode: 0,
          executionTime: 8,
          timedOut: false,
        },
      },
    });
    render(<StudentCodingLab examId="exam-1" question={question} />);

    fireEvent.change(screen.getByLabelText("Source code"), {
      target: { value: "print(input())\nprint('second line')" },
    });
    fireEvent.click(screen.getByRole("button", { name: /stdin/ }));
    fireEvent.change(screen.getByPlaceholderText(/line1/), {
      target: { value: "actual input\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Run Code/ }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/exams/student/exam-1/questions/question-1/run",
        {
          language: "python",
          code: "print(input())\nprint('second line')",
          stdin: "actual input\n",
        },
      );
    });
    const output = await screen.findByLabelText("Standard output");
    expect(output.textContent).toBe("first line\nsecond line\n");
  });

  it("shows stderr and timeout information without claiming success", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          ok: false,
          stdout: "",
          stderr: "SyntaxError: invalid syntax\n",
          output: "",
          exitCode: -1,
          executionTime: 10_000,
          timedOut: true,
        },
      },
    });
    render(<StudentCodingLab examId="exam-1" question={question} />);
    fireEvent.click(await screen.findByRole("button", { name: /Run Code/ }));

    expect(await screen.findByText(/Execution timed out/)).toBeInTheDocument();
    expect(screen.getByLabelText("Standard error")).toHaveTextContent("SyntaxError: invalid syntax");
    expect(screen.getByText("exit -1")).toBeInTheDocument();
  });

  it("reports unavailable execution services instead of showing fake output", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "Code execution service is unavailable." } },
    });
    render(<StudentCodingLab examId="exam-1" question={question} />);
    fireEvent.click(await screen.findByRole("button", { name: /Run Code/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Execution failed: Code execution service is unavailable.",
    );
    expect(screen.queryByText(/No stdout output/)).not.toBeInTheDocument();
  });
});
