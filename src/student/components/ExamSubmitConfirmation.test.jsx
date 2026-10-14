import React, { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExamSubmitConfirmation from "./ExamSubmitConfirmation";

function ConfirmationHarness({ fullscreen }) {
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submit = useRef(vi.fn()).current;
  const confirm = () => {
    if (submitting) return;
    setSubmitting(true);
    submit();
  };

  return (
    <div className="exam-root" data-fullscreen={fullscreen ? "true" : "false"}>
      {visible && (
        <ExamSubmitConfirmation
          isSubmitting={submitting}
          onCancel={() => setVisible(false)}
          onConfirm={confirm}
        />
      )}
      <output data-testid="submission-count">{String(submit.mock.calls.length)}</output>
    </div>
  );
}

describe.each([false, true])("exam submit confirmation (fullscreen=%s)", (fullscreen) => {
  it("is rendered inside the exam root; cancel does not submit", () => {
    const { container } = render(<ConfirmationHarness fullscreen={fullscreen} />);
    const root = container.querySelector(".exam-root");
    const dialog = screen.getByRole("dialog");
    expect(root?.contains(dialog)).toBe(true);
    expect(dialog.parentElement).toHaveClass("z-[12000]");

    fireEvent.click(screen.getByRole("button", { name: "Continue exam" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("submission-count")).toHaveTextContent("0");
  });

  it("confirms once and disables repeated confirmation clicks", () => {
    render(<ConfirmationHarness fullscreen={fullscreen} />);
    const button = screen.getByRole("button", { name: "Submit exam" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByTestId("submission-count")).toHaveTextContent("1");
    expect(button).toBeDisabled();
  });
});
