// StudentCodingLab.jsx
// Same coding lab as before, but:
//   1. The fake textarea+regex "editor" is replaced with real Monaco
//      (see MonacoCodeEditor.jsx) — genuine IntelliSense/diagnostics for
//      JS/HTML/CSS, real syntax highlighting for Python/C/C++/C#/SQL.
//   2. A "Hints" panel surfaces teacher-authored advice (question.hints)
//      plus live Monaco error/warning markers, so students see guidance
//      while they type instead of only after clicking Run.
//   3. Starter-code precedence is explicit and correct:
//        teacher's question.starterCode[lang]  >  language's generic starter
//      HTML's generic starter is a full document (doctype/head/title/body);
//      JS/CSS generic starters are NOT wrapped in a document, since they
//      get merged into the HTML document by WebPreview at runtime.
//   4. For Python/C/C++/C#, an optional "Open Terminal" mode lets the
//      student run their file interactively via the real Docker terminal
//      (TerminalPanel.jsx) when a question needs stdin — the one-shot
//      /api/labs/code/run panel stays for quick non-interactive checks.
//
// npm install @monaco-editor/react monaco-editor @xterm/xterm @xterm/addon-fit axios

import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import MonacoCodeEditor from "./monocoEditor";

// ─── RESIZABLE BOTTOM PANEL ──────────────────────────────────────────────────
// Replaces the old fixed height:190 / height:260 panels. Drag the handle 
// to
// resize; the default height scales with the available viewport instead of
// being hardcoded, and it's clamped so it can never grow enough to push
// Monaco to 0px (that was the earlier "loads then shows nothing" bug) or
// shrink small enough to be useless.
function ResizablePanel({ children, defaultHeight = 280, minHeight = 160, maxHeight = 640 }) {
  const [height, setHeight] = useState(defaultHeight);
  const draggingRef = useRef(false);
  const startRef = useRef({ y: 0, height: defaultHeight });

  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    startRef.current = { y: e.clientY, height };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [height]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const delta = startRef.current.y - e.clientY; // drag up = taller
      const next = Math.min(maxHeight, Math.max(minHeight, startRef.current.height + delta));
      setHeight(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [minHeight, maxHeight]);

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        onPointerDown={onPointerDown}
        title="Drag to resize"
        style={{
          height: 6, flexShrink: 0, cursor: "row-resize",
          background: "#161b22", borderTop: "1px solid #30363d", borderBottom: "1px solid #30363d",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ width: 32, height: 2, borderRadius: 2, background: "#484f58" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

// ─── LANGUAGE DEFINITIONS ────────────────────────────────────────────────────
function unescapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

const SUPPORTED_LANGUAGES = [
  {
    id: "python", label: "Python", ext: ".py", filename: "main.py", icon: "🐍", mode: "code",
    starter: "# Write your solution here\ndef solution():\n    pass\n\nprint(solution())",
  },
  {
    id: "c", label: "C", ext: ".c", filename: "main.c", icon: "🔧", mode: "code",
    starter: '#include <stdio.h>\n\nint main() {\n    // Your solution here\n    printf("Hello, World!\\n");\n    return 0;\n}',
  },
  {
    id: "cpp", label: "C++", ext: ".cpp", filename: "main.cpp", icon: "⚙️", mode: "code",
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  },
  {
    id: "csharp", label: "C#", ext: ".cs", filename: "main.cs", icon: "💜", mode: "code",
    starter: 'using System;\n\nclass Solution {\n    static void Main(string[] args) {\n        Console.WriteLine("Hello, World!");\n    }\n}',
  },
  {
    id: "javascript", label: "JavaScript", ext: ".js", filename: "main.js", icon: "⚡", mode: "code",
    starter: "// Write your solution here\nfunction solution() {\n\n}\n\nconsole.log(solution());",
  },
  {
    id: "html", label: "HTML", ext: ".html", filename: "index.html", icon: "🌐", mode: "web",
    starter:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n\n  <script src="main.js"></script>\n</body>\n</html>',
  },
  {
    id: "css", label: "CSS", ext: ".css", filename: "style.css", icon: "🎨", mode: "web",
    starter: "/* Write your CSS here */\n",
  },
  {
    id: "sql", label: "SQL", ext: ".sql", filename: "query.sql", icon: "🗄️", mode: "sql",
    starter: "-- Write your SQL query here\nSELECT * FROM table_name;\n",
  },
];

const WEB_PROJECT_LANGS = ["html", "css", "javascript"];

// ─── WEB PREVIEW (merges html + css + js into one real document) ───────────
// ✅ FIX: Uses srcdoc instead of contentDocument.write(). The old approach
// failed silently because sandbox="allow-scripts" blocks cross-origin
// contentDocument access. srcdoc re-renders the iframe on every React state
// change without needing document access at all.
function WebPreview({ codes, allowedLanguages = [] }) {
  const [key, setKey] = useState(0);

  const buildDoc = useCallback(() => {
    const html = (codes.html || "").trim();
    const css = codes.css || "";
    const js = codes.javascript || "";
    const hasFullDoc = /<html[\s>]/i.test(html);

    const enableTailwind = allowedLanguages.includes("tailwind");
    const enableReact = allowedLanguages.includes("react");

    const tailwindScript = enableTailwind ? `<script src="https://cdn.tailwindcss.com"></script>` : "";
    const reactScripts = enableReact ? `
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
` : "";
    const jsScriptType = enableReact ? 'type="text/babel"' : '';

    // Inject a tiny error-catcher so students see JS errors in the preview
    // instead of silently failing.
    const errorScript = `<script>
window.onerror = function(msg, src, line) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#ff6b6b;font-family:monospace;font-size:12px;padding:8px 12px;z-index:99999;border-top:2px solid #ff6b6b';
  el.textContent = '⛔ Error (line ' + line + '): ' + msg;
  document.body.appendChild(el);
};
</script>`;

    let cleanHtml = html;
    // Replace link stylesheet referencing style.css or ./style.css
    const cssRegex = /<link\s+[^>]*?href=["'](?:\.\/)?style\.css["'][^>]*?>/gi;
    let cssReplaced = false;
    if (cssRegex.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(cssRegex, `<style>${css}</style>`);
      cssReplaced = true;
    }

    // Replace script src referencing main.js or ./main.js
    const jsRegex = /<script\s+[^>]*?src=["'](?:\.\/)?main\.js["'][^>]*?(?:\/>|>\s*<\/script>)/gi;
    let jsReplaced = false;
    if (jsRegex.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(jsRegex, `<script ${jsScriptType}>${js}\n</script>`);
      jsReplaced = true;
    }

    if (hasFullDoc) {
      let doc = cleanHtml;
      // Inject CSS into <head> if not already replaced
      if (!cssReplaced) {
        doc = /<\/head>/i.test(doc)
          ? doc.replace(/<\/head>/i, `<style>${css}</style></head>`)
          : `<style>${css}</style>` + doc;
      }
      
      // Inject CDNs into <head>
      const cdnScripts = `${tailwindScript}${reactScripts}`;
      if (cdnScripts) {
        doc = /<\/head>/i.test(doc)
          ? doc.replace(/<\/head>/i, `${cdnScripts}</head>`)
          : cdnScripts + doc;
      }

      // Inject JS + error handler before </body> if not already replaced
      if (!jsReplaced) {
        doc = /<\/body>/i.test(doc)
          ? doc.replace(/<\/body>/i, `${errorScript}<script ${jsScriptType}>${js}\n</script></body>`)
          : doc + `${errorScript}<script ${jsScriptType}>${js}\n</script>`;
      } else {
        // Even if js was replaced, inject the error script at the end of head or body
        doc = /<\/body>/i.test(doc)
          ? doc.replace(/<\/body>/i, `${errorScript}</body>`)
          : doc + errorScript;
      }
      return doc;
    }

    // Default template (no <html> tag)
    const finalCss = cssReplaced ? "" : `<style>${css}</style>`;
    const finalJs = jsReplaced ? "" : `<script ${jsScriptType}>${js}\n</script>`;
    const cdnScripts = `${tailwindScript}${reactScripts}`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${cdnScripts}${finalCss}</head><body>${cleanHtml}${errorScript}${finalJs}</body></html>`;
  }, [codes, allowedLanguages]);

  const srcdoc = buildDoc();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", background: "#252526", borderBottom: "1px solid #333", padding: "0.35rem 0.75rem", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#8b949e" }}>🌐 Live Preview</span>
        <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
          onClick={() => setKey(k => k + 1)}
          title="Refresh preview"
          style={{
            marginLeft: "auto", background: "#21262d", border: "1px solid #30363d",
            color: "#8b949e", padding: "2px 8px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, fontWeight: 500,
          }}
        >
          ↻ Refresh
        </button>
      </div>
      <iframe
        key={key}
        title="web-preview"
        sandbox="allow-scripts"
        srcdoc={srcdoc}
        style={{ flex: 1, border: "none", background: "#fff" }}
      />
    </div>
  );
}


// ─── HINTS / ADVICE PANEL ────────────────────────────────────────────────────
// Two sources of "advice":
//  1. Teacher-authored hints (question.hints: string[]) — always available.
//  2. Live Monaco diagnostics (real squiggle-line errors/warnings) for
//     languages Monaco actually understands semantically (JS/HTML/CSS).
//     For Python/C/C++/C#/SQL, Monaco only gives syntax highlighting, so
//     diagnostics will be empty there — that's expected, not a bug (see
//     the note at the bottom of MonacoCodeEditor.jsx).
function HintsPanel({ hints = [], markers = [] }) {
  if (hints.length === 0 && markers.length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid #30363d", background: "#0d1117", maxHeight: 140, overflowY: "auto", flexShrink: 0 }}>
      {markers.length > 0 && (
        <div style={{ padding: "0.5rem 0.75rem" }}>
          <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", marginBottom: 4 }}>
            Editor advice
          </div>
          {markers.map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: m.severity >= 8 ? "#f85149" : "#d29922", padding: "2px 0" }}>
              {m.severity >= 8 ? "⛔" : "⚠️"} Line {m.startLineNumber}: {m.message}
            </div>
          ))}
        </div>
      )}
      {hints.length > 0 && (
        <div style={{ padding: "0.5rem 0.75rem", borderTop: markers.length ? "1px solid #21262d" : "none" }}>
          <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", marginBottom: 4 }}>
            Teacher's hints
          </div>
          {hints.map((h, i) => (
            <div key={i} style={{ fontSize: 12, color: "#79c0ff", padding: "2px 0" }}>💡 {h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ONE-SHOT EXECUTION PANEL (non-interactive Run) ─────────────────────────
// Accepts an optional `initialResult` to restore the last run when the student
// navigates back to this question. Stores the result to localStorage.
function loadStoredResult(key) {
  if (!key || typeof window === "undefined") {
    return { result: null, storageWarning: "" };
  }
  try {
    const raw = window.localStorage.getItem(key);
    return { result: raw ? JSON.parse(raw) : null, storageWarning: "" };
  } catch (error) {
    return {
      result: null,
      storageWarning: `Previous execution output could not be restored: ${error.message}`,
    };
  }
}

function ExecutionPanel({ code, langId, questionId, examId, sqlSchema, questionDraftKey, onResultChange }) {
  const resultKey = questionDraftKey ? `${questionDraftKey}_lastRun_${langId}` : null;
  const [outputState, setOutputState] = useState(() => loadStoredResult(resultKey));
  const { result, storageWarning } = outputState;
  const setResult = (value) => setOutputState((current) => ({ ...current, result: value }));
  const setStorageWarning = (value) => setOutputState((current) => ({ ...current, storageWarning: value }));
  const [running, setRunning] = useState(false);
  const [stdin, setStdin]   = useState("");
  const [showStdin, setShowStdin] = useState(false);

  const runCode = async (overrideCode) => {
    if (running) return;
    setRunning(true);
    try {
      const source = typeof overrideCode === "string" ? overrideCode : code;
      const payload = { code: source, language: langId };
      if (examId) {
        payload.stdin = stdin;
      } else if (langId === "sql") {
        payload.questionId = questionId;
        payload.schema = sqlSchema || "";
      } else {
        payload.stdin = stdin;
      }
      const endpoint = examId
        ? `/api/exams/student/${examId}/questions/${questionId}/run`
        : "/api/labs/code/run";
      const res = await axios.post(endpoint, payload);
      const data = res.data?.data;
      if (!data || typeof data !== "object") {
        throw new Error("The execution service returned an invalid response.");
      }
      if (typeof data.stdout !== "string") data.stdout = data.output ?? "";
      if (typeof data.stderr !== "string") data.stderr = "";
      setResult(data);
      if (resultKey) {
        try {
          localStorage.setItem(resultKey, JSON.stringify(data));
          setStorageWarning("");
        } catch (error) {
          setStorageWarning(`Execution output could not be saved in this browser: ${error.message}`);
        }
      }
      onResultChange?.(data);
    } catch (err) {
      const data = {
        serviceError: true,
        message: err.response?.data?.message || err.message || "The execution service is unavailable.",
      };
      setResult(data);
    } finally {
      setRunning(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    if (resultKey) {
      try {
        localStorage.removeItem(resultKey);
        setStorageWarning("");
      } catch (error) {
        setStorageWarning(`Execution output could not be cleared from this browser: ${error.message}`);
      }
    }
  };

  const isSql = langId === "sql";
  const needsStdin = ["python", "c", "cpp", "csharp", "javascript"].includes(langId);
  const tables = isSql ? (sqlSchema || "").match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-zA-Z0-9_]+)/gi)?.map(s => s.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?/i, "").trim()) || [] : [];

  const execTimeLabel = result?.executionTime != null ? `${result.executionTime}ms` : null;
  const exitCodeLabel = result?.exitCode != null ? `exit ${result.exitCode}` : null;

  return (
    <div style={{ height: "100%", background: "#0d1117", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", background: "#161b22", borderBottom: "1px solid #30363d", padding: "0.35rem 0.75rem", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {isSql ? "🗄️ Query Result" : "▶️ Console Output"}
        </span>

        {/* Meta badges (exit code, exec time) */}
        {result && !isSql && !result.serviceError && (
          <>
            {exitCodeLabel && (
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: result.ok ? "#0d2818" : "#2c0b0e",
                color: result.ok ? "#3fb950" : "#f85149",
                border: `1px solid ${result.ok ? "#2ea043" : "#f8514955"}`,
                fontFamily: "monospace",
              }}>
                {exitCodeLabel}
              </span>
            )}
            {execTimeLabel && (
              <span style={{ fontSize: 10, color: "#8b949e", fontFamily: "monospace" }}>⏱ {execTimeLabel}</span>
            )}
          </>
        )}

        {/* SQL table inspector */}
        {isSql && tables.length > 0 && (
          <select
            onChange={(e) => { if (e.target.value) { runCode(`SELECT * FROM ${e.target.value} LIMIT 50;`); e.target.value = ""; } }}
            style={{ background: "#21262d", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 4, padding: "2px 6px", fontSize: 11, marginLeft: 10 }}
          >
            <option value="">-- Inspect table --</option>
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {/* stdin toggle for non-SQL */}
          {needsStdin && !isSql && (
            <button
              onClick={() => setShowStdin(s => !s)}
              title="Toggle stdin input"
              style={{
                background: showStdin ? "#1a3652" : "#21262d",
                border: `1px solid ${showStdin ? "#388bfd" : "#30363d"}`,
                color: showStdin ? "#79c0ff" : "#8b949e",
                padding: "0.2rem 0.55rem", borderRadius: 4, cursor: "pointer", fontSize: 10,
              }}
            >
              ⌨ stdin
            </button>
          )}
          {/* Clear button */}
          {result && (
            <button
              onClick={clearResult}
              title="Clear output"
              style={{
                background: "#21262d", border: "1px solid #30363d",
                color: "#8b949e", padding: "0.2rem 0.55rem", borderRadius: 4, cursor: "pointer", fontSize: 10,
              }}
            >
              ✕
            </button>
          )}
          {/* Run button */}
          <button
            onClick={() => runCode()}
            disabled={running}
            style={{
              background: running ? "#21262d" : "#238636",
              border: `1px solid ${running ? "#30363d" : "#2ea043"}`,
              color: running ? "#8b949e" : "#fff",
              padding: "0.25rem 0.75rem", borderRadius: 5, cursor: running ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600,
            }}
          >
            {running ? "⏳ Running…" : "▶ Run " + (isSql ? "Query" : "Code")}
          </button>
        </div>
      </div>

      {/* stdin input area */}
      {showStdin && !isSql && (
        <div style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "0.4rem 0.75rem" }}>
          <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 4 }}>STDIN (pre-supply input for input() / scanf / readline)</div>
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder={"line1\nline2\n..."}
            rows={3}
            style={{
              width: "100%", background: "#0d1117", color: "#e6edf3",
              border: "1px solid #30363d", borderRadius: 4, fontFamily: "monospace",
              fontSize: 11, padding: "0.3rem 0.5rem", resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Output area */}
      <div style={{ flex: 1, overflow: "auto", padding: "0.5rem", position: "relative" }}>
        {storageWarning && <p role="status" style={{ color: "#d29922", fontSize: 11 }}>{storageWarning}</p>}
        {result?.serviceError && (
          <p role="alert" style={{ color: "#f85149", fontSize: 12, whiteSpace: "pre-wrap" }}>
            Execution failed: {result.message}
          </p>
        )}
        {result?.timedOut && (
          <p role="alert" style={{ color: "#d29922", fontSize: 12 }}>
            Execution timed out. The runner stopped the program.
          </p>
        )}
        {result && !result.serviceError && !isSql && (
          <div style={{ color: "#8b949e", fontSize: 10, margin: "0.25rem 0.5rem" }}>
            Program stdout (last run)
          </div>
        )}
        {/* Empty state */}
        {!result && (
          <div style={{ color: "#484f58", fontSize: 12, padding: "0.5rem", fontFamily: "monospace" }}>
            {/* Intentionally empty — no fake "no output" message */}
          </div>
        )}

        {/* Error / non-ok output */}
        {result && !result.serviceError && !result.ok && !isSql && (
          <pre aria-label="Standard output" style={{ color: "#f85149", fontSize: 12, padding: "0.5rem", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>
            {result.stdout || "(No stdout output)"}
          </pre>
        )}

        {/* Success output (may be empty string — intentional) */}
        {result && !result.serviceError && result.ok && !isSql && (
          <pre aria-label="Standard output" style={{ color: "#e6edf3", fontSize: 12, padding: "0.5rem", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>
            {result.stdout || "(No stdout output)"}
          </pre>
        )}

        {result?.stderr && !result.serviceError && !isSql && (
          <section aria-label="Standard error" style={{ borderTop: "1px solid #30363d", padding: "0.5rem" }}>
            <div style={{ color: "#f85149", fontSize: 10, marginBottom: 4 }}>STDERR</div>
            <pre style={{ color: "#ff7b72", fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>{result.stderr}</pre>
          </section>
        )}
        {/* SQL table result */}
        {result && result.ok && isSql && result.type === "table" && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: "#e6edf3" }}>
              <thead>
                <tr>{result.columns.map(c => (
                  <th key={c} style={{ padding: "0.3rem 0.75rem", background: "#21262d", borderBottom: "1px solid #30363d", textAlign: "left", color: "#58a6ff", fontWeight: 600 }}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1a1f26" }}>
                    {row.map((cell, j) => (<td key={j} style={{ padding: "0.3rem 0.75rem", color: "#e6edf3" }}>{cell === null ? "NULL" : String(cell)}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "#3fb950", marginTop: 6, paddingLeft: "0.3rem" }}>✓ {result.message}</div>
          </>
        )}
        {result && result.ok && isSql && result.type === "ok" && (
          <div style={{ color: "#3fb950", fontSize: 12, padding: "0.5rem" }}>✓ {result.message}</div>
        )}
      </div>
    </div>
  );
}

// ─── STUDENT: CODING LAB (main component) ────────────────────────────────────
export function StudentCodingLab({ question, value, onSave, examId }) {
  const allowedLangs = (question.allowedLanguages || []).filter(id => !["tailwind", "react"].includes(id));
  const initialLang = value?.langId || allowedLangs[0] || "python";
  const [selectedLangId, setSelectedLangId] = useState(initialLang);
  const [codes, setCodes] = useState(value?.codes || (value?.code ? { [initialLang]: value.code } : {}));
  const [showPreview, setShowPreview] = useState(true);
  const [markers, setMarkers] = useState([]);

  // Key used for localStorage — scoped to question so different questions don't collide
  const draftKey = question._id ? `coding_draft_${question._id}` : null;

  const lang = SUPPORTED_LANGUAGES.find(l => l.id === selectedLangId);

  // Precedence, made explicit: teacher's starter for THIS language, else
  // the language's own generic starter. Never silently falls back to a
  // different language's starter.
  const getCode = useCallback(
    (id) => {
      if (codes[id] !== undefined) return codes[id];
      const teacherStarter = question.starterCode?.[id];
      if (teacherStarter !== undefined) {
        // Unescape HTML entities in case they were escaped in database/templates
        return unescapeHtml(teacherStarter);
      }
      return SUPPORTED_LANGUAGES.find(l => l.id === id)?.starter || "";
    },
    [codes, question.starterCode]
  );

  const code = getCode(selectedLangId);

  const setCode = (v) => {
    const next = { ...codes, [selectedLangId]: v };
    setCodes(next);
    onSave?.({ langId: selectedLangId, code: v, codes: next });
  };

  const switchLang = (id) => {
    if (!allowedLangs.includes(id)) return;
    setSelectedLangId(id);
    setMarkers([]);
  };

  const isWebProject = allowedLangs.some(id => ["html", "css"].includes(id));
  const showEditorTabIsWeb = isWebProject && WEB_PROJECT_LANGS.includes(selectedLangId);

  const [previewCodes, setPreviewCodes] = useState(() => {
    if (!isWebProject) return {};
    return { html: getCode("html"), css: getCode("css"), javascript: getCode("javascript") };
  });
  useEffect(() => {
    if (!isWebProject) return;
    // ✅ FIX: Reduced debounce from 500ms to 300ms for near-instant preview updates
    const t = setTimeout(() => {
      setPreviewCodes({ html: getCode("html"), css: getCode("css"), javascript: getCode("javascript") });
    }, 300);
    return () => clearTimeout(t);
  }, [codes, isWebProject, getCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 480, background: "#0d1117", color: "#e6edf3" }}>
      {/* Language tab bar */}
      <div style={{ display: "flex", alignItems: "center", background: "#161b22", borderBottom: "1px solid #30363d", padding: "0 0.75rem", flexShrink: 0, overflowX: "auto" }}>
        <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginRight: 10, flexShrink: 0 }}>Allowed:</span>
        {allowedLangs.map(id => {
          const l = SUPPORTED_LANGUAGES.find(x => x.id === id);
          if (!l) return null;
          const active = id === selectedLangId;
          // Map language ID to filename
          let filename = l.ext;
          if (id === "html") filename = "index.html";
          else if (id === "css") filename = "style.css";
          else if (id === "javascript") filename = "main.js";
          else if (id === "python") filename = "main.py";
          else if (id === "c") filename = "main.c";
          else if (id === "cpp") filename = "main.cpp";
          else if (id === "csharp") filename = "main.cs";
          else if (id === "sql") filename = "query.sql";

          return (
            <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
              key={id}
              onClick={() => switchLang(id)}
              style={{
                background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? "#388bfd" : "transparent"}`,
                color: active ? "#e6edf3" : "#8b949e", padding: "0.6rem 0.85rem",
                cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5,
                whiteSpace: "nowrap", fontWeight: active ? 600 : 400, flexShrink: 0,
              }}
            >
              {l.icon} {filename}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingLeft: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8b949e", background: "#21262d", padding: "0.2rem 0.55rem", borderRadius: 4, border: "1px solid #30363d" }}>
            {lang?.icon} {selectedLangId === "html" ? "index.html" : selectedLangId === "css" ? "style.css" : selectedLangId === "javascript" ? "main.js" : selectedLangId === "sql" ? "query.sql" : `main${lang?.ext}`}
          </span>
          {isWebProject && (
            <button className="bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
              onClick={() => setShowPreview(p => !p)}
              style={{
                background: showPreview ? "#1a3652" : "#21262d",
                border: `1px solid ${showPreview ? "#388bfd" : "#30363d"}`,
                color: showPreview ? "#79c0ff" : "#8b949e",
                padding: "0.25rem 0.65rem", borderRadius: 5, cursor: "pointer", fontSize: 11,
              }}
            >
              {showPreview ? "👁 Hide Preview" : "👁 Show Preview"}
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: isWebProject && showPreview ? "0 0 55%" : 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, minHeight: 320 }}>
          <MonacoCodeEditor
            value={code}
            onChange={setCode}
            langId={selectedLangId}
            onValidate={setMarkers}
          />
          <HintsPanel hints={question.hints} markers={markers} />

          {!showEditorTabIsWeb && (
            <ResizablePanel
              defaultHeight={Math.round(Math.min(window.innerHeight * 0.3, 260))}
              minHeight={140}
              maxHeight={Math.round(window.innerHeight * 0.7)}
            >
              <ExecutionPanel
                key={`${draftKey || question._id}_${selectedLangId}`}
                code={code}
                langId={selectedLangId}
                questionId={question._id}
                examId={examId}
                sqlSchema={question.sqlSchema}
                questionDraftKey={draftKey}
                onResultChange={(res) => {
                  onSave?.({
                    langId: selectedLangId,
                    code,
                    codes,
                    codeOutput: res?.stdout ?? res?.output ?? "",
                    exitCode: res?.exitCode,
                    executionTime: res?.executionTime,
                  });
                }}
              />
            </ResizablePanel>
          )}
        </div>

        {isWebProject && showPreview && (
          <div style={{ flex: "0 0 45%", borderLeft: "1px solid #30363d", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <WebPreview codes={previewCodes} allowedLanguages={question.allowedLanguages} />
          </div>
        )}
      </div>
    </div>
  );
}
