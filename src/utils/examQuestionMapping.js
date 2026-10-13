// examQuestionMapping.js
//
// The Question Bank and the Exam builder use two different question "shapes":
//
//   Question Bank types:  mcq, multi_select, truefalse, essay, short_answer, programming, sql, html_css_js
//   Exam question types:  mcq, multi_select, truefalse, short_answer, essay, lab, os_linux, os_windows, design_lab, networking_lab
//
// This file converts a bank question into whatever shape the exam builder
// (TeacherExamsPage + QuestionEditor) expects, so "Add to Exam" from the
// Question Bank picker always produces a valid exam question.

const STARTER_CODE_BY_LANG = {
  python:     "def solution():\n    # Write your solution here\n    pass\n\nprint(solution())",
  javascript: "function solution() {\n    \n}\n\nconsole.log(solution());",
  html:       "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
  css:        "body {\n  font-family: sans-serif;\n}\n",
  sql:        "-- Write your SQL query here\nSELECT * FROM table_name;",
};

export function mapBankQuestionToExamQuestion(bankQuestion) {
  const base = {
    id: `bank_${bankQuestion._id}_${Date.now()}`,
    sourceQuestionId: bankQuestion._id, // kept so we can call mark-used after adding
    question: bankQuestion.question,
    marks: bankQuestion.marks || 1,
    image: bankQuestion.image,
  };

  switch (bankQuestion.type) {
    case "mcq":
      return {
        ...base,
        type: "mcq",
        options: bankQuestion.options?.length ? bankQuestion.options : ["", "", "", ""],
        answer: bankQuestion.answer || "",
      };

    case "multi_select":
      return {
        ...base,
        type: "multi_select",
        options: bankQuestion.options?.length ? bankQuestion.options : ["", "", "", ""],
        answer: Array.isArray(bankQuestion.answer) ? bankQuestion.answer : [],
      };

    case "truefalse":
      return {
        ...base,
        type: "truefalse",
        answer: bankQuestion.answer === true || bankQuestion.answer === "true",
      };

    case "essay":
      return {
        ...base,
        type: "essay",
        wordLimit: bankQuestion.wordLimit || 500,
      };

    case "short_answer":
      return {
        ...base,
        type: "short_answer",
        wordLimit: bankQuestion.wordLimit || 100,
      };

    case "programming": {
      // Question bank uses programmingLanguage / allowedLanguages — not `language`.
      const fromAllowed = Array.isArray(bankQuestion.allowedLanguages)
        ? bankQuestion.allowedLanguages[0]
        : null;
      const lang = (
        bankQuestion.programmingLanguage ||
        bankQuestion.language ||
        fromAllowed ||
        "javascript"
      ).toLowerCase();
      const starter =
        (typeof bankQuestion.starterCode === "object" && bankQuestion.starterCode?.[lang]) ||
        (typeof bankQuestion.starterCode === "string" ? bankQuestion.starterCode : null) ||
        STARTER_CODE_BY_LANG[lang] ||
        "";
      return {
        ...base,
        type: "lab",
        environment: "vscode",
        allowedLanguages: bankQuestion.allowedLanguages?.length
          ? bankQuestion.allowedLanguages.map((l) => String(l).toLowerCase())
          : [lang],
        starterCode: { [lang]: starter },
        testCases: bankQuestion.testCases || [],
      };
    }

    case "sql":
      return {
        ...base,
        type: "lab",
        environment: "vscode",
        allowedLanguages: ["sql"],
        starterCode: { sql: bankQuestion.starterCode || STARTER_CODE_BY_LANG.sql },
        sqlSchema: bankQuestion.sqlSchema || "",
      };

    case "html_css_js": {
      const langs = ["html", "css", "javascript"];
      const starterCode = {};
      langs.forEach(l => { starterCode[l] = STARTER_CODE_BY_LANG[l]; });
      return {
        ...base,
        type: "lab",
        environment: "vscode",
        allowedLanguages: langs,
        starterCode,
      };
    }

    default:
      // Unknown bank type — fall back to essay rather than dropping it silently.
      return { ...base, type: "essay", wordLimit: 500 };
  }
}

export function mapBankQuestionsToExamQuestions(bankQuestions) {
  return bankQuestions.map(mapBankQuestionToExamQuestion);
}