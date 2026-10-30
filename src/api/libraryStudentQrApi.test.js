import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { issueLibraryStudentQr, verifyLibraryStudentQr } from "./libraryStudentQrApi";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("library student identity QR API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests a signed short-lived identity token for the authenticated student", () => {
    issueLibraryStudentQr();
    expect(api.get).toHaveBeenCalledWith("/library/student-qr");
  });

  it("submits only the scanned token to the registry verification endpoint", () => {
    verifyLibraryStudentQr("signed-token");
    expect(api.post).toHaveBeenCalledWith("/admin/library/students/verify-qr", {
      token: "signed-token",
    });
  });
});
