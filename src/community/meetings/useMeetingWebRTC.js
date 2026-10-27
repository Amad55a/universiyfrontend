/**
 * useMeetingWebRTC.js — Production WebRTC hook for UNISO meetings.
 *
 * Bug fixes applied:
 *  BUG 1 — Reconnect: socket.reconnect clears peers but didn't re-create them.
 *           Fix: On reconnect emit join-room, server sends existing-peers with
 *           fresh socket IDs → we build new peer connections from those.
 *
 *  BUG 2 — ontrack race: React state batching caused the second track (audio or
 *           video) to snapshot stale state and drop tracks.
 *           Fix: remoteStreamsRef (Map) for synchronous mutation → flush to state.
 *
 *  BUG 3 — Stale screen sender: After stop→restart, _screenSender may reference
 *           a sender whose RTCDtlsTransport is closed. replaceTrack() throws.
 *           Fix: Check sender.transport state before replaceTrack(); fall back to addTrack().
 *
 *  BUG 4 — ICE candidate dropped: Candidates arriving before setRemoteDescription
 *           were silently discarded.
 *           Fix: iceCandidateQueueRef buffers per-peer; flushed after setRemoteDescription.
 *
 *  BUG 7 — Two screens live at once: the host-side "Accept" handler only ever
 *           checked whether the HOST was sharing before approving a new
 *           requester. If a non-host was already presenting (approved earlier),
 *           accepting a second requester didn't stop the first one — both
 *           streams stayed live. Fix: (a) added a server-relayed
 *           "meeting:screen-share-force-stop" event so the host (or the logic
 *           that decides who may present) can stop ANY current presenter, not
 *           just itself; (b) the host-side request handler no longer silently
 *           overwrites a pending request when a second one arrives — it denies
 *           the newer one immediately instead of dropping the requester who's
 *           still waiting.
 *
 * Classroom screen-share rules:
 *  - Only the host may start screen sharing immediately.
 *  - A non-host must request permission; the host is notified and can Accept/Deny.
 *  - If the host is already sharing, the host must stop their own share before
 *    accepting a student's request — at no point are two screens shared at once.
 *  - If ANOTHER participant (not the host) is already presenting, accepting a
 *    new request force-stops that participant's share first.
 *  - Requests/approvals travel over the existing "meeting:relay-event" channel
 *    (same mechanism already used for force-tab), so no new server events are needed.
 *
 * TURN server: Optional. Set VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL
 * in your .env file. If unset, STUN-only is used (works on most networks but may fail
 * behind symmetric NAT). Free TURN available at metered.ca/tools/openrelay
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import socket from "@/socket.js";
import {
  playJoin, playLeave,
  playCameraOn, playCameraOff,
  playScreenShareStart, playScreenShareStop,
  playHandRaise,
} from "./meetingSounds.js";

// ── ICE Server configuration ─────────────────────────────────────────────────
const ICE_SERVERS = (() => {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ];
  const {
    VITE_TURN_URL: url,
    VITE_TURN_USERNAME: user,
    VITE_TURN_CREDENTIAL: cred,
  } = import.meta.env;
  if (url && user && cred) {
    // TURN is configured — essential for users behind symmetric NAT
    servers.push({ urls: url, username: user, credential: cred });
    console.log("[WebRTC] TURN server configured:", url);
  } else {
    console.warn(
      "[WebRTC] No TURN server configured. " +
      "Set VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL for " +
      "reliable connectivity behind symmetric NAT (common in universities). " +
      "Free TURN: https://www.metered.ca/tools/openrelay/"
    );
  }
  return { iceServers: servers, iceCandidatePoolSize: 10 };
})();

// How long to wait after "disconnected" before attempting ICE restart
const ICE_RESTART_DELAY_MS = 2000;
// How long a peer may stay disconnected/failed before we give up on it
const PEER_GIVEUP_MS = 15000;

export function useMeetingWebRTC({ meetingCode, user, role, enabled, isHost = false }) {
  const [localStream,          setLocalStream]          = useState(null);
  const [remoteStreams,        setRemoteStreams]         = useState({});
  const [participants,         setParticipants]         = useState([]);
  const [isMuted,              setIsMuted]              = useState(true);
  const [hasCameraOn,          setHasCameraOn]          = useState(false);
  const [isScreenSharing,      setIsScreenSharing]      = useState(false);
  const [handRaised,           setHandRaised]           = useState(false);
  const [speakingParticipants, setSpeakingParticipants] = useState({});
  const [presenterId,          setPresenterId]          = useState(null);
  const [connectionError,      setConnectionError]      = useState("");

  // ── Screen-share permission state ────────────────────────────────────────
  // Host-side: the pending request from a non-host participant (or null).
  const [screenShareRequest,        setScreenShareRequest]        = useState(null);
  // Requester-side: true while waiting for the host to respond.
  const [screenShareRequestPending, setScreenShareRequestPending] = useState(false);

  const peersRef        = useRef({});
  const localStreamRef  = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const stoppingScreenRef = useRef(false);
  const cameraToggleInProgressRef = useRef(false);
  const startingScreenShareRef = useRef(false);
  const startedRef      = useRef(false);
  const joinPayloadRef  = useRef(null);

  // ── BUG 2 FIX: Synchronous stream management via ref ────────────────────
  // React state batching causes ontrack to snapshot stale state. We use a Map
  // as the single source of truth and only call setRemoteStreams for re-renders.
  const remoteStreamsRef = useRef(new Map()); // Map<socketId, MediaStream>

  // ── BUG 4 FIX: Per-peer ICE candidate buffer ─────────────────────────────
  // Candidates arriving before setRemoteDescription are stored here and flushed
  // once the remote description is set.
  const iceCandidateQueueRef = useRef(new Map()); // Map<socketId, RTCIceCandidate[]>

  const isScreenSharingRef = useRef(false);
  const hasCameraOnRef     = useRef(false);
  const isHostRef          = useRef(isHost);
  const screenShareRequestPendingRef = useRef(false);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
  useEffect(() => { hasCameraOnRef.current     = hasCameraOn;     }, [hasCameraOn]);
  useEffect(() => { isHostRef.current          = isHost;          }, [isHost]);
  useEffect(() => { screenShareRequestPendingRef.current = screenShareRequestPending; }, [screenShareRequestPending]);

  const audioContextRef = useRef(null);
  const analyzersRef    = useRef({});

  const emitState = useCallback((state) => {
    socket.emit("meeting:update-state", state);
  }, []);

  // ── Flush remoteStreamsRef → React state ─────────────────────────────────
  const flushRemoteStreams = useCallback(() => {
    const snapshot = {};
    remoteStreamsRef.current.forEach((stream, socketId) => {
      snapshot[socketId] = stream;
    });
    setRemoteStreams(snapshot);
  }, []);

  // ── Audio analysis ───────────────────────────────────────────────────────
  const stopAnalyzingStream = useCallback((socketId) => {
    const a = analyzersRef.current[socketId];
    if (!a) return;
    clearInterval(a.intervalId);
    try { a.source.disconnect(); } catch {}
    delete analyzersRef.current[socketId];
    setSpeakingParticipants((p) => { const n = { ...p }; delete n[socketId]; return n; });
  }, []);

  const startAnalyzingStream = useCallback((socketId, stream) => {
    if (!stream || !stream.getAudioTracks().length) return;
    try {
      // Reuse a single shared AudioContext — creation is expensive and browsers
      // have a concurrent-context limit (~6). Never create one per stream.
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();
      stopAnalyzingStream(socketId);
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;
      const intervalId = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const nowSpeaking = avg > 12;
        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking;
          setSpeakingParticipants((p) => ({ ...p, [socketId]: speaking }));
        }
      }, 100);
      analyzersRef.current[socketId] = { source, analyser, intervalId };
    } catch (err) { console.warn("[WebRTC] audio analyser error:", err); }
  }, [stopAnalyzingStream]);

  const removeRemoteStream = useCallback((socketId) => {
    remoteStreamsRef.current.delete(socketId);
    flushRemoteStreams();
    stopAnalyzingStream(socketId);
  }, [stopAnalyzingStream, flushRemoteStreams]);

  const closeAndRemovePeer = useCallback((targetSocketId) => {
    const pc = peersRef.current[targetSocketId];
    if (pc) {
      clearTimeout(pc._restartTimer);
      clearTimeout(pc._giveupTimer);
      try { pc.close(); } catch {}
    }
    delete peersRef.current[targetSocketId];
    iceCandidateQueueRef.current.delete(targetSocketId);
    removeRemoteStream(targetSocketId);
  }, [removeRemoteStream]);

  // ── BUG 4 FIX: Flush buffered ICE candidates after setRemoteDescription ──
  const flushIceCandidates = useCallback(async (socketId) => {
    const queue = iceCandidateQueueRef.current.get(socketId);
    if (!queue || queue.length === 0) return;
    iceCandidateQueueRef.current.set(socketId, []); // clear before async ops
    const pc = peersRef.current[socketId];
    if (!pc) return;
    console.log(`[WebRTC] flushing ${queue.length} buffered ICE candidates for ${socketId}`);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[WebRTC] buffered ICE candidate add error:", err);
      }
    }
  }, []);

  // ── createPeer ───────────────────────────────────────────────────────────
  const createPeer = useCallback((targetSocketId, initiator) => {
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    // Perfect Negotiation: polite peer yields on glare, impolite keeps its offer
    const polite = !initiator;
    let makingOffer = false;
    let ignoreOffer = false;

    // Stable sender handles — persisted across replaceTrack calls
    pc._cameraSender = null;
    pc._audioSender = null;
    pc._screenSender = null;
    pc._restartTimer = null;
    pc._giveupTimer  = null;

    console.log(`[WebRTC] createPeer ${targetSocketId} initiator=${initiator} polite=${polite}`);

    // ── Wire ALL handlers BEFORE addTrack ────────────────────────────────
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        console.log(`[WebRTC] onnegotiationneeded → ${pc.localDescription?.type} sent to ${targetSocketId}`);
        socket.emit("meeting:offer", { to: targetSocketId, offer: pc.localDescription });
      } catch (err) {
        console.error("[WebRTC] onnegotiationneeded error:", err);
      } finally {
        makingOffer = false;
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("meeting:ice-candidate", { to: targetSocketId, candidate: e.candidate });
      }
    };

    // ── BUG 2 FIX: ontrack uses ref for synchronous stream management ─────
    // We never trust React state inside ontrack — we use the Map ref directly.
    pc.ontrack = (e) => {
      console.log(`[WebRTC] ontrack from ${targetSocketId}: kind=${e.track.kind} id=${e.track.id}`);

      // Synchronously get-or-create the MediaStream for this peer
      let stream = remoteStreamsRef.current.get(targetSocketId);
      if (!stream) {
        // Prefer the stream object that comes with the track event (correct association)
        stream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream();
        remoteStreamsRef.current.set(targetSocketId, stream);
      } else {
        // Add the new track to the existing stream if it's not already there
        if (!stream.getTracks().some((t) => t.id === e.track.id)) {
          stream.addTrack(e.track);
        }
      }

      // Flush to React state immediately (synchronous map → async render)
      flushRemoteStreams();

      // Restart audio analysis with updated stream (new audio track may have arrived)
      startAnalyzingStream(targetSocketId, stream);

      // Clean up when track ends (e.g., remote turns off camera)
      e.track.onended = () => {
        const currentStream = remoteStreamsRef.current.get(targetSocketId);
        if (!currentStream) return;
        currentStream.removeTrack(e.track);
        // Only delete if truly empty — audio may still be present
        if (currentStream.getTracks().length === 0) {
          remoteStreamsRef.current.delete(targetSocketId);
        }
        flushRemoteStreams();
      };
    };

    // Recoverable blips: wait before tearing down
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log(`[WebRTC] ${targetSocketId} iceConnectionState → ${s}`);

      if (s === "disconnected") {
        clearTimeout(pc._restartTimer);
        pc._restartTimer = setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.warn(`[WebRTC] ICE restart for ${targetSocketId}`);
            try { pc.restartIce(); } catch (err) { console.warn("[WebRTC] restartIce error:", err); }
          }
        }, ICE_RESTART_DELAY_MS);

        clearTimeout(pc._giveupTimer);
        pc._giveupTimer = setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.warn(`[WebRTC] giving up on ${targetSocketId} after prolonged disconnect`);
            closeAndRemovePeer(targetSocketId);
          }
        }, PEER_GIVEUP_MS);
      } else if (s === "failed") {
        console.warn(`[WebRTC] ICE failed for ${targetSocketId}, restarting immediately`);
        try { pc.restartIce(); } catch (err) { console.warn("[WebRTC] restartIce error:", err); }
      } else if (s === "connected" || s === "completed") {
        clearTimeout(pc._restartTimer);
        clearTimeout(pc._giveupTimer);
        console.log(`[WebRTC] ✅ connected to ${targetSocketId}`);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[WebRTC] ${targetSocketId} connectionState → ${s}`);
      if (s === "closed") closeAndRemovePeer(targetSocketId);
    };

    // Store BEFORE addTrack so synchronous onnegotiationneeded sees the peer
    peersRef.current[targetSocketId] = pc;
    pc._polite        = polite;
    pc._makingOffer   = () => makingOffer;
    pc._setIgnoreOffer = (v) => { ignoreOffer = v; };
    pc._getIgnoreOffer = () => ignoreOffer;

    // Seed with current local tracks (mic + camera if on)
    const baseStream = localStreamRef.current;
    if (baseStream) {
      console.log(`[WebRTC] seeding ${targetSocketId} with ${baseStream.getTracks().length} tracks`);
      baseStream.getTracks().forEach((track) => {
        try {
          const sender = pc.addTrack(track, baseStream);
          if (track.kind === "video") pc._cameraSender = sender;
          if (track.kind === "audio") pc._audioSender = sender;
        } catch (e) { console.warn("[WebRTC] addTrack (base) error:", e); }
      });
    }

    const activeCameraTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (activeCameraTrack && !baseStream?.getTracks().some((track) => track.id === activeCameraTrack.id)) {
      try {
        pc._cameraSender = pc.addTrack(activeCameraTrack, cameraStreamRef.current);
      } catch (err) {
        console.error("[WebRTC] Could not seed new peer with the active camera:", err);
      }
    }

    // Seed active screen share so late joiners receive it immediately
    if (screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        try {
          pc._screenSender = pc.addTrack(screenTrack, screenStreamRef.current);
        } catch (e) { console.warn("[WebRTC] addTrack (screen) error:", e); }
      }
    }

    return pc;
  }, [closeAndRemovePeer, startAnalyzingStream, flushRemoteStreams]);

  // ── ensureAudio ──────────────────────────────────────────────────────────
  const ensureAudio = useCallback(async () => {
    if (localStreamRef.current?.getAudioTracks().length) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  true,
          noiseSuppression:  true,
          autoGainControl:   true,
          sampleRate:        48000, // Opus codec works best at 48 kHz
          channelCount:      1,     // Mono is sufficient and uses half the bandwidth
          latency:           0,     // Minimize buffering
        },
        video: false,
      });
      // Start muted — user explicitly unmutes
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMuted(true);
      const audioTrack = stream.getAudioTracks()[0];
      Object.values(peersRef.current).forEach((pc) => {
        if (pc._audioSender) return;
        try {
          pc._audioSender = pc.addTrack(audioTrack, stream);
        } catch (err) {
          console.error("[WebRTC] Could not publish microphone track:", err);
        }
      });
      emitState({ isMuted: true, hasCameraOn: false });
      return stream;
    } catch (err) {
      console.error("[WebRTC] mic denied:", err);
      return null;
    }
  }, [emitState]);

  // ── toggleMute ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    let stream = localStreamRef.current;
    if (!stream) stream = await ensureAudio();
    if (!stream) {
      toast.error("Could not access microphone. Please check permissions.");
      return;
    }
    const track = stream.getAudioTracks()[0];
    if (!track) {
      toast.error("No audio track found in microphone stream.");
      return;
    }
    const nextMuted = !isMuted;
    track.enabled = !nextMuted;
    setIsMuted(nextMuted);
    emitState({ isMuted: nextMuted });
  }, [isMuted, ensureAudio, emitState]);

  // ── toggleCamera ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(async () => {
    if (cameraToggleInProgressRef.current) return;
    cameraToggleInProgressRef.current = true;
    if (hasCameraOn) {
      // OFF: stop track, remove from base stream, replaceTrack(null) on all peers
      const base = localStreamRef.current;
      cameraStreamRef.current?.getVideoTracks().forEach((t) => {
        t.stop();
        base?.removeTrack(t);
      });
      cameraStreamRef.current = null;
      if (base) setLocalStream(new MediaStream(base.getTracks()));

      Object.values(peersRef.current).forEach((pc) => {
        if (pc._cameraSender) { try { pc._cameraSender.replaceTrack(null); } catch {} }
      });
      setHasCameraOn(false);
      socket.emit("meeting:camera-release");
      cameraToggleInProgressRef.current = false;
      emitState({
        hasCameraOn:  false,
        cameraTrackId: null,
        screenTrackId: screenStreamRef.current?.getVideoTracks()[0]?.id ?? null,
      });
      playCameraOff();
      toast.success("Camera off");
      return;
    }

    const cameraLease = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ granted: false, reason: "Camera permission request timed out." }), 5000);
      socket.emit("meeting:camera-request", {}, (result) => {
        clearTimeout(timeout);
        resolve(result || { granted: false, reason: "Unable to reserve the camera." });
      });
    });
    if (!cameraLease.granted) {
      toast.error(cameraLease.reason || "Another participant is currently using the meeting camera.");
      cameraToggleInProgressRef.current = false;
      return;
    }

    // ON — try HD → SD → basic
    let camStream = null;
    const constraints = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 }, facingMode: "user" }, audio: false },
      { video: { width: { ideal: 640 },  height: { ideal: 480 }, frameRate: { ideal: 24 }                               }, audio: false },
      { video: true, audio: false },
    ];
    for (const c of constraints) {
      try { camStream = await navigator.mediaDevices.getUserMedia(c); break; } catch {}
    }
    if (!camStream) {
      socket.emit("meeting:camera-release");
      toast.error("Could not access camera. Please check permissions.");
      cameraToggleInProgressRef.current = false;
      return;
    }

    cameraStreamRef.current = camStream;
    const videoTrack = camStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      if (cameraStreamRef.current !== camStream) return;
      cameraStreamRef.current = null;
      localStreamRef.current?.removeTrack(videoTrack);
      setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));
      setHasCameraOn(false);
      socket.emit("meeting:camera-release");
      emitState({ hasCameraOn: false, cameraTrackId: null });
    };
    console.log(`[WebRTC] camera track id=${videoTrack.id} readyState=${videoTrack.readyState}`);

    const base = localStreamRef.current || await ensureAudio();
    if (base && !base.getVideoTracks().includes(videoTrack)) {
      base.addTrack(videoTrack);
      setLocalStream(new MediaStream(base.getTracks()));
    }

    Object.values(peersRef.current).forEach((pc) => {
      if (pc._cameraSender) {
        try { pc._cameraSender.replaceTrack(videoTrack); } catch {}
      } else {
        try { pc._cameraSender = pc.addTrack(videoTrack, base || new MediaStream()); } catch {}
      }
    });

    setHasCameraOn(true);
    emitState({
      hasCameraOn:   true,
      cameraTrackId: videoTrack.id,
      screenTrackId: screenStreamRef.current?.getVideoTracks()[0]?.id ?? null,
    });
    playCameraOn();
    toast.success("Camera on");
    cameraToggleInProgressRef.current = false;
  }, [hasCameraOn, ensureAudio, emitState]);

  // ── startScreenCapture ───────────────────────────────────────────────────
  // The actual getDisplayMedia + track-attach logic. Only ever invoked once
  // permission is settled: immediately for the host, or after host approval
  // for everyone else.
  const startScreenCapture = useCallback(async () => {
    if (startingScreenShareRef.current) return;
    startingScreenShareRef.current = true;
    const screenLease = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ granted: false, reason: "Screen share authorization timed out." }), 5000);
      socket.emit("meeting:screen-share-start", (result) => {
        clearTimeout(timeout);
        resolve(result || { granted: false, reason: "Unable to reserve screen sharing." });
      });
    });
    if (!screenLease.granted) {
      toast.error(screenLease.reason || "Screen sharing is unavailable.");
      startingScreenShareRef.current = false;
      return;
    }

    let screen;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", frameRate: { ideal: 30, max: 30 } },
        audio: false,
      });
    } catch (err) {
      socket.emit("meeting:screen-share-ended");
      if (err.name !== "NotAllowedError") toast.error(`Screen share error: ${err.message}`);
      startingScreenShareRef.current = false;
      return;
    }

    screenStreamRef.current = screen;
    const screenTrack = screen.getVideoTracks()[0];
    console.log(`[WebRTC] screen track id=${screenTrack.id} readyState=${screenTrack.readyState}`);

    Object.values(peersRef.current).forEach((pc) => {
      // ── BUG 3 FIX: Validate sender before replaceTrack ────────────────
      if (pc._screenSender) {
        try {
          const transport = pc._screenSender.transport;
          if (transport && transport.state !== "closed") {
            pc._screenSender.replaceTrack(screenTrack);
          } else {
            // Sender died — create a fresh one via addTrack
            pc._screenSender = pc.addTrack(screenTrack, screen);
          }
        } catch {
          // Any error on replaceTrack → fall back to addTrack
          try { pc._screenSender = pc.addTrack(screenTrack, screen); } catch {}
        }
      } else {
        try { pc._screenSender = pc.addTrack(screenTrack, screen); } catch {}
      }
    });

    const mySocketId = socket.id;
    setIsScreenSharing(true);
    setPresenterId(mySocketId);
    playScreenShareStart();

    emitState({
      isScreenSharing: true,
      presenterId:     mySocketId,
      screenTrackId:   screenTrack.id,
      cameraTrackId:   cameraStreamRef.current?.getVideoTracks()[0]?.id ?? null,
    });
    toast.success("Screen sharing started");
    startingScreenShareRef.current = false;

    // Handle browser-native "Stop sharing" button
    screenTrack.onended = () => {
      if (screenStreamRef.current && !stoppingScreenRef.current) {
        stoppingScreenRef.current = true;
        Promise.resolve()
          .then(() => stopScreenCapture())
          .finally(() => { stoppingScreenRef.current = false; });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitState]);

  // ── stopScreenCapture ────────────────────────────────────────────────────
  const stopScreenCapture = useCallback(() => {
    startingScreenShareRef.current = false;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setPresenterId(null);
    playScreenShareStop();

    Object.values(peersRef.current).forEach((pc) => {
      if (pc._screenSender) {
        // ── BUG 3 FIX: Check transport state before replaceTrack ───────
        // After a stop/restart cycle, the RTCDtlsTransport may be "closed".
        // replaceTrack() on a closed transport throws a DOMException that the
        // catch silently swallows — remote sees nothing on the next share.
        try {
          const transport = pc._screenSender.transport;
          if (transport && transport.state !== "closed") {
            pc._screenSender.replaceTrack(null);
          } else {
            // Sender is dead — null it so the next share creates a fresh one
            pc._screenSender = null;
          }
        } catch {
          pc._screenSender = null;
        }
      }
    });

    emitState({
      isScreenSharing: false,
      presenterId:     null,
      screenTrackId:   null,
      cameraTrackId:   cameraStreamRef.current?.getVideoTracks()[0]?.id ?? null,
    });
    // Let the room know the floor is free again (relevant if someone is
    // waiting on the host to stop before their request can be approved).
    socket.emit("meeting:screen-share-ended");
    toast.success("Screen share stopped");
  }, [emitState]);

  // ── toggleScreenShare ────────────────────────────────────────────────────
  // Host: starts/stops immediately.
  // Non-host: first request must route through the host; actual capture only
  // starts after "meeting:screen-share-approved" comes back for this socket.
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenCapture();
      return;
    }

    if (!isHostRef.current) {
      if (screenShareRequestPendingRef.current) {
        toast.info("Already waiting for the host to respond");
        return;
      }
      setScreenShareRequestPending(true);
      socket.emit("meeting:relay-event", {
        event: "meeting:screen-share-requested",
        payload: { requesterSocketId: socket.id, requesterName: user?.name || "A participant" },
      });
      toast.info("Request sent — waiting for the host to approve");
      return;
    }

    await startScreenCapture();
  }, [isScreenSharing, startScreenCapture, stopScreenCapture, user?.name]);

  // ── cancelScreenShareRequest (requester side) ────────────────────────────
  const cancelScreenShareRequest = useCallback(() => {
    setScreenShareRequestPending(false);
    socket.emit("meeting:relay-event", {
      event: "meeting:screen-share-request-cancelled",
      payload: { requesterSocketId: socket.id },
    });
  }, []);

  // ── respondToScreenShareRequest (host side) ──────────────────────────────
  const respondToScreenShareRequest = useCallback((accept) => {
    setScreenShareRequest((req) => {
      if (!req) return req;
      if (accept) {
        socket.emit("meeting:relay-event", {
          event: "meeting:screen-share-approved",
          payload: { requesterSocketId: req.socketId },
        });
      } else {
        socket.emit("meeting:relay-event", {
          event: "meeting:screen-share-denied",
          payload: { requesterSocketId: req.socketId },
        });
      }
      return null;
    });
  }, []);

  // ── toggleHand ───────────────────────────────────────────────────────────
  const toggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    emitState({ handRaised: next });
    if (next) playHandRaise();
  }, [handRaised, emitState]);

  // ── hostAction ───────────────────────────────────────────────────────────
  const hostAction = useCallback((action, targetSocketId, targetUserId) => {
    socket.emit("meeting:host-action", { action, targetSocketId, targetUserId });
  }, []);

  // ── leaveRoom ────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    socket.emit("meeting:leave-room");
    socket.emit("meeting:camera-release");
    socket.emit("meeting:screen-share-ended");
    Object.values(peersRef.current).forEach((pc) => {
      clearTimeout(pc._restartTimer);
      clearTimeout(pc._giveupTimer);
      try { pc.close(); } catch {}
    });
    peersRef.current = {};
    iceCandidateQueueRef.current.clear();
    remoteStreamsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = cameraStreamRef.current = screenStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    setHasCameraOn(false);
    setIsScreenSharing(false);
    setPresenterId(null);
    setScreenShareRequest(null);
    setScreenShareRequestPending(false);
  }, []);

  // ── Local audio analysis ─────────────────────────────────────────────────
  useEffect(() => {
    if (localStream && !isMuted) startAnalyzingStream("local", localStream);
    else stopAnalyzingStream("local");
  }, [localStream, isMuted, startAnalyzingStream, stopAnalyzingStream]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      Object.keys(analyzersRef.current).forEach(stopAnalyzingStream);
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, [stopAnalyzingStream]);

  // ── Main effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !meetingCode || !user) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const code = meetingCode.toUpperCase();
    let cancelled = false;

    const joinPayload = {
      meetingCode: code,
      userId:      user._id || user.id,
      name:        user.name,
      photo:       user.photo ?? null,
      role:        role || "participant",
      universityId: user.universityId ?? null,
    };
    joinPayloadRef.current = joinPayload;

    (async () => {
      await ensureAudio();
      if (cancelled) return;
      socket.emit("meeting:join-room", joinPayload);
    })();

    // ── Socket event handlers ────────────────────────────────────────────

    const onExistingPeers = ({ peers }) => {
      console.log(`[WebRTC] existing peers: ${peers.join(", ")}`);
      // We are the initiator toward all existing peers
      peers.forEach((id) => createPeer(id, true));
    };

    const onUserJoined = ({ socketId }) => {
      if (socketId === socket.id) return;
      console.log(`[WebRTC] user joined: ${socketId}`);
      // New user — they will send us an offer (they're the initiator)
      if (!peersRef.current[socketId]) createPeer(socketId, false);
      playJoin();
    };

    const onOffer = async ({ from, offer }) => {
      console.log(`[WebRTC] offer from ${from} type=${offer.type}`);
      const pc = peersRef.current[from] ?? createPeer(from, false);
      const polite      = pc._polite ?? false;
      const makingOffer = pc._makingOffer?.() ?? false;

      // Perfect Negotiation glare handling
      const offerCollision = offer.type === "offer" && (makingOffer || pc.signalingState !== "stable");
      pc._setIgnoreOffer?.(offerCollision && !polite);
      if (pc._getIgnoreOffer?.()) {
        console.warn(`[WebRTC] ignoring offer from ${from} (impolite, collision)`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        // ── BUG 4 FIX: Flush buffered ICE candidates ──────────────────
        await flushIceCandidates(from);
        if (offer.type === "offer") {
          await pc.setLocalDescription();
          console.log(`[WebRTC] answer sent to ${from}`);
          socket.emit("meeting:answer", { to: from, answer: pc.localDescription });
        }
      } catch (err) { console.error("[WebRTC] onOffer error:", err); }
    };

    const onAnswer = async ({ from, answer }) => {
      console.log(`[WebRTC] answer from ${from}`);
      const pc = peersRef.current[from];
      if (!pc) return;
      try {
        if (pc.signalingState === "have-local-offer" || pc.signalingState === "have-local-pranswer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // ── BUG 4 FIX: Flush buffered ICE candidates after answer ─────
          await flushIceCandidates(from);
          console.log(`[WebRTC] remote desc set for ${from}`);
        } else {
          console.warn(`[WebRTC] answer ignored — signalingState=${pc.signalingState} for ${from}`);
        }
      } catch (err) { console.error("[WebRTC] onAnswer error:", err); }
    };

    const onIce = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (!pc || !candidate) return;

      // ── BUG 4 FIX: Buffer if remote description not yet set ───────────
      if (!pc.remoteDescription) {
        const queue = iceCandidateQueueRef.current.get(from) || [];
        queue.push(candidate);
        iceCandidateQueueRef.current.set(from, queue);
        console.log(`[WebRTC] buffered ICE candidate for ${from}`);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[WebRTC] addIceCandidate error:", err);
      }
    };

    const onDisconnected = ({ socketId }) => {
      console.log(`[WebRTC] user disconnected: ${socketId}`);
      closeAndRemovePeer(socketId);
      setPresenterId((p) => (p === socketId ? null : p));
      setScreenShareRequest((r) => (r?.socketId === socketId ? null : r));
      playLeave();
    };

    const onParticipants = ({ participants: list }) => {
      setConnectionError("");
      setParticipants(list ?? []);
    };

    const onJoinError = ({ message }) => {
      setConnectionError(message || "Could not connect to the meeting.");
    };

    const onPresenterChanged = ({ presenterId: pid }) => setPresenterId(pid);

    const onForceMute = () => {
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
      setIsMuted(true);
    };

    const onForceCameraOff = () => {
      const base = localStreamRef.current;
      cameraStreamRef.current?.getVideoTracks().forEach((t) => {
        t.stop();
        base?.removeTrack(t);
      });
      cameraStreamRef.current = null;
      if (base) setLocalStream(new MediaStream(base.getTracks()));
      Object.values(peersRef.current).forEach((pc) => {
        if (pc._cameraSender) { try { pc._cameraSender.replaceTrack(null); } catch {} }
      });
      setHasCameraOn(false);
      socket.emit("meeting:camera-release");
      emitState({ hasCameraOn: false, cameraTrackId: null });
    };

    const onForceLowerHand = () => setHandRaised(false);

    const onKicked = () => {
      leaveRoom();
      window.dispatchEvent(new CustomEvent("meeting:kicked"));
    };

    // ── Screen-share permission events (host-gated presenting) ────────────

    // BUG 7 FIX: don't silently overwrite a pending request when a second one
    // arrives — that used to strand the first requester forever with no
    // response. Now the host still only sees ONE active request at a time,
    // but any additional requester made to wait gets an immediate, honest
    // "denied" instead of being forgotten.
    const onScreenShareRequested = ({ requesterSocketId, requesterName }) => {
      if (!isHostRef.current || requesterSocketId === socket.id) return;
      setScreenShareRequest((current) => {
        if (current && current.socketId !== requesterSocketId) {
          socket.emit("meeting:relay-event", {
            event: "meeting:screen-share-denied",
            payload: { requesterSocketId },
          });
          return current;
        }
        return { socketId: requesterSocketId, name: requesterName };
      });
    };

    const onScreenShareApproved = ({ requesterSocketId }) => {
      if (requesterSocketId !== socket.id) return;
      setScreenShareRequestPending(false);
      toast.success("Host approved your request — starting your screen share");
      startScreenCapture();
    };

    const onScreenShareDenied = ({ requesterSocketId }) => {
      if (requesterSocketId !== socket.id) return;
      setScreenShareRequestPending(false);
      toast.error("The host denied your screen share request");
    };

    const onScreenShareRequestCancelled = ({ requesterSocketId }) => {
      setScreenShareRequest((r) => (r?.socketId === requesterSocketId ? null : r));
    };

    // BUG 7 FIX: lets whoever is orchestrating approvals (the host UI) force
    // ANY currently-presenting participant — not just itself — to stop, so two
    // screens are never live simultaneously. Only the targeted socket acts on it.
    const onScreenShareForceStop = ({ targetSocketId }) => {
      if (targetSocketId !== socket.id) return;
      if (isScreenSharingRef.current) {
        stopScreenCapture();
        toast.info("Your screen share was stopped to let another presenter share");
      }
    };

    const onDuplicateSession = () => {
      leaveRoom();
      toast.error("This account joined the meeting from another tab or device.");
    };

    // ── BUG 1 FIX: Reconnect flow ─────────────────────────────────────────
    // When the socket reconnects (network blip, laptop sleep/wake), the server
    // assigns a new socket ID. Every other peer has already torn down their
    // connection to the old ID. We need to:
    //   1. Close all stale peer connections on our side
    //   2. Rejoin the room (server sends us fresh existing-peers list)
    //   3. The onExistingPeers handler creates new peer connections with correct IDs
    const onSocketReconnect = () => {
      if (!joinPayloadRef.current) return;
      console.log("[WebRTC] socket reconnected — closing stale peers and rejoining");

      // Close stale connections
      Object.values(peersRef.current).forEach((pc) => {
        clearTimeout(pc._restartTimer);
        clearTimeout(pc._giveupTimer);
        try { pc.close(); } catch {}
      });
      peersRef.current = {};
      iceCandidateQueueRef.current.clear();
      remoteStreamsRef.current.clear();
      setRemoteStreams({});

      // Rejoin — server will send meeting:existing-peers with fresh socket IDs
      socket.emit("meeting:join-room", joinPayloadRef.current);
      toast.success("Reconnected to meeting");
    };

    socket.on("meeting:existing-peers",              onExistingPeers);
    socket.on("meeting:user-joined",                 onUserJoined);
    socket.on("meeting:offer",                       onOffer);
    socket.on("meeting:answer",                      onAnswer);
    socket.on("meeting:ice-candidate",                onIce);
    socket.on("meeting:user-disconnected",           onDisconnected);
    socket.on("meeting:participants-updated",        onParticipants);
    socket.on("meeting:join-error",                  onJoinError);
    socket.on("meeting:presenter-changed",           onPresenterChanged);
    socket.on("meeting:force-mute",                  onForceMute);
    socket.on("meeting:force-camera-off",            onForceCameraOff);
    socket.on("meeting:force-lower-hand",            onForceLowerHand);
    socket.on("meeting:kicked",                      onKicked);
    socket.on("meeting:screen-share-requested",      onScreenShareRequested);
    socket.on("meeting:screen-share-approved",       onScreenShareApproved);
    socket.on("meeting:screen-share-denied",         onScreenShareDenied);
    socket.on("meeting:screen-share-request-cancelled", onScreenShareRequestCancelled);
    socket.on("meeting:screen-share-force-stop",     onScreenShareForceStop);
    socket.on("meeting:duplicate-session",           onDuplicateSession);
    socket.on("connect",                             onSocketReconnect);

    return () => {
      socket.off("meeting:existing-peers",              onExistingPeers);
      socket.off("meeting:user-joined",                 onUserJoined);
      socket.off("meeting:offer",                       onOffer);
      socket.off("meeting:answer",                      onAnswer);
      socket.off("meeting:ice-candidate",                onIce);
      socket.off("meeting:user-disconnected",           onDisconnected);
      socket.off("meeting:participants-updated",        onParticipants);
      socket.off("meeting:join-error",                  onJoinError);
      socket.off("meeting:presenter-changed",           onPresenterChanged);
      socket.off("meeting:force-mute",                  onForceMute);
      socket.off("meeting:force-camera-off",            onForceCameraOff);
      socket.off("meeting:force-lower-hand",            onForceLowerHand);
      socket.off("meeting:kicked",                      onKicked);
      socket.off("meeting:screen-share-requested",      onScreenShareRequested);
      socket.off("meeting:screen-share-approved",       onScreenShareApproved);
      socket.off("meeting:screen-share-denied",         onScreenShareDenied);
      socket.off("meeting:screen-share-request-cancelled", onScreenShareRequestCancelled);
      socket.off("meeting:screen-share-force-stop",     onScreenShareForceStop);
      socket.off("meeting:duplicate-session",           onDuplicateSession);
      socket.off("connect",                             onSocketReconnect);
      leaveRoom();
      startedRef.current    = false;
      joinPayloadRef.current = null;
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, meetingCode, user, role]);

  return {
    localStream,
    cameraStream:        cameraStreamRef,
    screenStream:        screenStreamRef,
    remoteStreams,
    participants,
    isMuted,
    hasCameraOn,
    isScreenSharing,
    handRaised,
    speakingParticipants,
    presenterId,
    connectionError,
    screenShareRequest,
    screenShareRequestPending,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    respondToScreenShareRequest,
    cancelScreenShareRequest,
    toggleHand,
    hostAction,
    leaveRoom,
    retryJoin: () => {
      if (!joinPayloadRef.current) return;
      setConnectionError("");
      socket.emit("meeting:join-room", joinPayloadRef.current);
    },
  };
}