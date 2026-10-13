import { useEffect, useRef, useState, useCallback, useMemo } from "react";

/**
 * useExamSecurity
 * ----------------
 * Centralizes every anti-cheating signal for a live exam session.
 *
 * Important honesty note, because this matters for an exam product:
 * a browser tab cannot lock down a device the way native proctoring
 * software (e.g. LockDown Browser) does. JavaScript cannot block Alt+Tab,
 * stop a second physical device or phone camera, or guarantee a student
 * isn't getting help off-screen. What this hook DOES do is maximize what's
 * actually feasible from inside a browser tab, and report every signal to
 * the server in real time so a human can review the log afterward:
 *
 *  - enforce + monitor fullscreen
 *  - detect tab-switch / window-blur
 *  - block copy/cut/paste/right-click and common shortcuts (Ctrl+C/V/U/S, F12, devtools combos)
 *  - flag a likely devtools-open state (window size heuristic — not 100% reliable in every browser)
 *  - detect the exam being opened in a second tab/window (BroadcastChannel)
 *  - warn before the tab is closed/refreshed
 *
 * Treat violations as evidence for review, not as cryptographic proof of cheating.
 */
export default function useExamSecurity({
  enabled,
  rules = {},
  onViolation,
  maxViolations = 3,
  onMaxViolations,
} = {}) {
  const [violations, setViolations] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lockedRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  // Stable session identifier for watermark — generated once per hook mount
  const sessionId = useMemo(() => Math.random().toString(36).slice(2, 8).toUpperCase(), []);

  const report = useCallback(
    (type, detail) => {
      if (lockedRef.current || rules.recordViolations === false) return;
      const entry = { type, detail, timestamp: Date.now() };
      setViolations(prev => {
        const next = [...prev, entry];
        if (next.length >= maxViolations) {
          lockedRef.current = true;
          onMaxViolations?.(next);
        }
        return next;
      });
      onViolation?.(entry);
    },
    [onViolation, onMaxViolations, maxViolations, rules.recordViolations]
  );

  // Fullscreen must be requested by a user gesture in browsers such as Chrome.
  useEffect(() => {
    if (!enabled) return;

    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (wasFullscreenRef.current && !fs && rules.fullscreenRequired) {
        report("exit_fullscreen", "Exited browser fullscreen mode");
      }
      wasFullscreenRef.current = fs;
    };

    setIsFullscreen(Boolean(document.fullscreenElement));
    wasFullscreenRef.current = Boolean(document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [enabled, rules.fullscreenRequired, report]);

  // Tab visibility + window focus
  useEffect(() => {
    if (!enabled || !rules.preventTabSwitch) return;

    const onVisibility = () => {
      if (document.hidden) report("tab_switch", "Tab lost visibility");
    };
    const onBlur = () => report("window_blur", "Browser window lost focus");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, rules.preventTabSwitch, report]);

  // Clipboard + risky shortcuts
  useEffect(() => {
    if (!enabled || !rules.blockClipboard) return;

    const blockEvent = e => {
      e.preventDefault();
      report("clipboard_blocked", e.type);
    };

    const onKeyDown = e => {
      const key = e.key?.toLowerCase();
      const isCopyPasteShortcut = (e.ctrlKey || e.metaKey) && ["c", "v", "x", "u", "s", "p"].includes(key);
      const isDevtoolsShortcut =
        e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key));

      if (isCopyPasteShortcut || isDevtoolsShortcut) {
        e.preventDefault();
        report("shortcut_blocked", e.key);
      }
    };

    document.addEventListener("copy", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, rules.blockClipboard, report]);

  // ── Print prevention ──────────────────────────────────────────────────────
  // 1. Inject a <style> that makes the entire page blank when printing.
  //    Even if JS is disabled mid-session this CSS still applies.
  // 2. The beforeprint event fires before the print dialog opens; we cancel
  //    it and log the attempt as a violation.
  useEffect(() => {
    if (!enabled) return;

    const styleEl = document.createElement("style");
    styleEl.id = "exam-no-print";
    styleEl.textContent = "@media print { body { display:none !important; } }";
    document.head.appendChild(styleEl);

    const onBeforePrint = (e) => {
      e.preventDefault();
      report("print_attempt", "Student attempted to print");
    };

    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      document.getElementById("exam-no-print")?.remove();
    };
  }, [enabled, report]);

  // ── Disable text selection on question text (not inside editors) ──────────
  // We target elements with the CSS class `.exam-no-select`. Code editors
  // do NOT get this class so clipboard works normally inside them.
  useEffect(() => {
    if (!enabled) return;
    const styleEl = document.createElement("style");
    styleEl.id = "exam-no-select";
    styleEl.textContent = ".exam-no-select { user-select: none; -webkit-user-select: none; }";
    document.head.appendChild(styleEl);
    return () => document.getElementById("exam-no-select")?.remove();
  }, [enabled]);

  // Best-effort devtools heuristic — a wide gap between outer and inner window
  // size usually means a docked devtools panel is open. Not foolproof (some
  // browsers/extensions affect this), so it's a signal, not a verdict.
  useEffect(() => {
    if (!enabled || !rules.detectDevtools) return;

    const THRESHOLD = 160;
    const check = () => {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      if (widthDelta > THRESHOLD || heightDelta > THRESHOLD) {
        report("devtools_suspected", `${widthDelta}x${heightDelta}`);
      }
    };

    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [enabled, rules.detectDevtools, report]);

  // Duplicate tab/window detection
  useEffect(() => {
    if (!enabled || !rules.preventDuplicateTabs || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("exam-session-lock");
    channel.postMessage({ type: "open" });

    const onMessage = e => {
      if (e.data?.type === "open") {
        report("duplicate_tab", "Exam was opened in another tab or window");
        channel.postMessage({ type: "ack" });
      }
    };

    channel.addEventListener("message", onMessage);
    return () => channel.close();
  }, [enabled, rules.preventDuplicateTabs, report]);

  // Warn before closing/refreshing the tab
  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = e => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  return { violations, isFullscreen, violationCount: violations.length, sessionId };
}