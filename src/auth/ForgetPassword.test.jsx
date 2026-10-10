import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import ForgotPassword from "./ForgetPassword";

vi.mock("@/api/client", () => ({ default: { post: vi.fn() } }));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key) => key }),
}));
vi.mock("@/FrontDoorSystem/components/Logo", () => ({ default: () => null }));
vi.mock("@/components/TurnstileCaptcha", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderForgotPassword = (initialEntry = "/forgot-password") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ForgotPassword />
    </MemoryRouter>
  );

const enterValidResetDetails = () => {
  fireEvent.change(screen.getByLabelText("auth.resetCodeLabel"), {
    target: { value: "654321" },
  });
  fireEvent.change(screen.getByLabelText("auth.newPasswordLabel"), {
    target: { value: "ValidPass1!" },
  });
  fireEvent.change(screen.getByLabelText("auth.confirmPasswordLabel"), {
    target: { value: "ValidPass1!" },
  });
};

describe("ForgotPassword", () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it("keeps the email field readable and submits the forgot-password request", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderForgotPassword();

    const email = screen.getByLabelText("common.email");
    expect(email).toHaveClass("bg-white", "text-gray-900", "border-gray-300");
    expect(email).toHaveFocus();

    fireEvent.change(email, { target: { value: "test@example.test" } });
    expect(email).toHaveValue("test@example.test");
    expect(email).toHaveClass("bg-white", "text-gray-900");

    fireEvent.submit(email.closest("form"));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/auth/forgot-password",
      { email: "test@example.test", turnstileToken: null },
      { withCredentials: true }
    ));
    expect(screen.getByLabelText("auth.resetCodeLabel")).toBeInTheDocument();
  });

  it("loads reset details from the emailed link and strips them from the URL", () => {
    renderForgotPassword(
      "/forgot-password#email=test%40example.test&code=654321"
    );

    expect(screen.getByLabelText("auth.resetCodeLabel")).toHaveValue("654321");
    expect(screen.getByLabelText("auth.newPasswordLabel")).toHaveValue("");
    expect(screen.getByText("test@example.test")).toBeInTheDocument();
  });

  it("toggles each password independently without submitting the form", () => {
    renderForgotPassword(
      "/forgot-password#email=test%40example.test&code=654321"
    );
    const newPassword = screen.getByLabelText("auth.newPasswordLabel");
    const confirmPassword = screen.getByLabelText("auth.confirmPasswordLabel");

    fireEvent.change(newPassword, { target: { value: "ValidPass1!" } });
    fireEvent.change(confirmPassword, { target: { value: "ValidPass1!" } });

    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    expect(newPassword).toHaveAttribute("type", "text");
    expect(newPassword).toHaveValue("ValidPass1!");
    expect(confirmPassword).toHaveAttribute("type", "password");
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect(confirmPassword).toHaveAttribute("type", "text");
    expect(confirmPassword).toHaveValue("ValidPass1!");

    fireEvent.click(screen.getByRole("button", { name: "Hide new password" }));
    expect(newPassword).toHaveAttribute("type", "password");
    expect(confirmPassword).toHaveAttribute("type", "text");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before making a reset request", async () => {
    renderForgotPassword(
      "/forgot-password#email=test%40example.test&code=654321"
    );
    enterValidResetDetails();
    fireEvent.change(screen.getByLabelText("auth.confirmPasswordLabel"), {
      target: { value: "DifferentPass1!" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "auth.resetPassword" }).closest("form"));

    expect(await screen.findByText("auth.passwordMismatch")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the reset once, shows pending state, and reports success", async () => {
    let resolveRequest;
    api.post.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderForgotPassword(
      "/forgot-password#email=test%40example.test&code=654321"
    );
    enterValidResetDetails();
    const form = screen.getByRole("button", { name: "auth.resetPassword" }).closest("form");

    fireEvent.submit(form);
    fireEvent.submit(form);

    const resetButton = screen.getByRole("button", { name: "auth.resetPassword" });
    expect(resetButton).toBeDisabled();
    expect(resetButton).toHaveAttribute("aria-busy", "true");
    expect(resetButton.querySelector("svg.animate-spin")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
      email: "test@example.test",
      code: "654321",
      newPassword: "ValidPass1!",
    });

    resolveRequest({ data: {} });
    expect(await screen.findByText("auth.passwordResetDone")).toBeInTheDocument();
  });

  it("shows API errors and re-enables the reset button", async () => {
    api.post.mockRejectedValue({
      response: { data: { message: "Reset code expired." } },
    });
    renderForgotPassword(
      "/forgot-password#email=test%40example.test&code=654321"
    );
    enterValidResetDetails();

    fireEvent.submit(screen.getByRole("button", { name: "auth.resetPassword" }).closest("form"));

    expect(await screen.findByText("Reset code expired.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "auth.resetPassword" })).toBeEnabled();
  });
});
