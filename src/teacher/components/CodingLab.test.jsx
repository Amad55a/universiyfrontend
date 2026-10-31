import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { StudentCodingLab } from "./CodingLab";

vi.mock("@/api/client", () => ({ default: { post: vi.fn() } }));
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
    api.post.mockResolvedValueOnce({
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
      expect(api.post).toHaveBeenCalledWith(
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

  it("shows and preserves a scalar Python starter instead of ignoring the exam template", async () => {
    render(
      <StudentCodingLab
        examId="exam-1"
        question={{
          ...question,
          programmingLanguage: "python",
          starterCode: 'print("dad")',
        }}
      />,
    );

    const editor = screen.getByLabelText("Source code");
    expect(editor).toHaveValue('print("dad")');
    fireEvent.change(editor, { target: { value: 'print("student edit")' } });
    expect(editor).toHaveValue('print("student edit")');
  });

  it("recovers a legacy source string even when the saved language map is empty", async () => {
    render(
      <StudentCodingLab
        examId="exam-1"
        question={question}
        value={{ langId: "python", code: 'print("recovered")', codes: {} }}
      />,
    );

    expect(screen.getByLabelText("Source code")).toHaveValue('print("recovered")');
  });

  it("submits HTML, CSS, and JavaScript editor buffers together", () => {
    const onSave = vi.fn();
    render(
      <StudentCodingLab
        examId="exam-1"
        question={{
          ...question,
          allowedLanguages: ["html", "css", "javascript"],
          starterCode: { html: "", css: "", javascript: "" },
        }}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Source code"), {
      target: { value: "<h1>Somali</h1>" },
    });
    fireEvent.click(screen.getByRole("button", { name: /style\.css/ }));
    fireEvent.change(screen.getByLabelText("Source code"), {
      target: { value: "body { background: red; }" },
    });
    fireEvent.click(screen.getByRole("button", { name: /main\.js/ }));
    fireEvent.change(screen.getByLabelText("Source code"), {
      target: { value: "document.title = 'Somali';" },
    });

    expect(onSave).toHaveBeenLastCalledWith({
      langId: "javascript",
      code: "document.title = 'Somali';",
      codes: {
        html: "<h1>Somali</h1>",
        css: "body { background: red; }",
        javascript: "document.title = 'Somali';",
      },
    });
  });

  it("shows stderr and timeout information without claiming success", async () => {
    api.post.mockResolvedValueOnce({
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

  it("renders Azure stdout and stderr separately and clears stale output while running", async () => {
    let finishRun;
    api.post.mockImplementationOnce(() => new Promise((resolve) => {
      finishRun = resolve;
    }));
    render(<StudentCodingLab examId="exam-1" question={question} />);
    fireEvent.click(await screen.findByRole("button", { name: /Run Code/ }));

    expect(await screen.findByRole("status")).toHaveTextContent("Running the current editor source");
    expect(screen.queryByText(/No stdout output/)).not.toBeInTheDocument();
    finishRun({
      data: {
        data: {
          ok: false,
          stdout: "before error\n",
          stderr: "ValueError: UNICORE_TEST_ERROR\n",
          output: "before error\nValueError: UNICORE_TEST_ERROR\n",
          exitCode: 1,
          executionTime: 12,
          timedOut: false,
          executionStatus: "failed",
        },
      },
    });

    expect(await screen.findByLabelText("Standard output")).toHaveTextContent("before error");
    expect(screen.getByLabelText("Standard error")).toHaveTextContent("ValueError: UNICORE_TEST_ERROR");
    expect(screen.getByText("Execution failed")).toBeInTheDocument();
  });

  it("reports unavailable execution services instead of showing fake output", async () => {
    const diagnostic = "Docker daemon is unavailable. Start Docker Desktop and verify its configured endpoint, then retry.";
    api.post.mockRejectedValueOnce({
      response: { data: { message: diagnostic } },
    });
    render(<StudentCodingLab examId="exam-1" question={question} />);
    fireEvent.click(await screen.findByRole("button", { name: /Run Code/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(`Execution failed: ${diagnostic}`);
    expect(screen.queryByText(/No stdout output/)).not.toBeInTheDocument();
  });
});
