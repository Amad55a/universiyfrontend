import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => <div data-testid="turnstile-widget" />,
}));
vi.mock("@/config/turnstile", () => ({
  get isLocalTurnstileBypassEnabled() {
    return globalThis.turnstileBypassEnabled ?? true;
  },
}));

import TurnstileCaptcha from "./TurnstileCaptcha";

describe("TurnstileCaptcha local development mode", () => {
  beforeEach(() => {
    globalThis.turnstileBypassEnabled = true;
  });

  it("reports the development token without rendering a Cloudflare widget", async () => {
    const onVerify = vi.fn();
    render(<TurnstileCaptcha onVerify={onVerify} />);

    expect(screen.getByText(/bypassed for local development only/i)).toBeInTheDocument();
    expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("dev-bypass"));
  });

  it("does not repeatedly report the bypass when the form rerenders", async () => {
    const onVerify = vi.fn();
    const { rerender } = render(<TurnstileCaptcha onVerify={onVerify} />);
    await waitFor(() => expect(onVerify).toHaveBeenCalledTimes(1));

    rerender(<TurnstileCaptcha onVerify={onVerify} />);
    expect(onVerify).toHaveBeenCalledTimes(1);
  });

  it("explains when Turnstile is not configured and the bypass is disabled", () => {
    globalThis.turnstileBypassEnabled = false;
    render(<TurnstileCaptcha />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Human verification is not configured."
    );
    expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
  });
});
