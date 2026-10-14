import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const axiosMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: axiosMocks }));
vi.mock("../../components/DesignSnapshotPreview", () => ({
  default: () => <div>Saved design preview</div>,
}));

import StudentResultsPage from "./StudentResultsPage";

afterEach(() => vi.clearAllMocks());

describe("student coding lab results", () => {
  it("shows every submitted file as inert source and supports a legacy HTML-only answer", async () => {
    const html = "<!doctype html>\n<html>\n  <body><script>notExecuted()</script></body>\n</html>";
    const css = "body {\n  color: red;\n}";
    const javascript = "function start() {\n  return true;\n}";
    axiosMocks.get.mockImplementation((url) => {
      if (url === "/api/student/results") {
        return Promise.resolve({ data: { data: { results: [{ _id: "submission-1", examTitle: "Web Lab", percentage: 90, totalScore: 9, totalMaxMarks: 10, publishedAt: "2026-01-01" }] } } });
      }
      if (url === "/api/student/results/submission-1") {
        return Promise.resolve({
          data: {
            data: {
              submission: {
                examTitle: "Web Lab",
                percentage: 90,
                totalScore: 9,
                totalMaxMarks: 10,
                publishedAt: "2026-01-01",
                answers: [
                  {
                    questionId: "modern",
                    questionType: "lab",
                    questionText: "Build a website",
                    finalScore: 5,
                    maxMarks: 5,
                    studentAnswer: {
                      langId: "css",
                      code: css,
                      codes: {
                        "index.html": html,
                        "theme.css": css,
                        "script.js": javascript,
                      },
                    },
                  },
                  {
                    questionId: "legacy",
                    questionType: "labhtml",
                    questionText: "Legacy HTML",
                    finalScore: 4,
                    maxMarks: 5,
                    studentAnswer: "&lt;!doctype html&gt;&lt;h1&gt;Older submission&lt;/h1&gt;",
                  },
                ],
              },
            },
          },
        });
      }
      throw new Error(`Unexpected results request: ${url}`);
    });

    const { container } = render(<StudentResultsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /view detailed feedback/i }));

    await screen.findByText("Build a website");
    expect(screen.getAllByText(/📄 index\.html/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/📄 theme\.css/)).toBeTruthy();
    expect(screen.getByText(/📄 script\.js/)).toBeTruthy();
    expect(screen.getAllByText("HTML").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("CSS")).toBeTruthy();
    expect(screen.getByText("JavaScript")).toBeTruthy();
    const renderedSources = [...container.querySelectorAll("pre")].map((pre) => pre.textContent);
    expect(renderedSources).toContain(html);
    expect(renderedSources).toContain(css);
    expect(renderedSources).toContain(javascript);
    expect(screen.getByText("<!doctype html><h1>Older submission</h1>", { exact: true })).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    await waitFor(() => expect(axiosMocks.get).toHaveBeenCalledWith("/api/student/results/submission-1"));
  });
});
