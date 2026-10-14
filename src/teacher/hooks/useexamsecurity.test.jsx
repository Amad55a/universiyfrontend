import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useExamSecurity from "./useexamsecurity";

describe("useExamSecurity submission transition", () => {
  it("keeps genuine focus-loss detection active until explicitly disarmed", () => {
    const onViolation = vi.fn();
    const { result } = renderHook(() => useExamSecurity({
      enabled: true,
      rules: { preventTabSwitch: true },
      onViolation,
    }));

    act(() => window.dispatchEvent(new Event("blur")));
    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenLastCalledWith(expect.objectContaining({ type: "window_blur" }));

    act(() => result.current.disarm());
    act(() => window.dispatchEvent(new Event("blur")));
    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(result.current.violationCount).toBe(1);
  });
});
