import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoTile } from "./VideoTile.jsx";

describe("VideoTile camera fallback", () => {
  let originalPlay;
  let originalPaused;

  beforeEach(() => {
    originalPlay = HTMLMediaElement.prototype.play;
    originalPaused = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "paused");
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, "paused", {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    HTMLMediaElement.prototype.play = originalPlay;
    if (originalPaused) {
      Object.defineProperty(HTMLMediaElement.prototype, "paused", originalPaused);
    } else {
      delete HTMLMediaElement.prototype.paused;
    }
  });

  it("replaces a camera feed with the participant avatar as soon as its track stops", () => {
    const listeners = new Map();
    const track = {
      id: "camera-track",
      enabled: true,
      readyState: "live",
      muted: false,
      addEventListener: vi.fn((event, callback) => listeners.set(event, callback)),
      removeEventListener: vi.fn(),
    };
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
      getAudioTracks: () => [],
    };

    const { container } = render(
      <VideoTile stream={stream} name="Grace Hopper" hasVideo muted />
    );
    const video = container.querySelector("video");
    expect(video.className).toContain("opacity-100");

    act(() => {
      track.enabled = false;
      listeners.get("mute")();
    });

    expect(video.className).toContain("opacity-0");
    expect(screen.getByText("Grace Hopper")).toBeTruthy();
  });
});
