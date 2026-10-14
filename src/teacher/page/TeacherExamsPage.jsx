import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, X, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import QuestionEditor from "../components/Questioneditor";
import QuestionBankPicker from "../components/Questionbankpicker";
import AIQuestionGenerator from "../components/Aiquestiongenerator";
import { useTeacherLanguage } from "../hooks/useLanguages";
import { LINUX_TERMINAL_ENABLED } from "../../config/features";

import "../../styles/examtheme.css";

const QUESTION_DEFAULTS = {
  mcq: { options: ["", "", "", ""], answer: "" },
  multi_select: { options: ["", "", "", ""], answer: [] },
  truefalse: { answer: true },
  short_answer: { wordLimit: 100 },
  essay: { wordLimit: 500 },
  lab: { environment: "vscode", allowedLanguages: ["javascript"], starterCode: {} },
  os_windows: { environment: "windows_emu" },
  os_linux: { environment: "linux_terminal" },
  design_lab: { environment: "figma_or_html", starterCode: "<!-- HTML design template -->" },
  networking_lab: { environment: "cisco_packet_tracer" },
};

const QUESTION_TYPES = [
  { type: "mcq", label: "Add MCQ", variant: "primary" },
  { type: "multi_select", label: "Add Multi-Select", variant: "primary" },
  { type: "truefalse", label: "Add True/False", variant: "primary" },
  { type: "short_answer", label: "Add Short Answer", variant: "primary" },
  { type: "essay", label: "Add Essay", variant: "primary" },
  { type: "lab", label: "Add Code Lab", variant: "neutral" },
  { type: "os_windows", label: "Add OS Windows", variant: "neutral" },
  { type: "design_lab", label: "Add Design Lab", variant: "neutral" },
  { type: "networking_lab", label: "Add Cisco Lab", variant: "neutral" },
];

const DEFAULT_EXAM_FORM = {
  title: "",
  instructions: "",
  classId: "",
  availableFrom: "",
  availableUntil: "",
  timeLimit: 60,
  status: "draft",
  security: {},
  questions: [],
};

export default function TeacherExamsPage() {
  const { t } = useTeacherLanguage();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  const [examForm, setExamForm] = useState(DEFAULT_EXAM_FORM);

  const fetchExams = async () => {
    try {
      const { data } = await axios.get("/api/exams/teacher");
      setExams(data.data.exams);
    } catch {
      toast.error("Failed to load exams");
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await axios.get("/api/teacher/classes");
      setClasses(data.data.classes);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const addQuestion = type => {
    if (type === "os_linux" && !LINUX_TERMINAL_ENABLED) {
      toast.error("Linux Terminal activities are temporarily unavailable.");
      return;
    }
    setExamForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { id: Date.now().toString(), type, question: "", marks: 1, ...(QUESTION_DEFAULTS[type] || {}) },
      ],
    }));
  };

  // Called by the Question Bank picker (selected items). Kept generic so it
  // can be reused for any other bulk-add source in the future.
  const addQuestionsFromBank = newQuestions => {
    if (!LINUX_TERMINAL_ENABLED && newQuestions.some(question => question.type === "os_linux")) {
      toast.error("Linux Terminal activities are temporarily unavailable.");
      return;
    }
    setExamForm(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
  };

  const removeQuestion = index => {
    setExamForm(prev => {
      const q = [...prev.questions];
      q.splice(index, 1);
      return { ...prev, questions: q };
    });
  };

  const updateQuestion = (index, field, value) => {
    setExamForm(prev => {
      const q = [...prev.questions];
      q[index] = { ...q[index], [field]: value };
      return { ...prev, questions: q };
    });
  };

  const updateMcqOption = (qIndex, optIndex, value) => {
    setExamForm(prev => {
      const q = [...prev.questions];
      const options = [...q[qIndex].options];
      options[optIndex] = value;
      q[qIndex] = { ...q[qIndex], options };
      return { ...prev, questions: q };
    });
  };

  const saveExam = async statusOverride => {
    const finalStatus = statusOverride || examForm.status;

    if (!examForm.title || !examForm.classId || !examForm.availableFrom || !examForm.availableUntil) {
      toast.error("Please fill all required exam details.");
      return;
    }

    if (!examForm.timeLimit || examForm.timeLimit <= 0) {
      toast.error("Time Limit must be greater than 0.");
      return;
    }

    // Validation Rules: Available From must be earlier than Available Until.
    const fromLocal = new Date(examForm.availableFrom);
    const untilLocal = new Date(examForm.availableUntil);
    if (untilLocal <= fromLocal) {
      toast.error("Available Until must be after Available From.");
      return;
    }

    if (examForm.questions.length === 0) {
      toast.error("Please add at least one question to the exam.");
      return;
    }
    if (!LINUX_TERMINAL_ENABLED && examForm.questions.some(question => question.type === "os_linux")) {
      toast.error("Linux Terminal activities are temporarily unavailable.");
      return;
    }

    for (let i = 0; i < examForm.questions.length; i++) {
      const q = examForm.questions[i];
      if (!q.question || q.question.trim() === "") {
        toast.error(`Question ${i + 1}: Please enter the question text.`);
        return;
      }
      if (q.marks <= 0) {
        toast.error(`Question ${i + 1}: Marks must be greater than 0.`);
        return;
      }
      if (q.type === "mcq" && (!q.options || q.options.some(o => !o || o.trim() === ""))) {
        toast.error(`Question ${i + 1}: All MCQ options must be filled.`);
        return;
      }
      if (q.type === "mcq" && (!q.answer || q.answer.trim() === "")) {
        toast.error(`Question ${i + 1}: Please select the correct answer for this MCQ.`);
        return;
      }
    }

    // Convert local datetime-local values to ISO strings with timezone info
    const convertLocalToISO = (datetimeLocalStr) => {
      if (!datetimeLocalStr) return null;
      // datetime-local format: "2026-07-20T09:00" represents local time
      const [datePart, timePart] = datetimeLocalStr.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hours, minutes] = (timePart || "00:00").split(":").map(Number);
      const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return date.toISOString();
    };

    const payload = {
      ...examForm,
      availableFrom: convertLocalToISO(examForm.availableFrom),
      availableUntil: convertLocalToISO(examForm.availableUntil),
      timeLimit: Number(examForm.timeLimit),
      status: finalStatus,
    };

    try {
      await axios.post("/api/exams/teacher", payload);
      toast.success("Exam created successfully!");
      setIsBuilding(false);
      setExamForm(DEFAULT_EXAM_FORM);
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create exam");
    }
  };

  const publishExam = async examId => {
    try {
      await axios.put(`/api/exams/teacher/${examId}/publish`);
      toast.success("Exam published successfully!");
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish exam");
    }
  };

  const alreadyAddedBankIds = examForm.questions
    .map(q => q.sourceQuestionId)
    .filter(Boolean);

  if (isBuilding) {
    return (
      <div className="exam-root p-6 bg-neutral-50 min-h-screen dark:bg-neutral-900 text-neutral-900 dark:text-white">
        <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h1 className="font-display text-2xl font-semibold">Create new exam</h1>
            <button onClick={() => setIsBuilding(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1">Exam title</label>
              <input type="text" className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="Midterm Exam" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Student instructions (optional)</label>
              <textarea
                className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                value={examForm.instructions}
                onChange={e => setExamForm({ ...examForm, instructions: e.target.value })}
                maxLength={10000}
                rows={3}
                placeholder="Instructions students should read before starting."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600" value={examForm.classId} onChange={e => setExamForm({ ...examForm, classId: e.target.value })}>
                <option value="">Select a class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.course?.title || c.classCode}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
              <input
                type="number"
                min={1}
                className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                value={examForm.timeLimit}
                onChange={e => setExamForm({ ...examForm, timeLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-neutral-400 mt-1">
                Starts individually for each student when they begin the exam.
              </p>
            </div>
          </div>

          {/* Exam Availability */}
          <div className="mb-8 border-t pt-6 dark:border-neutral-700">
            <h2 className="font-display text-lg font-semibold mb-1">Exam availability</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Students can't enter before "Available From" or after "Available Until". A student's personal
              deadline is <code className="font-mono">min(start time + time limit, available until)</code>.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Available From</label>
                <input
                  type="datetime-local"
                  className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                  value={examForm.availableFrom}
                  onChange={e => setExamForm({ ...examForm, availableFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Available Until</label>
                <input
                  type="datetime-local"
                  className="w-full border p-2 rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                  value={examForm.availableUntil}
                  onChange={e => setExamForm({ ...examForm, availableUntil: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="mb-8 border-t pt-6 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="font-display text-lg font-semibold">Questions</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowAiGenerator(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
                >
                  <Sparkles className="w-4 h-4" /> AI Generate
                </button>
                <button
                  onClick={() => setShowBankPicker(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  <BookOpen className="w-4 h-4" /> Add from Question Bank
                </button>
              </div>
            </div>

            {examForm.questions.map((q, idx) => (
              <QuestionEditor
                key={q.id || idx}
                question={q}
                index={idx}
                onRemove={removeQuestion}
                onUpdate={updateQuestion}
                onUpdateOption={updateMcqOption}
              />
            ))}

            <div className="flex gap-2 mt-4 flex-wrap">
              {QUESTION_TYPES.map(({ type, label, variant }) => (
                <button
                  key={type}
                  onClick={() => addQuestion(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variant === "primary"
                    ? "bg-[#2C2DE0] text-white hover:bg-[#2C2DE0] dark:bg-[#2C2DE0] dark:text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-6 dark:border-neutral-700">
            <button onClick={() => saveExam("active")} className="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400">
              Save & publish
            </button>
            <button onClick={() => saveExam("draft")} className="bg-[#2C2DE0] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2C2DE0]">
              Save exam
            </button>
          </div>
        </div>

        {showBankPicker && (
          <QuestionBankPicker
            onClose={() => setShowBankPicker(false)}
            onAddQuestions={addQuestionsFromBank}
            alreadyAddedIds={alreadyAddedBankIds}
          />
        )}

        {showAiGenerator && (
          <AIQuestionGenerator
            onClose={() => setShowAiGenerator(false)}
            onSaved={() => setShowBankPicker(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="exam-root p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-900 dark:text-white">
            {t?.exam?.exams || "Exams"}
          </h1>
          <p className="text-neutral-500 text-sm">{t?.exam?.manageExams || "Create and manage your university exams."}</p>
        </div>
        <button onClick={() => setIsBuilding(true)} className="bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t?.exam?.newExam || "New exam"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <div key={exam._id} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-display font-semibold text-lg dark:text-white">{exam.title}</h3>
            </div>
            <p className="text-sm text-neutral-500 mb-4">{exam.classId?.classCode || "Class"} • {exam.questions.length} questions</p>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Token</span>
                <span className="font-mono bg-neutral-100 dark:bg-neutral-700 px-2 rounded text-[#2C2DE0] dark:text-[#2C2DE0]">{exam.token}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Time limit</span>
                <span className="dark:text-neutral-300">{exam.timeLimit} mins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Status</span>
                <span className={`px-2 rounded-full text-xs font-medium ${exam.status === "active" ? "bg-[#2C2DE0] text-white" : "bg-gray-100 text-gray-700"}`}>
                  {exam.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto pt-4 flex-wrap">
              <Link to={`/teacher/submissions?examId=${exam._id}`} className="flex-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 py-2 rounded-lg font-medium text-sm transition-colors text-center inline-block leading-loose">
                {t?.exam?.viewSubmissions || "View submissions"}
              </Link>
              {exam.status === "draft" && (
                <button onClick={() => publishExam(exam._id)} className="flex-1 bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white py-2 rounded-lg font-medium text-sm transition-colors">
                  {t?.exam?.publish || "Publish"}
                </button>
              )}
            </div>
          </div>
        ))}
        {exams.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-500">
            No exams created yet. Click "New exam" to get started.
          </div>
        )}
      </div>
    </div>
  );
}