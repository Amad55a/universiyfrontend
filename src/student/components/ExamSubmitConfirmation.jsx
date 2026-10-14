import React from "react";

export default function ExamSubmitConfirmation({ onCancel, onConfirm, isSubmitting }) {
  return (
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <section
        aria-labelledby="exam-submit-confirm-title"
        aria-modal="true"
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl dark:bg-neutral-800 dark:text-white"
        role="dialog"
      >
        <h2 className="text-lg font-bold" id="exam-submit-confirm-title">
          Confirm exam submission
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Are you sure you want to submit? You cannot change answers after submitting.
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold dark:border-neutral-600"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Continue exam
          </button>
          <button
            className="rounded-lg bg-[#2C2DE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            Submit exam
          </button>
        </div>
      </section>
    </div>
  );
}
