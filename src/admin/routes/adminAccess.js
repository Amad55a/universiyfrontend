export const LIBRARIAN_HOME = "/admin/library";

export const LIBRARIAN_ALLOWED_PATHS = new Set([
  LIBRARIAN_HOME,
  "/admin/reservations",
  "/admin/books",
  "/admin/books/borrowing",
  "/admin/books/returns",
  "/admin/seats",
  "/admin/qr-checkin",
  "/admin/library/students",
  "/admin/profile",
]);

export const canLibrarianAccessPath = (pathname) =>
  LIBRARIAN_ALLOWED_PATHS.has(pathname) ||
  /^\/admin\/seats\/[a-f\d]{24}\/timeline$/i.test(pathname) ||
  pathname.startsWith("/community/");
