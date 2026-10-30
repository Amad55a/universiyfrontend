// reportsApi.js
import api from "./client"; // same axios instance used by adminApi.js

const REPORT_BASE = "/admin/reports";

export const fetchReportCenter = (params) =>
  api.get(`${REPORT_BASE}/center`, { params }).then((response) => response.data.data);

export const fetchReportCenterRecords = (params) =>
  api.get(`${REPORT_BASE}/center/records`, { params }).then((response) => response.data.data);

export const downloadReportCenter = async (format, params) => {
  if (!["csv", "pdf", "excel"].includes(format)) {
    throw new Error("Unsupported report format.");
  }
  const response = await api.get(`${REPORT_BASE}/center/export/${format}`, {
    params,
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const fallbackExtension = format === "excel" ? "xlsx" : format;
  const mimeType = format === "csv"
    ? "text/csv;charset=utf-8"
    : format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = match?.[1] || `unicore-system-report.${fallbackExtension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const fetchReport = (period, date) =>
  api.get(REPORT_BASE, { params: { period, date } }).then((r) => r.data.data);

// Downloads trigger a real file save via Blob + a temporary <a>.
// No canned "Download" button — this hits the real export endpoint.
const downloadBlob = async (url, params, filenameFallback) => {
  const response = await api.get(url, { params, responseType: "blob" });

  // Prefer the server's real filename (from Content-Disposition) over a guess.
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || filenameFallback;

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const downloadReportPdf = (period, date) =>
  downloadBlob(`${REPORT_BASE}/export/pdf`, { period, date }, `library-${period}-report.pdf`);

export const downloadReportExcel = (period, date) =>
  downloadBlob(`${REPORT_BASE}/export/excel`, { period, date }, `library-${period}-report.xlsx`);