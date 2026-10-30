// ⚠️ Adjust this import path to wherever you saved the axios instance you
// just shared (e.g. "@/lib/axios", "@/api/axios", "./axios" — whatever it
// actually is in your project). It's a default export named `api`, so we
// alias it to `adminApi` here since every function below already calls it
// that.
import api from "./client";

const ADMIN_BASE = "/admin";

const buildParams = ({ page = 1, limit = 10, search = "", ...filters } = {}) => ({
  page,
  limit,
  ...(search ? { search } : {}),
  ...Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  ),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const fetchAdminUsers = (params) =>
  api.get(`${ADMIN_BASE}/users`, { params: buildParams(params) });

export const fetchAdminGroups = (params) =>
  api.get(`${ADMIN_BASE}/groups`, { params: buildParams(params) });

export const synchronizeAdminGroups = () =>
  api.post(`${ADMIN_BASE}/groups/sync`);

export const fetchAdminUser = (id) =>
  api.get(`${ADMIN_BASE}/users/${id}`);

export const createAdminUser = (data) =>
  api.post(`${ADMIN_BASE}/users`, data);

export const updateAdminUser = (id, data) =>
  api.put(`${ADMIN_BASE}/users/${id}`, data);

// Analytics
export const fetchAnalyticsOverview = () => api.get(`${ADMIN_BASE}/analytics/overview`);
export const fetchAnalyticsReservations = (period = "30d") => api.get(`${ADMIN_BASE}/analytics/reservations`, { params: { period } });
export const fetchAnalyticsStudents = () => api.get(`${ADMIN_BASE}/analytics/students`);
export const fetchAnalyticsBooks = () => api.get(`${ADMIN_BASE}/analytics/books`);
export const fetchAnalyticsBorrowing = () => api.get(`${ADMIN_BASE}/analytics/borrowing`);
export const fetchAnalyticsLibraryUsage = () => api.get(`${ADMIN_BASE}/analytics/library-usage`);

export const updateAdminUserRole = (id, role) =>
  api.put(`${ADMIN_BASE}/users/${id}/role`, { role });

export const updateAdminUserPermissions = (id, overrides) =>
  api.patch(`${ADMIN_BASE}/users/${id}/permissions`, { overrides });

export const USER_FEATURE_KEYS = [
  "reservation.create",
  "reservation.reschedule",
  "reservation.cancel",
  "book.borrow",
  "exam.take",
  "lab.access",
  "qr.scan",
];

export const FIXED_ROLES = ["student", "teacher", "admin", "librarian"];

export const updateAdminUserStatus = (id, status, reason) =>
  api.patch(`${ADMIN_BASE}/users/${id}/status`, { status, reason });

export const updateAdminUserUniversityVerification = (id, universityVerified) =>
  api.patch(`${ADMIN_BASE}/users/${id}/university-verification`, { universityVerified });

export const bulkUpdateAdminUsers = ({ ids, action, value }) =>
  api.post(`${ADMIN_BASE}/users/bulk`, { ids, action, value });

export const fetchAdminUserAuditLogs = (id) =>
  api.get(`${ADMIN_BASE}/users/${id}/audit-logs`);

export const deleteAdminUser = (id) =>
  api.delete(`${ADMIN_BASE}/users/${id}`);

// ─── Independent librarian accounts ────────────────────────────────────────
export const fetchAdminLibrarians = (params) =>
  api.get(`${ADMIN_BASE}/librarians`, { params: buildParams(params) });

export const createAdminLibrarian = (payload) =>
  api.post(`${ADMIN_BASE}/librarians`, payload);

export const updateAdminLibrarian = (id, payload) =>
  api.put(`${ADMIN_BASE}/librarians/${id}`, payload);

export const updateAdminLibrarianStatus = (id, status) =>
  api.patch(`${ADMIN_BASE}/librarians/${id}/status`, { status });

export const resetAdminLibrarianPassword = (id, password) =>
  api.post(`${ADMIN_BASE}/librarians/${id}/reset-password`, { password });

export const searchLibraryStudents = (params) =>
  api.get(`${ADMIN_BASE}/library/students/search`, { params: buildParams(params) });

// ─── Registry (formerly "university students") ──────────────────────────────
// NOTE: the backend model is now `Registry`, not `UniversityStudent` — these
// still point at /university-students for backwards compat with your existing
// frontend page, but you may prefer to just call the /registry endpoints
// directly instead (see further below) since they're the same data now.
export const fetchUniversityStudents = (params) =>
  api.get(`${ADMIN_BASE}/university-students`, { params: buildParams(params) });

export const createUniversityStudent = (data) =>
  api.post(`${ADMIN_BASE}/university-students`, data);

export const updateUniversityStudent = (id, data) =>
  api.put(`${ADMIN_BASE}/university-students/${id}`, data);

export const deleteUniversityStudent = (id) =>
  api.delete(`${ADMIN_BASE}/university-students/${id}`);

export const bulkUpdateUniversityStudents = ({ ids, action, value }) =>
  api.post(`${ADMIN_BASE}/university-students/bulk`, { ids, action, value });

// ─── Seats ────────────────────────────────────────────────────────────────────
export const fetchAdminSeats = (params) =>
  api.get(`${ADMIN_BASE}/seats`, { params: buildParams(params) });

export const fetchAdminSeat = (id) =>
  api.get(`${ADMIN_BASE}/seats/${id}`);

export const createAdminSeat = (data) =>
  api.post(`${ADMIN_BASE}/seats`, data);

export const updateAdminSeat = (id, data) =>
  api.put(`${ADMIN_BASE}/seats/${id}`, data);

export const deleteAdminSeat = (id) =>
  api.delete(`${ADMIN_BASE}/seats/${id}`);

export const updateAdminSeatStatus = (id, status) =>
  api.patch(`${ADMIN_BASE}/seats/${id}/status`, { status });

export const bulkUpdateAdminSeats = ({ ids, action, value }) =>
  api.post(`${ADMIN_BASE}/seats/bulk`, { ids, action, value });

export const bulkGenerateAdminSeats = (data) =>
  api.post(`${ADMIN_BASE}/seats/bulk-generate`, data);

export const fetchSeatTimeline = (id, date) =>
  api.get(`${ADMIN_BASE}/seats/${id}/timeline`, { params: { date } });

export const fetchSeatReservations = (params) =>
  api.get(`${ADMIN_BASE}/seat-reservations`, { params: buildParams(params) });

export const fetchSeatReservationStats = () =>
  api.get(`${ADMIN_BASE}/seat-reservations/stats`);

export const fetchSeatReservation = (id) =>
  api.get(`${ADMIN_BASE}/seat-reservations/${id}`);

export const unwrapSeatReservationDetail = (response) => {
  const reservation = response?.data?.reservation;
  if (!reservation || typeof reservation !== "object") {
    throw new Error("Reservation details are missing from the server response.");
  }
  return reservation;
};

export const adminCancelSeatReservation = (id) =>
  api.patch(`${ADMIN_BASE}/seat-reservations/${id}/cancel`);

export const adminForceCompleteSeatReservation = (id) =>
  api.patch(`${ADMIN_BASE}/seat-reservations/${id}/force-complete`);

export const adminMarkNoShow = (id) =>
  api.patch(`${ADMIN_BASE}/seat-reservations/${id}/no-show`);

export const bulkUpdateSeatReservations = ({ ids, action }) =>
  api.post(`${ADMIN_BASE}/seat-reservations/bulk`, { ids, action });

// ─── Books ───────────────────────────────────────────────────────────────────
export const fetchAdminBooks = (params) =>
  api.get(`${ADMIN_BASE}/books`, { params: buildParams(params) });

export const createAdminBook = (data) =>
  api.post(`${ADMIN_BASE}/books`, data);

export const updateAdminBook = (id, data) =>
  api.put(`${ADMIN_BASE}/books/${id}`, data);

export const deleteAdminBook = (id) =>
  api.delete(`${ADMIN_BASE}/books/${id}`);

// ─── Book reservations ────────────────────────────────────────────────────────
export const fetchBookReservations = (params) =>
  api.get(`${ADMIN_BASE}/book-reservations`, { params: buildParams(params) });

export const updateBookReservationStatus = (id, status) =>
  api.patch(`${ADMIN_BASE}/book-reservations/${id}`, { status });

// ─── QR check-in (fixed: now using adminApi, not bare axios) ────────────────
export const fetchQrStats = () =>
  api.get(`${ADMIN_BASE}/reservations/qr-stats`);

export const lookupReservationByQr = (qrCode) =>
  api.get(`${ADMIN_BASE}/reservations/lookup/qr/${qrCode}`);

export const lookupReservationById = (reservationId) =>
  api.get(`${ADMIN_BASE}/reservations/lookup/id/${reservationId}`);

export const adminCheckinReservation = (reservationId) =>
  api.post(`${ADMIN_BASE}/reservations/checkin/${reservationId}`);

export const adminCheckoutReservation = (reservationId) =>
  api.post(`${ADMIN_BASE}/reservations/checkout/${reservationId}`);

// ─── Dashboard / Analytics ────────────────────────────────────────────────────
export const fetchAdminDashboard = () => api.get(`${ADMIN_BASE}/dashboard`);

export const fetchAdminAnalytics = () => api.get(`${ADMIN_BASE}/analytics`);

// ─── Roles ───────────────────────────────────────────────────────────────────
export const fetchAdminRoles = () =>
  api.get(`${ADMIN_BASE}/roles`);

export const fetchAdminRole = (id) =>
  api.get(`${ADMIN_BASE}/roles/${id}`);

export const createAdminRole = (data) =>
  api.post(`${ADMIN_BASE}/roles`, data);

export const updateAdminRole = (id, data) =>
  api.put(`${ADMIN_BASE}/roles/${id}`, data);

export const updateAdminRolePermissions = (id, permissions) =>
  api.patch(`${ADMIN_BASE}/roles/${id}/permissions`, { permissions });

export const deleteAdminRole = (id) =>
  api.delete(`${ADMIN_BASE}/roles/${id}`);

export const fetchAdminRoleUsers = (id, params = {}) =>
  api.get(`${ADMIN_BASE}/roles/${id}/users`, { params });

export const fetchAllPermissions = () =>
  api.get(`${ADMIN_BASE}/roles/permissions`);

// ─── Registry (admin CRUD — same backing model as university-students above) ─
export const fetchAdminRegistry = (params) =>
  api.get(`${ADMIN_BASE}/registry`, { params: buildParams(params) });

export const fetchAdminRegistryEntry = (id) =>
  api.get(`${ADMIN_BASE}/registry/${id}`);

export const createAdminRegistryEntry = (data) =>
  api.post(`${ADMIN_BASE}/registry`, data);

export const updateAdminRegistryEntry = (id, data) =>
  api.put(`${ADMIN_BASE}/registry/${id}`, data);

export const deleteAdminRegistryEntry = (id) =>
  api.delete(`${ADMIN_BASE}/registry/${id}`);

export const bulkUpdateAdminRegistry = ({ ids, action }) =>
  api.post(`${ADMIN_BASE}/registry/bulk`, { ids, action });

export const resetAdminRegistryPassword = (id, password) =>
  api.post(`${ADMIN_BASE}/registry/${id}/reset-password`, { password });

export const unlinkAdminRegistryEntry = (id) =>
  api.post(`${ADMIN_BASE}/registry/${id}/unlink`);

export const fetchAdminRegistryStats = () =>
  api.get(`${ADMIN_BASE}/registry/stats`);

// ─── Audit logs ───────────────────────────────────────────────────────────────
export const fetchAdminAuditLogs = (params = {}) =>
  api.get(`${ADMIN_BASE}/audit-logs`, { params });