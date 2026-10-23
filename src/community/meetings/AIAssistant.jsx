import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, RefreshCw, Zap } from "lucide-react";
import api from "@/api/client";
import InteractiveQuiz from "./InteractiveQuiz";

const QUICK_ACTIONS = [
  { id: "summarize", label: "📝 Summarize Meeting", prompt: "Please summarize the key points discussed in this class meeting so far. Be concise and use bullet points." },
  { id: "notes", label: "📋 Generate Notes", prompt: "Generate well-structured class notes based on a university computer science lecture. Include headings, key concepts, and examples." },
  { id: "explain", label: "💡 Explain Last Topic", prompt: "Explain the last topic discussed in this lecture in simple terms that are easy for students to understand." },
  { id: "translate", label: "🌐 Translate Summary", prompt: "Translate the meeting summary into Arabic for students who prefer Arabic." },
  { id: "quiz", label: "🎯 Create Quick Quiz" },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-900/15 rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-white dark:bg-gray-900/80 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isAi = msg.role === "ai";
  return (
    <div className={`flex gap-2 ${isAi ? "flex-row" : "flex-row-reverse"}`}>
      {isAi && (
        <div className="w-6 h-6 rounded-full bg-[#2C2DE0] flex items-center justify-center shrink-0 self-end">
          <Sparkles size={11} className="text-black" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap font-medium
          ${isAi
            ? "bg-[#2C2DE0]/15 border border-[#2C2DE0]/40 text-white/95 rounded-bl-sm"
            : "bg-[#2C2DE0] text-black font-semibold rounded-br-sm shadow-md"
          }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export function AIAssistant({ meetingTitle, course }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: `Hello! I'm your UniCore AI Co-pilot 🤖\n\nI'm here to help with **${meetingTitle || "this class"}**. I can summarize meetings, generate notes, create quizzes, or answer academic questions.\n\nWhat do you need?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizSource, setQuizSource] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (typeof chatEndRef.current?.scrollIntoView === "function") {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  const sendMessage = async (userText) => {
    const text = (userText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }));

      const { data } = await api.post("/ai/chat", {
        messages: history,
        systemPrompt: `You are an academic AI assistant integrated into UniCore — a university digital ecosystem. You are helping students and lecturers during a live class meeting.
Meeting: "${meetingTitle ?? "Class Meeting"}"
Course: "${course ?? "University Course"}"

Be concise, friendly, and academically accurate. Format responses with markdown when helpful.`,
      });

      setMessages((prev) => [...prev, { role: "ai", content: data.reply ?? "No response generated." }]);
    } catch (err) {
      const msg = err?.response?.data?.message ?? "AI service unavailable. Please check that GEMINI_API_KEY is configured on the backend.";
      setMessages((prev) => [...prev, { role: "ai", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    const sourceContent = quizSource.trim();
    if (sourceContent.length < 30 || quizLoading) return;
    setQuizError("");
    setQuizLoading(true);
    try {
      const { data } = await api.post("/ai/quiz/generate", {
        sourceContent,
        meetingTitle,
        course,
      });
      const validQuestions = Array.isArray(data?.questions)
        && data.questions.length === 5
        && data.questions.every((question) =>
          typeof question.id === "string"
          && typeof question.question === "string"
          && question.question.trim()
          && Array.isArray(question.options)
          && question.options.length === 4
          && question.options.every((option) => typeof option === "string" && option.trim())
          && !Object.hasOwn(question, "correctIndex")
          && !Object.hasOwn(question, "explanation")
        );
      if (!data?.quizId || data.pointsPerQuestion !== 3 || !validQuestions) {
        throw new Error("The quiz service returned an invalid quiz. Please retry.");
      }
      setActiveQuiz(data);
      setQuizMode(false);
    } catch (err) {
      setQuizError(err?.response?.data?.message ?? err.message ?? "Quiz generation failed. Please retry.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action.id === "quiz") {
      setQuizMode(true);
      setQuizSource("");
      setQuizError("");
      setActiveQuiz(null);
      return;
    }
    sendMessage(action.prompt);
  };

  const clearChat = () => {
    setMessages([{
      role: "ai",
      content: "Chat cleared! Ask me anything about this class.",
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-black dark:bg-black text-white dark:text-white rounded-lg m-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-black/90">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#2C2DE0] flex items-center justify-center">
            <Sparkles size={13} className="text-black" />
          </div>
          <div><p className="text-white text-xs font-bold">Unicore Ai</p></div>
          {activeQuiz && (
            <button
              type="button"
              onClick={() => { setActiveQuiz(null); setQuizMode(false); }}
              className="ml-2 rounded-md border border-white/20 px-2 py-1 text-[10px] text-white/70 hover:text-white"
            >
              Back to assistant
            </button>
          )}
        </div>
        <button
          onClick={clearChat}
          title="Clear chat"
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {!activeQuiz && !quizMode && <div className="p-2 border-b border-white/10 shrink-0 bg-black/80">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Quick actions</p>
        <div className="grid grid-cols-1 gap-1">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleQuickAction(a)}
              disabled={loading || quizLoading}
              className="text-left px-2.5 py-1.5 rounded-xl bg-[#2C2DE0]/10 hover:bg-[#2C2DE0]/20 border border-[#2C2DE0]/30 text-white/80 hover:text-white text-[11px] font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Zap size={10} className="text-[#2C2DE0] shrink-0" />
              {a.label}
            </button>
          ))}
        </div>
      </div>}

      {/* Messages */}
      {activeQuiz ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <InteractiveQuiz
            quiz={activeQuiz}
            onCreateAnother={() => {
              setActiveQuiz(null);
              setQuizSource("");
              setQuizError("");
              setQuizMode(true);
            }}
          />
        </div>
      ) : quizMode ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <form
            className="flex flex-col gap-3 rounded-xl border border-white/15 bg-gray-950 p-4 text-white"
            onSubmit={(event) => { event.preventDefault(); generateQuiz(); }}
          >
            <div>
              <h3 className="text-sm font-bold">Create a quiz from class material</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Paste lecture notes or meeting material. Questions are grounded only in the text you provide.
                {course ? ` Course: ${course}.` : ""}{meetingTitle ? ` Meeting: ${meetingTitle}.` : ""}
              </p>
            </div>
            <textarea
              value={quizSource}
              onChange={(event) => setQuizSource(event.target.value.slice(0, 12000))}
              rows={8}
              maxLength={12000}
              placeholder="Paste at least 30 characters of notes or source material…"
              aria-label="Quiz source material"
              disabled={quizLoading}
              className="w-full resize-y rounded-lg border border-white/20 bg-gray-900 p-3 text-xs leading-relaxed text-white placeholder:text-white/40 focus:border-[#2C2DE0] focus:outline-none"
            />
            <p className="text-right text-[10px] text-white/45">{quizSource.trim().length}/12000</p>
            {quizError && <p role="alert" className="text-xs text-red-300">{quizError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setQuizMode(false); setQuizError(""); }}
                disabled={quizLoading}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/75 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quizLoading || quizSource.trim().length < 30}
                className="ml-auto rounded-lg bg-[#2C2DE0] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {quizLoading ? "Generating…" : quizError ? "Retry generation" : "Generate quiz"}
              </button>
            </div>
          </form>
        </div>
      ) : (
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-black">
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-[#2C2DE0] flex items-center justify-center shrink-0">
              <Sparkles size={11} className="text-black" />
            </div>
            <TypingDots />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      )}

      {/* Input */}
      {!activeQuiz && !quizMode && <div className="p-3 border-t border-white/10 shrink-0 flex gap-2 bg-black/90">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask anything about this class…"
          disabled={loading}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-900 border border-white/20 text-white text-xs placeholder:text-white/40 caret-white focus:outline-none focus:ring-1 focus:ring-[#2C2DE0] focus:border-[#2C2DE0] disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-xl bg-[#2C2DE0] text-white font-bold disabled:opacity-40 hover:bg-[#3A3BE8] transition-colors shadow-lg"
        >
          <Send size={14} />
        </button>
      </div>}
    </div>
  );
}
