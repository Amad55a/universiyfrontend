import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import QuestionsTab, {
  decodeLegacyHtmlSource,
  extractSubmittedCodeFiles,
} from "./QuestionsTab";

const fabricMock = vi.hoisted(() => ({ loadedJSONs: [] }));
vi.mock("fabric", () => ({
  StaticCanvas: class {
    constructor(element, options) {
      element.width = options.width;
      element.height = options.height;
    }
    async loadFromJSON(json) {
      fabricMock.loadedJSONs.push(json);
    }
    renderAll() {}
    async dispose() {}
  },
}));

afterEach(() => {
  fabricMock.loadedJSONs.length = 0;
});

describe("HTML submission source display", () => {
  it("decodes only recognizable legacy sanitized HTML documents", () => {
    expect(decodeLegacyHtmlSource("&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;h1&gt;Hello&lt;/h1&gt;&lt;/html&gt;"))
      .toBe("<!DOCTYPE html><html><h1>Hello</h1></html>");
    expect(decodeLegacyHtmlSource("&lt;tag&gt; is a text example"))
      .toBe("&lt;tag&gt; is a text example");
  });

  it("renders HTML answers as inert source text in the grading viewer", () => {
    const source = "<!DOCTYPE html>\n<html><body><script>studentCode()</script></body></html>";
    const { container } = render(
      <QuestionsTab
        submission={{
          _id: "submission-1",
          answers: [{
            questionId: "question-1",
            questionType: "labhtml",
            type: "labhtml",
            answer: source,
            maxMarks: 5,
          }],
        }}
        grades={{}}
        examId="exam-1"
        onUpdateGrade={vi.fn()}
      />,
    );

    const sourceViewer = container.querySelector("pre");
    expect(sourceViewer?.textContent).toBe(source);
    expect(sourceViewer?.querySelector("script")).toBeNull();
  });

  it("extracts every current web-project file and labels it separately", () => {
    const files = extractSubmittedCodeFiles({
      langId: "javascript",
      code: "console.log('latest');",
      codes: {
        html: "<!DOCTYPE html><html><body><h1>Poster</h1></body></html>",
        css: "h1 { color: red; }",
        javascript: "console.log('latest');",
      },
    });

    expect(files).toEqual([
      { filename: "index.html", source: "<!DOCTYPE html><html><body><h1>Poster</h1></body></html>" },
      { filename: "style.css", source: "h1 { color: red; }" },
      { filename: "main.js", source: "console.log('latest');" },
    ]);
  });

  it("supports filename-keyed maps and array-based file submissions", () => {
    expect(extractSubmittedCodeFiles({
      langId: "css",
      code: ".latest { color: blue; }",
      codes: {
        "index.html": "<h1>Page</h1>",
        "main.css": ".card { color: red; }",
        "script.js": "start();",
      },
    })).toEqual([
      { filename: "index.html", source: "<h1>Page</h1>" },
      { filename: "main.css", source: ".latest { color: blue; }" },
      { filename: "script.js", source: "start();" },
    ]);
    expect(extractSubmittedCodeFiles({
      codes: [
        { filename: "home.html", content: "<h1>Older</h1>" },
        { name: "theme.css", code: "body { color: green; }" },
        { path: "script.js", source: "run();" },
      ],
    })).toEqual([
      { filename: "home.html", source: "<h1>Older</h1>" },
      { filename: "script.js", source: "run();" },
      { filename: "theme.css", source: "body { color: green; }" },
    ]);
  });

  it("keeps the legacy HTML-only answer readable", () => {
    expect(extractSubmittedCodeFiles("&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;h1&gt;Old answer&lt;/h1&gt;&lt;/html&gt;"))
      .toEqual([{
        filename: "index.html",
        source: "<!DOCTYPE html><html><h1>Old answer</h1></html>",
      }]);
  });

  it("renders all lab files as inert source and renders the stored design snapshot", async () => {
    fabricMock.loadedJSONs.length = 0;
    const { container } = render(
      <QuestionsTab
        submission={{
          _id: "submission-1",
          answers: [
            {
              questionId: "web-question",
              questionType: "lab",
              type: "lab",
              answer: {
                langId: "javascript",
                code: "console.log('safe');",
                codes: {
                  html: "<script>notExecuted()</script>",
                  css: ".card { color: red; }",
                  javascript: "console.log('safe');",
                },
              },
              maxMarks: 5,
            },
            {
              questionId: "design-question",
              questionType: "design_lab",
              type: "design_lab",
              answer: { designId: "507f1f77bcf86cd799439015" },
              designSnapshot: {
                width: 800,
                height: 600,
                pages: [
                  {
                    title: "Poster",
                    sort_order: 0,
                    canvas_json: JSON.stringify({
                      objects: [
                        { type: "textbox", text: "Submitted poster" },
                        { type: "image", src: "https://res.cloudinary.com/example/poster.png" },
                      ],
                    }),
                  },
                  { title: "Second page", sort_order: 1, canvas_json: '{"objects":[{"type":"rect"}]}' },
                ],
              },
              maxMarks: 5,
            },
          ],
        }}
        grades={{}}
        examId="exam-1"
        onUpdateGrade={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("pre")).toHaveLength(3);
    expect(screen.getByText(/index\.html/)).toBeTruthy();
    expect(screen.getByText(/style\.css/)).toBeTruthy();
    expect(screen.getByText(/main\.js/)).toBeTruthy();
    expect(screen.getByText("HTML")).toBeTruthy();
    expect(screen.getByText("CSS")).toBeTruthy();
    expect(screen.getByText("JavaScript")).toBeTruthy();
    const htmlSource = [...container.querySelectorAll("pre")]
      .find((pre) => pre.textContent?.includes("notExecuted"));
    expect(htmlSource?.querySelector("script")).toBeNull();
    expect(await screen.findByRole("img", { name: "Submitted design page: Poster" })).toBeTruthy();
    expect(await screen.findByRole("img", { name: "Submitted design page: Second page" })).toBeTruthy();
    await waitFor(() => expect(fabricMock.loadedJSONs).toHaveLength(2));
    expect(fabricMock.loadedJSONs[0].objects[0].text).toBe("Submitted poster");
    expect(fabricMock.loadedJSONs[0].objects[1].src).toBe("https://res.cloudinary.com/example/poster.png");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).not.toContain("Unable to load the submitted design.");
  });

  it("explains when a legacy submission has no reconstructable snapshot", () => {
    render(
      <QuestionsTab
        submission={{
          _id: "legacy-submission",
          answers: [{
            questionId: "design-question",
            questionType: "design_lab",
            type: "design_lab",
            answer: { designId: "507f1f77bcf86cd799439015" },
            maxMarks: 5,
          }],
        }}
        grades={{}}
        examId="exam-1"
        onUpdateGrade={vi.fn()}
      />,
    );
    expect(screen.getByText(/submitted poster cannot be reconstructed/i)).toBeTruthy();
  });
  expect(extractSubmittedCodeFiles(
    { langId: "css", code: "main { color: red; } body &gt; main { display: block; }" },
    "lab",
  )).toEqual([{
    filename: "style.css",
    source: "main { color: red; } body > main { display: block; }",
  }]);
  expect(extractSubmittedCodeFiles("&lt;h1&gt;Old fragment&lt;/h1&gt;", "labhtml"))
    .toEqual([{ filename: "Submitted source", source: "<h1>Old fragment</h1>" }]);
});
