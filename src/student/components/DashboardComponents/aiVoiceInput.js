export const mergeVoiceTranscript = (existingText, transcript) => {
  const spokenText = String(transcript || "").trim();
  if (!spokenText) return existingText;
  const existing = String(existingText || "");
  if (!existing.trim()) return spokenText;
  return `${existing}${/\s$/u.test(existing) ? "" : " "}${spokenText}`;
};
