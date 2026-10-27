/**
 * VideoTile.jsx — Single participant video feed for the UNISO meeting room.
 *
 * Bug fix (BUG 5):
 *   A new AudioContext was created on every [stream, muted] change.
 *   In a 6-person meeting, toggling mute would rapidly spawn 6+ contexts,
 *   hitting the browser's concurrent limit (~6) and throwing NotAllowedError.
 *   Fix: one AudioContext per component mount (ref). Only the MediaStreamSource
 *   node is recreated when the stream changes.
 *
 * Bug fix (BUG 6 — "kit kit" black-screen blink):
 *   The parent rebuilds a fresh `MediaStream` wrapper around the same
 *   underlying tracks on every re-render (e.g. once a second from the meeting
 *   timer). Because the new wrapper is a different object, the old binding
 *   effect saw `stream !== videoRef.current.srcObject` and reassigned
 *   `srcObject` every single time, which briefly blacks out the <video>
 *   element even though nothing about the media actually changed.
 *   Fix: before reassigning srcObject, compare the *track ids* of the
 *   incoming stream against what's already playing. If they're identical,
 *   skip the reassignment entirely.
 *
 * Design: Always dark background (#1a1a1a) — a video room is always dark
 * regardless of the app-level light/dark theme.
 *
 * Colors: Duolingo palette (#2C2DE0 green, white, black). No changes.
 */

import React, { useEffect, useRef, useState, memo } from "react";
import { Mic, MicOff, Hand, MonitorUp, Volume2 } from "lucide-react";
import { getInitials, resolvePhoto } from "../ui";

// Returns true if `a` and `b` are streams (or null) wrapping the exact same
// set of tracks, regardless of whether they're the same MediaStream instance.
function sameTracks(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const idsA = a.getTracks().map((t) => t.id).sort();
  const idsB = b.getTracks().map((t) => t.id).sort();
  if (idsA.length === 0 || idsA.length !== idsB.length) return false;
  return idsA.every((id, i) => id === idsB[i]);
}

function SpeakingWave() {
  return (
    <div className="flex items-end gap-0.5 h-3 px-1 bg-[#2C2DE0]/20 border border-[#2C2DE0]/30 rounded shrink-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes wave-bar-1 { 0%, 100% { height: 3px; } 50% { height: 10px; } }
        @keyframes wave-bar-2 { 0%, 100% { height: 4px; } 50% { height: 12px; } }
        @keyframes wave-bar-3 { 0%, 100% { height: 2px; } 50% { height: 8px;  } }
        .wave-bar-1 { animation: wave-bar-1 0.6s ease-in-out infinite; }
        .wave-bar-2 { animation: wave-bar-2 0.8s ease-in-out infinite; }
        .wave-bar-3 { animation: wave-bar-3 0.5s ease-in-out infinite; }
      `}} />
      <span className="w-0.5 bg-[#2C2DE0] rounded-full wave-bar-1" />
      <span className="w-0.5 bg-[#2C2DE0] rounded-full wave-bar-2" />
      <span className="w-0.5 bg-[#2C2DE0] rounded-full wave-bar-3" />
    </div>
  );
}

export const VideoTile = memo(function VideoTile({
  stream,
  pipStream,
  name = "Participant",
  role = "Student",
  photo = null,
  muted = true,
  isLocal = false,
  handRaised = false,
  isScreenSharing = false,
  isSpeaking: externalIsSpeaking = false,
  isPinned = false,
  onPin,
  compact = false,
  universityId = null,

  // ADD
  socketId = null,
  presenterId = null,
}) {
  const videoRef = useRef(null);
  const pipRef = useRef(null);
  const isPresenter = socketId === presenterId;

  // BUG 5 FIX: Single AudioContext per component mount.
  // We store the context in a ref so it persists across stream changes.
  // Only the MediaStreamSource node is recreated when the stream changes.
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);

  const [localIsSpeaking, setLocalIsSpeaking] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const isSpeaking = externalIsSpeaking || localIsSpeaking;

  const hasCameraOn =
    stream?.getVideoTracks()?.some((t) => t.enabled) ?? false;

  // ── Video element binding ──────────────────────────────────────────────
  // BUG 6 FIX: only touch srcObject when the underlying tracks actually
  // changed — not just when the wrapper MediaStream instance changed.
  useEffect(() => {
    if (!videoRef.current) return;
    if (sameTracks(videoRef.current.srcObject, stream)) return;
    videoRef.current.srcObject = stream ?? null;
    if (stream && videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setPlaybackBlocked(false))
        .catch((error) => {
          if (!isLocal && stream.getAudioTracks().length) setPlaybackBlocked(true);
          console.warn("Remote meeting playback blocked:", error);
        });
    }
  }, [stream, isLocal]);

  useEffect(() => {
    if (!pipRef.current) return;
    if (sameTracks(pipRef.current.srcObject, pipStream)) return;
    pipRef.current.srcObject = pipStream ?? null;
  }, [pipStream]);

  // ── BUG 5 FIX: Audio activity detection — reuse single AudioContext ────
  // The AudioContext is created once on mount and closed on unmount.
  // When stream/muted changes, we only disconnect/reconnect the source node.
  useEffect(() => {
    // Clean up previous source/analyser connections
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { } sourceRef.current = null; }

    if (!stream || muted) {
      setLocalIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLocalIsSpeaking(false);
      return;
    }

    let active = true;

    try {
      // Get-or-create a SINGLE AudioContext for this tile's lifetime
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // Create analyser only once, or reuse if it already exists
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
      const analyser = analyserRef.current;

      // Reconnect a fresh source node for the new stream
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!active) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        setLocalIsSpeaking(average > 8);
        rafRef.current = requestAnimationFrame(checkVolume);
      };
      rafRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn("[VideoTile] audio analyser error:", err);
    }

    return () => {
      active = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { } sourceRef.current = null; }
      setLocalIsSpeaking(false);
    };
  }, [stream, muted]);

  // Close the AudioContext when the tile is unmounted
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.disconnect(); } catch { }
      audioCtxRef.current?.close().catch(() => { });
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, []);

  const hasLiveVideo =
    (hasCameraOn || isScreenSharing) &&
    (stream?.getVideoTracks()?.some((t) => t.enabled && t.readyState === "live") ?? false);

  const photoUrl = resolvePhoto(photo);

  return (
    <div
      className={[
        "relative rounded-2xl overflow-hidden bg-[#1a1a1a] group select-none aspect-video transition-all duration-200",
        isSpeaking ? "ring-2 ring-[#2C2DE0] shadow-[0_0_0_4px_rgba(44,45,224,0.2)]" : "ring-1 ring-white/10",
        isPinned ? "ring-2 ring-[#2C2DE0]" : "",
      ].join(" ")}
    >
      <style>{`
        @keyframes wave-pulse {
          0%, 100% { height: 3px; }
          50%       { height: 13px; }
        }
        .animate-wave-1 { animation: wave-pulse 0.6s ease-in-out infinite; }
        .animate-wave-2 { animation: wave-pulse 0.6s ease-in-out infinite 0.15s; }
        .animate-wave-3 { animation: wave-pulse 0.6s ease-in-out infinite 0.3s; }
      `}</style>

      {/* ── Main feed always rendered so srcObject persists ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 h-full w-full ${isScreenSharing ? "object-contain" : "object-cover"} transition-opacity duration-300 ${
          hasLiveVideo ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
      />
      {playbackBlocked && !isLocal && stream?.getAudioTracks()?.length > 0 && (
        <button
          type="button"
          onClick={() => videoRef.current?.play()
            .then(() => setPlaybackBlocked(false))
            .catch((error) => console.warn("Remote meeting playback remains blocked:", error))}
          className="absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg bg-black/85 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2DE0]"
        >
          <Volume2 size={14} />
          Enable audio
        </button>
      )}
      
      {/* ── Avatar fallback (shown only if no live video) ── */}
      {!hasLiveVideo && (
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] px-3 z-0"
          style={{ gap: compact ? 6 : 16 }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className={[
                "rounded-full object-cover ring-4 ring-[#2C2DE0]/30 shrink-0",
                compact ? "w-12 h-12" : "w-20 h-20",
              ].join(" ")}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div
              className={[
                "rounded-full flex items-center justify-center bg-[#2C2DE0] text-white shrink-0 font-black",
                compact ? "w-12 h-12 text-base" : "w-20 h-20 text-3xl",
              ].join(" ")}
            >
              {getInitials(name)}
            </div>
          )}

          <div className="text-center w-full">
            <p className={["text-white font-bold truncate", compact ? "text-[11px]" : "text-sm"].join(" ")}>
              {name}{isLocal ? " (You)" : ""}
            </p>
            {universityId && (
              <p className={["text-[#2C2DE0]/80 font-mono mt-0.5", compact ? "text-[9px]" : "text-[11px]"].join(" ")}>
                {universityId}
              </p>
            )}
            {!compact && (
              <p className="text-white/40 text-xs capitalize mt-1">{role}</p>
            )}
          </div>
        </div>
      )}



      {isScreenSharing && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#2C2DE0] px-2.5 py-1 rounded-full text-black text-[10px] font-black z-10 shadow-lg drop-shadow-md">

          <MonitorUp size={11} />

          {isPresenter ? (
            "You are presenting"
          ) : (
            `${name} is presenting`
          )}

        </div>
      )}
      {/* ── Speaking ring ── */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-[#2C2DE0] animate-pulse pointer-events-none z-10" />
      )}




      {/* ── Pin toggle ── */}
      {onPin && (
        <button
          onClick={onPin}
          title={isPinned ? "Unpin" : "Pin"}
          className={[
            "absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg drop-shadow-md font-bold",
            isPinned ? "bg-[#2C2DE0] text-black hover:bg-[#3A3BE8]" : "bg-black/80 text-white hover:bg-black/95",
          ].join(" ")}
        >
          {isPinned ? "📌" : "📍"}
        </button>
      )}
    </div>
  );
});