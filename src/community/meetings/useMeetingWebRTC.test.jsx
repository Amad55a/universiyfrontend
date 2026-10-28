import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  listeners: new Map(),
  socket: { id: "local-socket", disconnected: false },
}));

vi.mock("@/socket.js", () => ({
  default: {
    get id() { return mocks.socket.id; },
    emit: (...args) => mocks.emit(...args),
    on: (event, handler) => mocks.listeners.set(event, handler),
    off: (event, handler) => {
      if (mocks.listeners.get(event) === handler) mocks.listeners.delete(event);
    },
    connect: vi.fn(),
    get disconnected() { return mocks.socket.disconnected; },
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
    mocks.listeners.clear();
    mocks.socket.id = "local-socket";
    mocks.socket.disconnected = false;
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

  it("opens the camera after the host is granted immediately", async () => {
    const { useMeetingWebRTC } = await import("./useMeetingWebRTC.js");
    const { result } = renderHook(() => useMeetingWebRTC({
      meetingCode: "ROOM01",
      user: { _id: "user-1", name: "Ada" },
      role: "host",
      isHost: true,
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

  it("waits for host approval before opening a participant camera", async () => {
    mocks.emit.mockImplementation((event, _payload, acknowledge) => {
      if (event === "meeting:camera-request") {
        acknowledge?.({ granted: false, pending: true, reason: "Waiting for the host." });
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
    expect(result.current.cameraRequestPending).toBe(true);
  });

  it("stops local media when leaving the room", async () => {
    const { useMeetingWebRTC } = await import("./useMeetingWebRTC.js");
    const { result } = renderHook(() => useMeetingWebRTC({
      meetingCode: "ROOM03",
      user: { _id: "user-3", name: "Lin" },
      role: "host",
      isHost: true,
      enabled: false,
    }));

    await act(async () => {
      await result.current.toggleCamera();
      result.current.leaveRoom();
    });

    expect(mocks.emit).toHaveBeenCalledWith("meeting:leave-room");
    expect(result.current.hasCameraOn).toBe(false);
    expect(result.current.joinStatus).toBe("left");
  });

  it("rejoins after a socket reconnect and restores approved local media state", async () => {
    const { useMeetingWebRTC } = await import("./useMeetingWebRTC.js");
    const user = { _id: "user-4", name: "Katherine" };
    const { result } = renderHook(() => useMeetingWebRTC({
      meetingCode: "ROOM04",
      user,
      role: "host",
      isHost: true,
      enabled: true,
    }));

    await waitFor(() => {
      expect(mocks.emit).toHaveBeenCalledWith(
        "meeting:join-room",
        expect.objectContaining({ meetingCode: "ROOM04" })
      );
    });
    await act(async () => {
      await result.current.toggleCamera();
    });
    expect(result.current.hasCameraOn).toBe(true);

    act(() => mocks.listeners.get("disconnect")?.());
    mocks.socket.id = "local-socket-reconnected";
    act(() => mocks.listeners.get("connect")?.());

    await act(async () => {
      mocks.listeners.get("meeting:participants-updated")?.({ participants: [] });
    });

    expect(mocks.emit).toHaveBeenCalledWith(
      "meeting:update-state",
      expect.objectContaining({ hasCameraOn: true, cameraTrackId: "camera-1" })
    );
    expect(result.current.joinStatus).toBe("joined");
  });
});
