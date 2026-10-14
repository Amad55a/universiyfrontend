import React from "react";

function decodeHtmlEntitiesOnce(source) {
  return source
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function decodeLegacyHtmlSource(source, allowLegacyFragment = false) {
  if (
    typeof source !== "string" ||
    (
      !/^(?:<!-- HTML -->\s*)?&lt;!doctype\s+html\b/i.test(source.trim()) &&
      !(allowLegacyFragment && /&lt;\/?[a-z][^&]*?&gt;/i.test(source))
    )
  ) {
    return source;
  }
  return decodeHtmlEntitiesOnce(source);
}

function decodeLegacyLabSource(source, answerType) {
  if (answerType === "labhtml") return decodeLegacyHtmlSource(source, true);
  if (answerType === "lab" && typeof source === "string" && /&(?:lt|gt|quot|#0*39|apos);/i.test(source)) {
    return decodeHtmlEntitiesOnce(source);
  }
  return decodeLegacyHtmlSource(source);
}

export function extractSubmittedCodeFiles(answer, answerType) {
  if (typeof answer === "string") {
    const isHtml = /^\s*(?:<!doctype\s+html|&lt;!doctype\s+html)/i.test(answer);
    return [{
      filename: isHtml ? "index.html" : "Submitted source",
      source: decodeLegacyLabSource(answer, answerType),
    }];
  }
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return [];

  const sources = new Map();
  const filenameFor = (language) => {
    const normalized = String(language || "").trim();
    const lower = normalized.toLowerCase();
    if (/\.(html?|css|m?js|py|c|h|cpp|hpp|cs|sql|json|xml|svg|md|txt)$/i.test(normalized)) {
      return normalized.replace(/^\.\//, "");
    }
    const filename = ({
      html: "index.html",
      css: "style.css",
      js: "main.js",
      javascript: "main.js",
      python: "main.py",
      c: "main.c",
      cpp: "main.cpp",
      csharp: "main.cs",
      sql: "query.sql",
    })[lower];
    return filename || `main.${lower || "txt"}`;
  };
  const sourceOf = (file) => typeof file === "string"
    ? file
    : file && typeof file === "object"
      ? file.content ?? file.source ?? file.code ?? file.text
      : undefined;
  const addSource = (name, file) => {
    const source = sourceOf(file);
    if (typeof source !== "string") return;
    const filename = filenameFor(file?.filename || file?.name || file?.path || name);
    sources.set(filename, source);
  };

  if (answer.codes && typeof answer.codes === "object" && !Array.isArray(answer.codes)) {
    Object.entries(answer.codes).forEach(([name, file]) => addSource(name, file));
  } else if (Array.isArray(answer.codes)) {
    answer.codes.forEach((file, index) => {
      if (typeof file === "string") {
        addSource(`submitted-${index + 1}.txt`, file);
      } else {
        addSource(
          file?.filename || file?.name || file?.path || file?.language || file?.lang || `submitted-${index + 1}.txt`,
          file,
        );
      }
    });
  }
  for (const language of ["html", "css", "javascript", "js"]) {
    if (Object.hasOwn(answer, language)) addSource(language, answer[language]);
  }
  if (Array.isArray(answer.files)) {
    answer.files.forEach((file) => {
      if (!file || typeof file !== "object") return;
      addSource(file.filename || file.name || file.path || file.language || file.lang || "code", file);
    });
  }

  const selectedLanguage = answer.langId || answer.language;
  if (typeof answer.code === "string" && answer.code.length > 0) {
    if (selectedLanguage) {
      const extension = ({
        html: ".html",
        css: ".css",
        js: ".js",
        javascript: ".js",
        python: ".py",
        c: ".c",
        cpp: ".cpp",
        csharp: ".cs",
        sql: ".sql",
      })[String(selectedLanguage).toLowerCase()];
      const existingFile = extension && [...sources.keys()].find((filename) =>
        filename.toLowerCase().endsWith(extension)
      );
      sources.set(existingFile || filenameFor(selectedLanguage), answer.code);
    } else if (!sources.size) {
      addSource(selectedLanguage || "code", answer.code);
    }
  }

  const orderedFilenames = ["index.html", "style.css", "main.js"];
  return [...sources.entries()]
    .sort(([filenameA], [filenameB]) => {
      const orderA = orderedFilenames.indexOf(filenameA);
      const orderB = orderedFilenames.indexOf(filenameB);
      if (orderA >= 0 || orderB >= 0) {
        return (orderA < 0 ? Number.MAX_SAFE_INTEGER : orderA) -
          (orderB < 0 ? Number.MAX_SAFE_INTEGER : orderB);
      }
      return filenameA.localeCompare(filenameB);
    })
    .map(([filename, source]) => ({
      filename,
      source: decodeLegacyLabSource(source, answerType),
    }));
}

export default function SubmittedCodeFiles({ answer, answerType }) {
  const files = extractSubmittedCodeFiles(answer, answerType);
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm font-mono text-zinc-400">
        (no source submitted)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map(({ filename, source }) => (
        <section key={filename} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400">
            <span>📄 {filename}</span>
            <span className="text-[10px] uppercase text-emerald-400 font-bold">
              {filename.match(/\.html?$/i) ? "HTML" :
                filename.match(/\.css$/i) ? "CSS" :
                  filename.match(/\.m?js$/i) ? "JavaScript" : "Source code"}
            </span>
          </div>
          <pre className="p-4 text-sm font-mono text-emerald-400 bg-zinc-950 overflow-auto max-h-96 leading-relaxed whitespace-pre">
            {source || "(empty file)"}
          </pre>
        </section>
      ))}
    </div>
  );
}
