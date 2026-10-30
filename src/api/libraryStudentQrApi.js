import api from "@/api/client";

export const issueLibraryStudentQr = () => api.get("/library/student-qr");

export const verifyLibraryStudentQr = (token) =>
  api.post("/admin/library/students/verify-qr", { token });
