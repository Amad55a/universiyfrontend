// frontend/components/labs/LinuxLab.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import axios from "axios";
import "@xterm/xterm/css/xterm.css";

// ─── Task progress panel ─────────────────────────────────────────────────────
function TaskPanel({ tasks, results }) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="border-l border-neutral-800 w-64 shrink-0 bg-neutral-900 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800">
        <p className="text-xs font-semibold text-neutral-300 uppercase tracking-widest">Tasks</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task, i) => {
          const result = results.find(r => r.command === task.command);
          const status = !result ? "pending" : result.passed ? "pass" : "fail";
          return (
            <div
              key={i}
              className={`rounded-lg p-3 text-xs transition-colors ${status === "pass"
                ? "bg-[#2C2DE0]/40 border border-[#2C2DE0]"
                : status === "fail"
                  ? "bg-red-900/30 border border-red-800"
                  : "bg-neutral-800 border border-neutral-700"
                }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {status === "pass" ? "✅" : status === "fail" ? "❌" : "⏳"}
                </span>
                <div className="min-w-0">
                  <p className="text-neutral-200 font-medium leading-snug">
                    {task.description || `Task ${i + 1}`}
                  </p>
                  <p className="text-neutral-500 mt-0.5">
                    {task.points} pt{task.points !== 1 ? "s" : ""}
                  </p>
                  {result && !result.passed && result.output && (
                    <p className="text-red-400 mt-1 font-mono break-all">
                      {result.output.slice(0, 80)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main LinuxLab component ─────────────────────────────────────────────────
export default function LinuxLab({ question, examId: examIdProp, onScoreUpdate, onSessionReady, initialSessionId, readOnly = false }) {
  const examId =
    examIdProp ||
    window.location.pathname.match(/\/exam[s]?\/(\w+)/i)?.[1] ||
    null;

  const termRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const sessionIdRef = useRef(null);
  const inputLineRef = useRef("");

  // ✅ FIX 1: Add a ref that mirrors status.
  // React state updates are async and close over the old value inside the
  // xterm onData callback registered in useEffect. Reading the ref always
  // gives the current value, no matter when the callback fires.
  const statusRef = useRef("connecting");
  const onSessionReadyRef = useRef(onSessionReady);

  const [status, setStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [taskResults, setTaskResults] = useState([]);
  const [validating, setValidating] = useState(false);
  const [restartCount, setRestartCount] = useState(0);

  // Keep ref and state in sync with a single helper
  const updateStatus = (val) => {
    statusRef.current = val;
    setStatus(val);
  };

  useEffect(() => {
    onSessionReadyRef.current = onSessionReady;
  }, [onSessionReady]);

  const questionId = question?._id;
  const validationCommands = useMemo(
    () => question?.validationCommands || [],
    [question?.validationCommands],
  );

  // ─── Initialize terminal + Docker session ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: "#0a0e13",
        foreground: "#d4e6a0",
        cursor: "#7fff7f",
        cursorAccent: "#0a0e13",
        black: "#1a1a2e",
        green: "#7fff7f",
        brightGreen: "#aaff88",
        yellow: "#ffdd88",
        brightWhite: "#ffffff",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();
    terminalRef.current = term;
    fitRef.current = fit;

    const boot = async () => {
      term.writeln("\x1b[32m╔══════════════════════════════════════╗\x1b[0m");
      term.writeln("\x1b[32m║   🐧  Exam Linux Sandbox              ║\x1b[0m");
      term.writeln("\x1b[32m╚══════════════════════════════════════╝\x1b[0m");
      term.writeln("\x1b[33mStarting your isolated container…\x1b[0m\r\n");

      if (!examId) {
        term.writeln("\x1b[31m✗ examId is missing — cannot start container.\x1b[0m");
        term.writeln(
          "\x1b[33mMake sure <LinuxLab examId={exam._id} ... /> is passed from your exam page.\x1b[0m\r\n"
        );
        updateStatus("error");
        return;
      }

      try {
        // ── Reconnect if we already have a live session ─────────────────
        // When the student navigates away and back, the previous sessionId
        // is stored in `answers` and passed as `initialSessionId`. We try
        // a lightweight ping (`echo ok`) before accepting the reconnect so
        // we don't silently use a dead session.
        if (initialSessionId) {
          try {
            const pingRes = await axios.post("/api/labs/terminal/exec", {
              sessionId: initialSessionId,
              command: "echo __ping_ok__",
            });
            if (pingRes.data?.data?.output?.includes("__ping_ok__")) {
              // Container still alive — reconnect
              sessionIdRef.current = initialSessionId;
              onSessionReadyRef.current?.(initialSessionId);
              term.writeln("\x1b[32m● Reconnected to your existing sandbox.\x1b[0m\r\n");
              updateStatus("ready");
              prompt(term);
              return;
            }
          } catch {
            // Container has died — fall through to create a new one
            term.writeln("\x1b[33m⚠ Previous session expired; starting a new container…\x1b[0m");
          }
        }

        const { data } = await axios.post("/api/labs/terminal/start", {
          examId,
          questionId,
        });
        if (!mounted) return;

        sessionIdRef.current = data.data.sessionId;
        onSessionReadyRef.current?.(data.data.sessionId);
        term.writeln(data.data.welcome.replace(/\n/g, "\r\n"));

        if (question?.setupScript?.trim()) {
          term.writeln("\x1b[33m[Setup] Running environment setup…\x1b[0m");
          const setupRes = await axios.post("/api/labs/terminal/exec", {
            sessionId: sessionIdRef.current,
            command: question.setupScript,
          });
          if (setupRes.data.data.output) {
            term.writeln(setupRes.data.data.output.replace(/\n/g, "\r\n"));
          }
          term.writeln("\x1b[32m[Setup] Done.\x1b[0m\r\n");
        }

        // ✅ updateStatus sets both the ref AND React state
        setErrorMsg("");
        updateStatus("ready");
        prompt(term);
      } catch (err) {
        if (!mounted) return;
        const msg = err.response?.data?.message || err.message || "Failed to start container";
        setErrorMsg(msg);
        term.writeln(`\r\n\x1b[31m✗ ${msg}\x1b[0m`);
        updateStatus("error");
      }
    };

    boot();

    // ─── Keyboard input ───────────────────────────────────────────────────
    if (!readOnly) {
      term.onData(async (char) => {
        // ✅ FIX 1: Read statusRef.current — NOT the `status` state variable.
        // `status` is captured once when this callback is registered (always
        // "connecting"), so it would block every keystroke forever. The ref
        // always holds the latest value regardless of when this fires.
        if (statusRef.current !== "ready") return;

        if (char === "\r") {
          const cmd = inputLineRef.current.trim();
          inputLineRef.current = "";
          term.write("\r\n");
          if (!cmd) { prompt(term); return; }

          if (cmd === "clear" || cmd === "cls") { term.clear(); prompt(term); return; }
          if (cmd === "exit") { term.writeln("exit"); return; }

          try {
            const { data } = await axios.post("/api/labs/terminal/exec", {
              sessionId: sessionIdRef.current,
              command: cmd,
            });
            const { output, stdout, stderr, exitCode, cwd, clear } = data.data;
            if (clear) { term.clear(); }
            else {
              if (stdout) term.write(stdout.replace(/\n/g, "\r\n"));
              if (stderr) term.write(`\x1b[31m${stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
              if (!stdout && !stderr && output) term.write(output.replace(/\n/g, "\r\n"));
              if (typeof exitCode === "number" && exitCode !== 0) term.writeln(`\x1b[90m[exit ${exitCode}]\x1b[0m`);
              prompt(term, cwd);
              return;
            }
          } catch (err) {
            const msg = err.response?.data?.message || err.message || "Terminal command failed.";
            setErrorMsg(msg);
            term.writeln(`\x1b[31m${msg}\x1b[0m`);
            if (err.response?.status === 410) updateStatus("error");
          }
          prompt(term);

        } else if (char === "\u007F") {
          if (inputLineRef.current.length > 0) {
            inputLineRef.current = inputLineRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (char.charCodeAt(0) >= 32) {
          inputLineRef.current += char;
          term.write(char);
        }
      });
    }

    const onResize = () => fitRef.current?.fit();
    window.addEventListener("resize", onResize);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(onResize);
    if (termRef.current) resizeObserver?.observe(termRef.current);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      terminalRef.current?.dispose();
    };
  }, [examId, initialSessionId, questionId, question?.setupScript, readOnly, restartCount]);

  // ─── Auto-validate tasks ───────────────────────────────────────────────────
  const runValidation = useCallback(async () => {
    if (
      !validationCommands.length ||
      !sessionIdRef.current ||
      status !== "ready"
    )
      return;
    setValidating(true);

    try {
      const { data } = await axios.post("/api/labs/terminal/validate", {
        sessionId: sessionIdRef.current,
        questionId,
      });
      const { results, totalEarned, totalPossible } = data.data;
      setTaskResults(results || []);
      onScoreUpdate?.(totalEarned, totalPossible);

      const term = terminalRef.current;
      if (term) {
        term.writeln("\r\n\x1b[33m──── Auto-grade Results ────\x1b[0m");
        (results || []).forEach((r, i) => {
          const icon = r.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
          term.writeln(
            `  ${icon} Task ${i + 1}: ${r.passed ? "Passed" : "Failed"} (${r.points}/${validationCommands[i]?.points} pts)`
          );
        });
        term.writeln(`\x1b[33mScore: ${totalEarned}/${totalPossible}\x1b[0m\r\n`);
        prompt(term);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || "Could not validate terminal tasks.");
    } finally {
      setValidating(false);
    }
  }, [validationCommands, onScoreUpdate, status, questionId]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${readOnly ? "" : "-mx-6 -my-6"} h-[520px] flex flex-col bg-[#0a0e13]`}>
      <div className="h-9 bg-neutral-900 flex items-center justify-between px-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-[#2C2DE0]" />
          <span className="ml-3 text-[11px] text-[#2C2DE0] font-mono">
            student@exam-sandbox:~
          </span>
        </div>
        <div className="flex items-center gap-3">
          {validationCommands.length > 0 && !readOnly && (
            <button
              onClick={runValidation}
              disabled={validating || status !== "ready"}
              className="text-[10px] px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {validating ? "Checking…" : "Check Tasks"}
            </button>
          )}
          {status === "error" && !readOnly && (
            <button
              type="button"
              onClick={() => setRestartCount((count) => count + 1)}
              className="text-[10px] rounded bg-amber-700 px-2.5 py-1 font-medium text-white"
            >
              Retry terminal
            </button>
          )}
          <span
            className={`text-[10px] font-mono ${status === "ready"
              ? "text-[#2C2DE0]"
              : status === "error"
                ? "text-red-400"
                : "text-yellow-400"
              }`}
          >
            {status === "ready"
              ? "● Connected"
              : status === "error"
                ? "● Error"
                : "● Connecting…"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div ref={termRef} className="flex-1 p-2 min-w-0" />
        <TaskPanel tasks={validationCommands} results={taskResults} />
      </div>
      {errorMsg && (
        <p role="alert" className="border-t border-red-900 bg-red-950 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function prompt(term, cwd = "/home/student") {
  const displayedCwd = cwd === "/home/student" ? "~" : cwd.startsWith("/home/student/") ? `~/${cwd.slice(14)}` : cwd;
  term.write(
    `\x1b[32mstudent\x1b[0m\x1b[37m@\x1b[0m\x1b[34mexam-sandbox\x1b[0m\x1b[37m:${displayedCwd}$\x1b[0m `
  );
}
