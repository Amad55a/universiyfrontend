import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import ExamCameraMonitor from "./ExamCameraMonitor";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

describe("configured exam microphone checks", () => {
  let originalMediaDevices;

  beforeEach(() => {
    vi.clearAllMocks();
    originalMediaDevices = navigator.mediaDevices;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it("checks permission, stops the microphone stream, and records status only", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    render(<ExamCameraMonitor examId="exam-1" microphoneRequired />);

    expect(await screen.findByText("Microphone available (not recording)")).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(stop).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/exams/student/exam-1/proctor-heartbeat",
        { microphoneOk: true },
      );
    });
  });

  it("reports a denied microphone check without sending audio", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    render(<ExamCameraMonitor examId="exam-1" microphoneRequired />);

    expect(await screen.findByText("Microphone required")).toBeInTheDocument();
    expect(await screen.findByText("Permission denied")).toBeInTheDocument();
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/exams/student/exam-1/proctor-heartbeat",
        { microphoneOk: false, note: "microphone_denied" },
      );
    });
  });
});
