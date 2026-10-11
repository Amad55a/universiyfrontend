export const getBookReadUrl = (bookId, apiBaseUrl = "/api/v1") => {
  if (typeof bookId !== "string") return null;

  const normalizedBookId = bookId.trim();
  if (!normalizedBookId || ["undefined", "null"].includes(normalizedBookId)) return null;

  return `${String(apiBaseUrl).replace(/\/+$/u, "")}/books/${encodeURIComponent(normalizedBookId)}/read`;
};

export const shouldRefreshBookPdfSession = (error, attempt) =>
  error?.status === 401 && attempt === 0;
