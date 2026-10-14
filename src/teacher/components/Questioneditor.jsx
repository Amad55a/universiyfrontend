// QuestionEditor.jsx — MCQ / True-False / Essay unchanged.
// Coding Lab, Design Lab, and Terminal Lab each support one attached image
// via the shared <ImageUploadField />.
import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, Terminal, Lock, Plus, Trash2 } from "lucide-react";
import ImageUploadField from "./ImageUploadField";
import { LINUX_TERMINAL_ENABLED } from "../../config/features";

const LAB_LANGUAGES = [
  { id: "python",     label: "Python",     ext: ".py",   icon: "🐍" },
  { id: "c",          label: "C",          ext: ".c",    icon: "🔧" },
  { id: "cpp",        label: "C++",        ext: ".cpp",  icon: "⚙️" },
  { id: "csharp",     label: "C#",         ext: ".cs",   icon: "💜" },
  { id: "javascript", label: "JavaScript (NodeJS)", ext: ".js",   icon: "⚡" },
  { id: "html",       label: "HTML",       ext: ".html", icon: "🌐" },
  { id: "css",        label: "CSS",        ext: ".css",  icon: "🎨" },
  { id: "sql",        label: "SQL",        ext: ".sql",  icon: "🗄️" },
];

const STARTER_CODE = {
  python:     "def solution():\n    # Write your solution here\n    pass\n\nprint(solution())",
  c:          "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
  cpp:        "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}",
  csharp:     "using System;\n\nclass Solution {\n    static void Main(string[] args) {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}",
  javascript: "function solution() {\n    \n}\n\nconsole.log(solution());",
  html:       "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
  css:        "body {\n  font-family: sans-serif;\n  background: #f5f5f5;\n}\n\nh1 { color: #333; }",
  sql:        "-- Write your SQL query here\nSELECT * FROM table_name\nWHERE condition\nORDER BY column_name;",
};

// ─── Tooltip wrapper ─────────────────────────────────────────────────────────
function Tooltip({ children, text }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-center px-3 py-2 text-xs rounded-lg bg-neutral-900 text-white shadow-xl pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </div>
  );
}

// ─── MCQ Editor (unchanged) ──────────────────────────────────────────────────
function McqEditor({ question, index, onUpdate, onUpdateOption }) {
  return (
    <div className="space-y-3">
      {question.options?.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-medium w-6 text-neutral-500">{String.fromCharCode(65 + i)}.</span>
          <input
            type="text"
            className="flex-1 border p-2 rounded-lg text-sm dark:bg-neutral-700 dark:border-neutral-600"
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
            value={opt}
            onChange={e => onUpdateOption(index, i, e.target.value)}
          />
          <input
            type="radio"
            name={`answer-${index}`}
            checked={question.answer === opt}
            onChange={() => onUpdate(index, "answer", opt)}
            className="w-4 h-4"
          />
          <span className="text-xs text-neutral-400">Correct</span>
        </div>
      ))}
    </div>
  );
}

function MultiSelectEditor({ question, index, onUpdate, onUpdateOption }) {
  const selectedAnswers = Array.isArray(question.answer) ? question.answer : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">Select every option that is correct.</p>
      {question.options?.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center gap-2">
          <span className="w-6 text-xs font-medium text-neutral-500">
            {String.fromCharCode(65 + optionIndex)}.
          </span>
          <input
            type="text"
            className="flex-1 rounded-lg border p-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
            value={option}
            onChange={(event) => {
              const nextOption = event.target.value;
              onUpdateOption(index, optionIndex, nextOption);
              if (selectedAnswers.includes(option)) {
                onUpdate(index, "answer", selectedAnswers.map(
                  (answer) => answer === option ? nextOption : answer,
                ));
              }
            }}
          />
          <input
            type="checkbox"
            aria-label={`Correct option ${String.fromCharCode(65 + optionIndex)}`}
            checked={selectedAnswers.includes(option) && Boolean(option)}
            onChange={(event) => onUpdate(
              index,
              "answer",
              event.target.checked
                ? [...selectedAnswers, option]
                : selectedAnswers.filter((answer) => answer !== option),
            )}
            className="h-4 w-4"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Terminal Lab Editor ──────────────────────────────────────────────────────
// Real Docker-backed Linux terminal. Teacher can attach a task image (e.g. a
// diagram or expected-output screenshot) plus optional setup script and
// auto-grading validation commands.
function LinuxLabEditor({ question, index, onUpdate }) {
  const tasks = question.validationCommands || [];

  const addTask = () =>
    onUpdate(index, "validationCommands", [
      ...tasks,
      { command: "", expectedOutput: "", points: 1, description: "" },
    ]);

  const removeTask = (i) =>
    onUpdate(index, "validationCommands", tasks.filter((_, j) => j !== i));

  const updateTask = (i, field, value) => {
    const updated = [...tasks];
    updated[i] = { ...updated[i], [field]: value };
    onUpdate(index, "validationCommands", updated);
  };

  const totalPoints = tasks.reduce((s, t) => s + (Number(t.points) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="rounded-lg  dark:bg-[#2C2DE0]/20 border border-[#2C2DE0] dark:border-[#2C2DE0] p-3 flex gap-3 items-start">
        <Terminal className="w-4 h-4 text-[#2C2DE0] dark:text-[#2C2DE0] mt-0.5 shrink-0" />
        <div className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0] space-y-1">
          {LINUX_TERMINAL_ENABLED ? (
            <p><strong>Isolated Linux terminal</strong> — students run commands in a sandboxed Docker container.</p>
          ) : (
            <p><strong>Temporarily unavailable.</strong> Existing Linux Terminal activities cannot be run or added while this feature is disabled.</p>
          )}
        </div>
      </div>

      <ImageUploadField
        label="Task image (optional — diagram, expected terminal output, etc.)"
        value={question.image}
        onChange={url => onUpdate(index, "image", url)}
      />

      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
          Setup Script{" "}
          <span className="text-neutral-400 font-normal">(optional — runs before student starts)</span>
        </label>
        <textarea
          className="w-full border p-2 rounded-lg text-xs font-mono dark:bg-neutral-700 dark:border-neutral-600 min-h-[80px] resize-y"
          placeholder={`# Prepare the environment, e.g.:\nmkdir -p /home/student/project\necho "base.txt" > /home/student/project/readme.txt`}
          value={question.setupScript || ""}
          onChange={e => onUpdate(index, "setupScript", e.target.value)}
          spellCheck={false}
        />
      </div>

    </div>
  );
}

// ─── Coding Lab Editor ────────────────────────────────────────────────────────
// Teacher picks ONE of three modes:
//   1. Programming — one language (Python, C, C++, C#, JavaScript) + terminal/run
//   2. Web — HTML + CSS + JavaScript combo with live preview
//   3. Database — SQL with schema editor and table results
// Can attach one problem image (diagram, expected output, etc.).
function LabLanguageSelector({ question, index, onUpdate }) {
  const allowedLangs = question.allowedLanguages || [];
  const starterCodes = typeof question.starterCode === "object" && question.starterCode !== null ? question.starterCode : {};

  const PROGRAMMING_LANGS = LAB_LANGUAGES.filter(l => !["html", "css", "sql"].includes(l.id));
  const SQL_LANG = LAB_LANGUAGES.find(l => l.id === "sql");

  // Detect current mode
  const isWebMode = allowedLangs.some(l => ["html", "css"].includes(l));
  const isSqlMode = allowedLangs.length === 1 && allowedLangs[0] === "sql";
  const isProgrammingMode = !isWebMode && !isSqlMode && allowedLangs.length > 0;

  // Only one non-web programming language at a time — this is a subject
  // choice (Python question vs C++ question), not a multi-language quiz.
  const selectProgrammingLang = (langId) => {
    onUpdate(index, "allowedLanguages", [langId]);
    onUpdate(index, "starterCode", { [langId]: starterCodes[langId] || STARTER_CODE[langId] || "" });
  };

  // Web mode — select all three (HTML + CSS + JS) at once
  const selectWebMode = () => {
    const webLangs = ["html", "css", "javascript"];
    onUpdate(index, "allowedLanguages", webLangs);
    const starters = {};
    webLangs.forEach(id => {
      starters[id] = starterCodes[id] || STARTER_CODE[id] || "";
    });
    onUpdate(index, "starterCode", starters);
  };

  // Toggle individual web language (HTML/CSS/JS) within web mode
  const toggleWebLang = (langId) => {
    let updated;
    if (allowedLangs.includes(langId)) {
      updated = allowedLangs.filter(l => l !== langId);
      // If no web langs left, deactivate web mode
      if (!updated.some(l => ["html", "css"].includes(l)) && updated.length === 0) {
        onUpdate(index, "allowedLanguages", []);
        return;
      }
    } else {
      updated = [...allowedLangs.filter(l => ["html", "css", "javascript"].includes(l)), langId];
    }
    onUpdate(index, "allowedLanguages", updated);
    if (!starterCodes[langId]) {
      onUpdate(index, "starterCode", { ...starterCodes, [langId]: STARTER_CODE[langId] || "" });
    }
  };

  // Database mode — SQL only
  const selectDatabaseMode = () => {
    onUpdate(index, "allowedLanguages", ["sql"]);
    onUpdate(index, "starterCode", { sql: starterCodes.sql || STARTER_CODE.sql || "" });
  };

  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Problem image (optional — diagram, expected output screenshot, etc.)"
        value={question.image}
        onChange={url => onUpdate(index, "image", url)}
      />

      {/* ─── MODE 1: Programming Language ─────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
          🖥️ Programming Language <span className="text-neutral-400 font-normal">(choose one — runs with terminal output)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PROGRAMMING_LANGS.map(lang => {
            const checked = allowedLangs.length === 1 && allowedLangs[0] === lang.id;
            return (
              <label
                key={lang.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                  checked
                    ? "bg-[#2C2DE0] border-[#2C2DE0] dark:bg-[#2C2DE0]/30 dark:border-[#2C2DE0] shadow-sm"
                    : "bg-white border-neutral-200 hover:border-neutral-400 dark:bg-neutral-700 dark:border-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name={`lab-mode-${index}`}
                  checked={checked}
                  onChange={() => selectProgrammingLang(lang.id)}
                  className="w-3.5 h-3.5 accent-[#2C2DE0]"
                />
                <span className="text-sm">{lang.icon}</span>
                <span className="text-sm font-medium dark:text-neutral-200">{lang.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        <span className="text-xs text-neutral-400 font-medium">or</span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
      </div>

      {/* ─── MODE 2: Web Development ──────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
          🌐 Web Development <span className="text-neutral-400 font-normal">(HTML + CSS + JavaScript with live preview)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={selectWebMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all select-none text-sm font-medium ${
              isWebMode
                ? "bg-blue-50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600 text-blue-700 dark:text-blue-300 shadow-sm"
                : "bg-white border-neutral-200 hover:border-blue-300 dark:bg-neutral-700 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
            }`}
          >
            <input
              type="radio"
              name={`lab-mode-${index}`}
              checked={isWebMode}
              onChange={selectWebMode}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            🌐 HTML + 🎨 CSS + ⚡ JavaScript
          </button>
        </div>

        {isWebMode && (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 text-xs text-blue-700 dark:text-blue-300">
              🌐 Student gets a code editor for each language tab and a <strong>live web preview</strong> panel that updates as they type.
            </div>
            <div className="flex gap-2 flex-wrap">
              {["html", "css", "javascript"].map(langId => {
                const lang = LAB_LANGUAGES.find(l => l.id === langId);
                const checked = allowedLangs.includes(langId);
                return (
                  <label
                    key={langId}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none ${
                      checked
                        ? "bg-blue-50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600"
                        : "bg-white border-neutral-200 hover:border-neutral-400 dark:bg-neutral-700 dark:border-neutral-600"
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleWebLang(langId)} className="w-3.5 h-3.5 accent-blue-600" />
                    <span className="text-sm">{lang?.icon}</span>
                    <span className="text-sm font-medium dark:text-neutral-200">{lang?.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Frameworks & Styling Toggles */}
            <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Frameworks & Styling
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={allowedLangs.includes("tailwind")}
                    onChange={() => {
                      const updated = allowedLangs.includes("tailwind")
                        ? allowedLangs.filter(l => l !== "tailwind")
                        : [...allowedLangs, "tailwind"];
                      onUpdate(index, "allowedLanguages", updated);
                    }}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  🎨 Enable Tailwind CSS
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={allowedLangs.includes("react")}
                    onChange={() => {
                      const updated = allowedLangs.includes("react")
                        ? allowedLangs.filter(l => l !== "react")
                        : [...allowedLangs, "react"];
                      onUpdate(index, "allowedLanguages", updated);
                    }}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  ⚛️ Enable React (Babel UMD)
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        <span className="text-xs text-neutral-400 font-medium">or</span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
      </div>

      {/* ─── MODE 3: Database (SQL) ───────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
          🗄️ Database <span className="text-neutral-400 font-normal">(SQL queries with table results)</span>
        </label>
        <button
          type="button"
          onClick={selectDatabaseMode}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all select-none text-sm font-medium ${
            isSqlMode
              ? "bg-purple-50 border-purple-400 dark:bg-purple-900/30 dark:border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm"
              : "bg-white border-neutral-200 hover:border-purple-300 dark:bg-neutral-700 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          <input
            type="radio"
            name={`lab-mode-${index}`}
            checked={isSqlMode}
            onChange={selectDatabaseMode}
            className="w-3.5 h-3.5 accent-purple-600"
          />
          {SQL_LANG?.icon} SQL — SQLite Database
        </button>

        {isSqlMode && (
          <div className="mt-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 p-3 text-xs text-purple-700 dark:text-purple-300">
            🗄️ Each student gets an <strong>isolated SQLite database</strong>. They can CREATE tables, INSERT data, and run queries. Results are shown as formatted tables.
          </div>
        )}
      </div>

      {allowedLangs.length === 0 && (
        <p className="text-xs text-red-500 mt-2">⚠️ Select a language mode to continue.</p>
      )}

      {/* ─── Starter Code Editors ─────────────────────────────────────── */}
      {allowedLangs.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
            Starter Code {isWebMode ? "(per language tab)" : ""}{" "}
            <span className="text-neutral-400 font-normal">— teacher provides half, student completes it</span>
          </label>
          <div className="space-y-3">
            {allowedLangs.filter(id => !["tailwind", "react"].includes(id)).map(langId => {
              const lang = LAB_LANGUAGES.find(l => l.id === langId);
              return (
                <div key={langId} className="border rounded-lg overflow-hidden dark:border-neutral-600">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 border-b dark:border-neutral-600">
                    <span className="text-sm">{lang?.icon}</span>
                    <span className="text-xs font-mono font-medium text-neutral-600 dark:text-neutral-300">
                      solution{lang?.ext}
                    </span>
                  </div>
                  <textarea
                    className="w-full p-3 text-xs font-mono bg-neutral-900 text-neutral-100 resize-y min-h-[100px] border-0 outline-none"
                    value={starterCodes[langId] || STARTER_CODE[langId] || ""}
                    onChange={e => {
                      const updated = { ...starterCodes, [langId]: e.target.value };
                      onUpdate(index, "starterCode", updated);
                    }}
                    spellCheck={false}
                    placeholder={`Starter code for ${lang?.label}...`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SQL Schema Editor (only in Database mode) ────────────────── */}
      {isSqlMode && (
        <div>
          <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
            Database Schema <span className="text-neutral-400 font-normal">(CREATE TABLE + INSERT statements — seeds student's DB)</span>
          </label>
          <textarea
            className="w-full border p-2 rounded-lg text-xs font-mono dark:bg-neutral-700 dark:border-neutral-600 min-h-[120px] resize-y"
            placeholder={`CREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  grade TEXT,\n  age INTEGER\n);\n\nINSERT INTO students VALUES (1, 'Alice', 'A', 20);\nINSERT INTO students VALUES (2, 'Bob', 'B', 22);`}
            value={question.sqlSchema || ""}
            onChange={e => onUpdate(index, "sqlSchema", e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

    
    </div>
  );
}


function TestCasesEditor({ question, index, onUpdate }) {
  const testCases = question.testCases || [];
  const addTestCase    = () => onUpdate(index, "testCases", [...testCases, { input: "", expectedOutput: "", hidden: false }]);
  const removeTestCase = (i) => onUpdate(index, "testCases", testCases.filter((_, j) => j !== i));
  const updateTestCase = (i, field, value) => {
    const updated = [...testCases];
    updated[i] = { ...updated[i], [field]: value };
    onUpdate(index, "testCases", updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Test Cases</label>
        <button
          type="button"
          onClick={addTestCase}
          className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300"
        >
          + Add test case
        </button>
      </div>
      <div className="space-y-2">
        {testCases.map((tc, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
            <input type="text" placeholder="Input" value={tc.input} onChange={e => updateTestCase(i, "input", e.target.value)} className="border p-1.5 rounded text-xs dark:bg-neutral-700 dark:border-neutral-600" />
            <input type="text" placeholder="Expected output" value={tc.expectedOutput} onChange={e => updateTestCase(i, "expectedOutput", e.target.value)} className="border p-1.5 rounded text-xs dark:bg-neutral-700 dark:border-neutral-600" />
            <label className="flex items-center gap-1 text-xs text-neutral-500 whitespace-nowrap">
              <input type="checkbox" checked={tc.hidden || false} onChange={e => updateTestCase(i, "hidden", e.target.checked)} />
              Hidden
            </label>
            <button type="button" onClick={() => removeTestCase(i)} className="text-red-400 hover:text-red-600 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {testCases.length === 0 && (
          <p className="text-xs text-neutral-400">No test cases yet. Add some to auto-grade submissions.</p>
        )}
      </div>
    </div>
  );
}

// ─── Design Lab Editor ────────────────────────────────────────────────────────
// Canva-style, not a code lab: teacher uploads a reference design image and
// describes requirements. Students recreate it with a drag/drop canvas tool
// (shapes, text, images) — no code editor involved anywhere in this block.
// Always graded manually (teacher compares reference vs. student canvas).
function DesignLabEditor({ question, index, onUpdate }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 p-3 text-xs text-pink-700 dark:text-pink-300">
        🎨 <strong>Design Lab:</strong> upload the reference design image. Students recreate it using
        a Canva-style canvas (shapes, text, images) — no coding involved. Grading is manual.
      </div>

      <ImageUploadField
        label="Reference design image"
        value={question.image}
        onChange={url => onUpdate(index, "image", url)}
      />
      {!question.image && (
        <p className="text-xs text-red-500">A reference image is required for this block.</p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
          Requirements (shown to student)
        </label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded-lg text-sm dark:bg-neutral-700 dark:border-neutral-600"
          placeholder="e.g. Match the layout, colors, and proportions as closely as possible."
          value={question.question}
          onChange={e => onUpdate(index, "question", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
          Allowed Colors (comma-separated hex codes)
        </label>
        <input
          type="text"
          className="w-full border p-2 rounded-lg text-sm dark:bg-neutral-700 dark:border-neutral-600"
          placeholder="#FF0000, #00FF00, #0000FF"
          value={(question.designColors || []).join(", ")}
          onChange={e => {
            const val = e.target.value;
            const colors = val.split(",").map(c => c.trim()).filter(Boolean);
            onUpdate(index, "designColors", colors);
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
          Lab Resources (Student Assets)
        </label>
        <p className="text-xs text-neutral-500 mb-2">Upload logos or images the student can use in their design.</p>
        <div className="space-y-2">
          {(question.designResources || []).map((url, i) => (
             <div key={i} className="flex items-center gap-2">
                <img src={url} className="h-8 rounded" alt="resource" />
                <button type="button" onClick={() => {
                   const res = [...question.designResources];
                   res.splice(i, 1);
                   onUpdate(index, "designResources", res);
                }} className="text-red-500 text-xs hover:underline">Remove</button>
             </div>
          ))}
          <ImageUploadField
            label="Upload an asset"
            value=""
            onChange={url => {
              if (!url) return;
              const res = [...(question.designResources || []), url];
              onUpdate(index, "designResources", res);
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
          Templates (Backgrounds)
        </label>
        <p className="text-xs text-neutral-500 mb-2">Upload layout images that students can click to set as their canvas background.</p>
        <div className="space-y-2">
          {(question.designTemplates || []).map((url, i) => (
             <div key={i} className="flex items-center gap-2">
                <img src={url} className="h-8 rounded border border-neutral-200" alt="template" />
                <button type="button" onClick={() => {
                   const res = [...question.designTemplates];
                   res.splice(i, 1);
                   onUpdate(index, "designTemplates", res);
                }} className="text-red-500 text-xs hover:underline">Remove</button>
             </div>
          ))}
          <ImageUploadField
            label="Upload a template"
            value=""
            onChange={url => {
              if (!url) return;
              const res = [...(question.designTemplates || []), url];
              onUpdate(index, "designTemplates", res);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── "Coming Soon" overlay for the labs we haven't built yet ──────────────────
function ComingSoonBanner({ labName }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/50 p-8 text-center">
      <Lock className="w-8 h-8 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{labName} — Coming Soon</p>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto">
        We're working on this lab environment. It will be available in a future update. Stay tuned!
      </p>
    </div>
  );
}

// ─── Main QuestionEditor ──────────────────────────────────────────────────────
export default function QuestionEditor({ question, index, onRemove, onUpdate, onUpdateOption }) {
  const [collapsed, setCollapsed] = useState(false);

  const typeLabel = {
    mcq:             "Multiple Choice",
    multi_select:    "Multiple Select",
    truefalse:       "True / False",
    short_answer:    "Short Answer",
    essay:           "Essay",
    lab:             "Coding Lab",
    os_linux:        "Terminal Lab",
    os_windows:      "OS — Windows",
    design_lab:      "Design Lab",
    networking_lab:  "Cisco Networking",
  }[question.type] || question.type;

  const typeColor = {
    mcq:        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    multi_select: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    truefalse:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    short_answer: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    essay:      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    lab:        "bg-[#2C2DE0] text-white dark:bg-[#2C2DE0] dark:text-white",
    os_linux:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    design_lab: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  }[question.type] || "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  // Only these two remain unbuilt — Design Lab is now live.
  const DISABLED_TYPES = ["os_windows", "networking_lab"];
  const isDisabled = DISABLED_TYPES.includes(question.type);

  const disabledLabNames = {
    os_windows:     "Windows OS Lab",
    networking_lab: "Cisco Networking Lab",
  };

  return (
    <div className="border rounded-xl mb-3 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-700/50">
        <span className="text-sm font-semibold text-neutral-500">Q{index + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>{typeLabel}</span>

        {question.type === "lab" && (question.allowedLanguages || []).length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {question.allowedLanguages.map(l => {
              const lang = LAB_LANGUAGES.find(x => x.id === l);
              return (
                <span key={l} className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 font-mono">
                  {lang?.icon} {lang?.ext}
                </span>
              );
            })}
          </div>
        )}

        {question.type === "os_linux" && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-medium">
            <Terminal className="w-3 h-3" /> Docker
          </span>
        )}

        {question.image && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300">
            📷 Image attached
          </span>
        )}

        {isDisabled && (
          <Tooltip text="This lab type is not available yet. We're working on it!">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 cursor-default">
              <Lock className="w-3 h-3" /> Coming Soon
            </span>
          </Tooltip>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!isDisabled && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                value={question.marks}
                onChange={e => onUpdate(index, "marks", parseInt(e.target.value) || 1)}
                className="w-14 text-xs border rounded px-1.5 py-1 dark:bg-neutral-700 dark:border-neutral-600 text-center"
              />
              <span className="text-xs text-neutral-400">pts</span>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={() => onRemove(index)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {isDisabled ? (
            <ComingSoonBanner labName={disabledLabNames[question.type]} />
          ) : (
            <>
              {/* Design Lab manages its own question/requirements textarea internally */}
              {question.type !== "design_lab" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Question
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border p-2 rounded-lg text-sm dark:bg-neutral-700 dark:border-neutral-600 resize-y"
                    placeholder="Enter your question..."
                    value={question.question}
                    onChange={e => onUpdate(index, "question", e.target.value)}
                  />
                </div>
              )}

              {question.type === "mcq" && (
                <McqEditor question={question} index={index} onUpdate={onUpdate} onUpdateOption={onUpdateOption} />
              )}

              {question.type === "multi_select" && (
                <MultiSelectEditor question={question} index={index} onUpdate={onUpdate} onUpdateOption={onUpdateOption} />
              )}

              {["mcq", "multi_select", "truefalse", "short_answer", "essay"].includes(question.type) && (
                <ImageUploadField
                  label="Question image (optional)"
                  value={question.image || ""}
                  onChange={(url) => onUpdate(index, "image", url)}
                />
              )}

              {question.type === "truefalse" && (
                <div className="flex gap-4">
                  {[true, false].map(val => (
                    <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${index}`}
                        checked={question.answer === val}
                        onChange={() => onUpdate(index, "answer", val)}
                      />
                      <span className={`text-sm font-medium ${val ? "text-[#2C2DE0]" : "text-red-500"}`}>
                        {val ? "✓ True" : "✗ False"} (correct answer)
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {["short_answer", "essay"].includes(question.type) && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Word limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={question.wordLimit || (question.type === "short_answer" ? 100 : 500)}
                    onChange={e => onUpdate(index, "wordLimit", parseInt(e.target.value) || (question.type === "short_answer" ? 100 : 500))}
                    className="w-32 border p-2 rounded-lg text-sm dark:bg-neutral-700 dark:border-neutral-600"
                  />
                </div>
              )}

              {question.type === "lab" && (
                <LabLanguageSelector question={question} index={index} onUpdate={onUpdate} />
              )}

              {question.type === "os_linux" && (
                <LinuxLabEditor question={question} index={index} onUpdate={onUpdate} />
              )}

              {question.type === "design_lab" && (
                <DesignLabEditor question={question} index={index} onUpdate={onUpdate} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}