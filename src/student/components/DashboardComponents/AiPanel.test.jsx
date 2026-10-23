import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import AIPanel from "./AiPanel";
import { mergeVoiceTranscript } from "./aiVoiceInput";

vi.mock("@/api/client", () => ({
  default: { post: vi.fn() },
  getAccessToken: () => null,
}));

describe("mergeVoiceTranscript", () => {
  it("keeps existing typed text and appends recognized speech", () => {
    expect(mergeVoiceTranscript("Explain this page", "the second paragraph"))
      .toBe("Explain this page the second paragraph");
  });

  it("does not add redundant whitespace or an empty transcript", () => {
    expect(mergeVoiceTranscript("Explain this page  ", "the second paragraph"))
      .toBe("Explain this page  the second paragraph");
    expect(mergeVoiceTranscript("Explain this page", "  ")).toBe("Explain this page");
  });

  it("uses the transcript when there was no typed text", () => {
    expect(mergeVoiceTranscript("", "What does this term mean?"))
      .toBe("What does this term mean?");
  });
});

describe("Library Tutor interactive quiz", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the tutor prompt in the available panel height", () => {
    const theme = {
      id: "light",
      aiPanel: "#ffffff",
      aiPanelBorder: "#dddddd",
      border: "#dddddd",
      surface: "#f8f8f8",
      text: "#111111",
      textMuted: "#666666",
      textFaint: "#999999",
      accent: "#2C2DE0",
    };
    const { container } = render(
      <AIPanel
        bookTitle="Algorithms"
        currentPage={1}
        numPages={12}
        selectedText=""
        theme={theme}
      />
    );

    const panel = container.querySelector(".library-tutor-panel");
    expect(panel).toHaveStyle({ flex: "1 1 0%", minHeight: "0" });
    expect(screen.getByRole("textbox", { name: "Ask the library tutor" })).toBeInTheDocument();
  });

  it("generates a quiz from the extracted page text without exposing answer keys", async () => {
    const sourceContent = "Binary search repeatedly divides a sorted range in half to find a target value efficiently.";
    const questions = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      question: `Question ${index + 1}`,
      options: ["Choice A", "Choice B", "Choice C", "Choice D"],
    }));
    api.post.mockResolvedValue({
      data: { quizId: "quiz-1", questions, pointsPerQuestion: 3 },
    });
    const theme = {
      id: "light",
      aiPanel: "#ffffff",
      aiPanelBorder: "#dddddd",
      border: "#dddddd",
      surface: "#f8f8f8",
      text: "#111111",
      textMuted: "#666666",
      textFaint: "#999999",
      accent: "#2C2DE0",
    };
    const pdfRef = {
      getPage: vi.fn().mockResolvedValue({
        getTextContent: () => Promise.resolve({
          items: [{ str: sourceContent }],
        }),
      }),
    };

    render(
      <AIPanel
        bookTitle="Algorithms"
        currentPage={1}
        numPages={12}
        selectedText=""
        theme={theme}
        pdfRef={pdfRef}
      />
    );
    await screen.findAllByText("Page 1 text loaded");
    fireEvent.click(screen.getByRole("button", { name: /quiz/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/ai/quiz/generate", { sourceContent });
    });
    expect(await screen.findByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.queryByText(/correctIndex|explanation/i)).not.toBeInTheDocument();
  });

  it("renders AI chunks as they arrive from the authenticated stream endpoint", async () => {
    const sourceContent = "Binary search repeatedly divides a sorted range in half to find a target value efficiently.";
    const toChunk = (text) => new TextEncoder().encode(
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`
    );
    const chunks = [toChunk("A streamed "), toChunk("answer.")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(async () => (
            chunks.length ? { value: chunks.shift(), done: false } : { done: true }
          )),
        }),
      },
    }));
    const theme = {
      id: "light",
      aiPanel: "#ffffff",
      aiPanelBorder: "#dddddd",
      border: "#dddddd",
      surface: "#f8f8f8",
      text: "#111111",
      textMuted: "#666666",
      textFaint: "#999999",
      accent: "#2C2DE0",
    };
    const pdfRef = {
      getPage: vi.fn().mockResolvedValue({
        getTextContent: () => Promise.resolve({
          items: [{ str: sourceContent }],
        }),
      }),
    };
    render(
      <AIPanel
        bookTitle="Algorithms"
        currentPage={1}
        numPages={12}
        selectedText=""
        theme={theme}
        pdfRef={pdfRef}
      />
    );
    await screen.findAllByText("Page 1 text loaded");
    fireEvent.change(screen.getByRole("textbox", { name: "Ask the library tutor" }), {
      target: { value: "Explain binary search." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("A streamed answer.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/ai\/chat\/stream$/u),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });
});
