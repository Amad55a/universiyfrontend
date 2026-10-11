export const getBookReadUrl = (bookId, apiBaseUrl = "/api/v1") =>
  `${String(apiBaseUrl).replace(/\/+$/u, "")}/books/${encodeURIComponent(bookId)}/read`;
