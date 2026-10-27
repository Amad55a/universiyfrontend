import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  socket: { id: "local-socket" },
}));

vi.mock("@/socket.js", () => ({
  default: {
    get id() { return mocks.socket.id; },
    emit: (...args) => mocks.emit(...args),
    on: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("./meetingSounds.js", () => ({
  playJoin: vi.fn(),
  playLeave: vi.fn(),
  playCameraOn: vi.fn(),
  playCameraOff: vi.fn(),
  playScreenShareStart: vi.fn(),
  playScreenShareStop: vi.fn(),
  playHandRaise: vi.fn(),
}));

class MockMediaStream {
  constructor(tracks = []) { this.tracks = [...tracks]; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
  addTrack(track) { this.tracks.push(track); }
  removeTrack(track) { this.tracks = this.tracks.filter((item) => item !== track); }
}

const makeTrack = (kind, id) => ({
  id,
  kind,
  enabled: true,
  readyState: "live",
  stop: vi.fn(),
});

describe("meeting media controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("MediaStream", MockMediaStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async (constraints) => new MockMediaStream([
          constraints.audio ? makeTrack("audio", "mic-1") : null,
          constraints.video ? makeTrack("video", "camera-1") : null,
        ].filter(Boolean))),
      },
    });
    mocks.emit.mockImplementation((event, _payload, acknowledge) => {
      if (event === "meeting:camera-request") acknowledge?.({ granted: true });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires the server camera lease before opening and publishing a camera", async () => {
    const { useMeetingWebRTC } = await import("./useMeetingWebRTC.js");
    const { result } = renderHook(() => useMeetingWebRTC({
      meetingCode: "ROOM01",
      user: { _id: "user-1", name: "Ada" },
      role: "participant",
      enabled: false,
    }));

    await act(async () => {
      await result.current.toggleCamera();
    });

    expect(mocks.emit).toHaveBeenCalledWith("meeting:camera-request", {}, expect.any(Function));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(result.current.hasCameraOn).toBe(true);
    expect(mocks.emit).toHaveBeenCalledWith(
      "meeting:update-state",
      expect.objectContaining({ hasCameraOn: true, cameraTrackId: "camera-1" })
    );
  });

  it("does not ask for camera permission when the server denies camera ownership", async () => {
    mocks.emit.mockImplementation((event, _payload, acknowledge) => {
      if (event === "meeting:camera-request") {
        acknowledge?.({ granted: false, reason: "Another participant is using the camera." });
      }
    });
    const { useMeetingWebRTC } = await import("./useMeetingWebRTC.js");
    const { result } = renderHook(() => useMeetingWebRTC({
      meetingCode: "ROOM02",
      user: { _id: "user-2", name: "Grace" },
      role: "participant",
      enabled: false,
    }));

    await act(async () => {
      await result.current.toggleCamera();
    });

    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(result.current.hasCameraOn).toBe(false);
  });
});
