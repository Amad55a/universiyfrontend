/**
 * Practical camera monitor — requires webcam when exam.security.cameraRequired.
 * Shows a small preview, sends heartbeats + periodic JPEG snapshots for teacher review.
 * Does NOT run ML face detection; missing camera is flagged for the lecturer.
 */
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Camera, CameraOff, Mic, MicOff } from "lucide-react";

export default function ExamCameraMonitor({
  examId,
  required = false,
  microphoneRequired = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const cameraOkRef = useRef(false);
  const microphoneOkRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cameraOk, setCameraOk] = useState(false);
  const [microphoneOk, setMicrophoneOk] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if ((!required && !microphoneRequired) || !examId) return;
    let cancelled = false;
    let heartbeatTimer;
    let snapshotTimer;
    let mediaDeviceChangeHandler;

    const sendHeartbeat = async (snapshot = null, note) => {
      const body = {};
      if (required) body.cameraOk = cameraOkRef.current;
      if (microphoneRequired) body.microphoneOk = microphoneOkRef.current;
      if (snapshot) body.snapshot = snapshot;
      if (note) body.note = note;
      try {
        await axios.post(`/api/exams/student/${examId}/proctor-heartbeat`, body);
        if (
          !cancelled &&
          (!required || cameraOkRef.current) &&
          (!microphoneRequired || microphoneOkRef.current)
        ) {
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't contact the exam monitoring service. Check your connection and retry.");
        }
      }
    };

    const captureSnapshot = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return null;
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.55);
    };

    const startCamera = async () => {
      if (!required) return true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return false;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        return true;
      } catch (err) {
        if (!cancelled) setError(err?.message || "Camera permission denied");
        return false;
      }
    };

    const checkMicrophone = async () => {
      if (!microphoneRequired) return true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err) {
        if (!cancelled) setError(err?.message || "Microphone permission denied");
        return false;
      }
    };

    const start = async () => {
      const [hasCamera, hasMicrophone] = await Promise.all([
        startCamera(),
        checkMicrophone(),
      ]);
      if (cancelled) return;

      cameraOkRef.current = hasCamera;
      microphoneOkRef.current = hasMicrophone;
      setCameraOk(hasCamera);
      setMicrophoneOk(hasMicrophone);
      await sendHeartbeat(
        undefined,
        (!hasCamera && required)
          ? "camera_denied"
          : (!hasMicrophone && microphoneRequired)
            ? "microphone_denied"
            : undefined,
      );

      heartbeatTimer = setInterval(() => {
        const alive = required
          ? streamRef.current?.getVideoTracks?.()?.[0]?.readyState === "live"
          : true;
        cameraOkRef.current = alive;
        setCameraOk(alive);
        sendHeartbeat(
          undefined,
          !alive && required ? "camera_lost" : undefined,
        );
      }, 12_000);

      if (required) {
        snapshotTimer = setInterval(() => {
          const snap = captureSnapshot();
          if (snap) sendHeartbeat(snap);
        }, 30_000);
      }

      if (microphoneRequired && navigator.mediaDevices?.addEventListener) {
        mediaDeviceChangeHandler = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const available = devices.some((device) => device.kind === "audioinput");
            if (cancelled || available === microphoneOkRef.current) return;
            microphoneOkRef.current = available;
            setMicrophoneOk(available);
            sendHeartbeat(undefined, available ? undefined : "microphone_lost");
          } catch {
            if (!cancelled) setError("Couldn't check microphone availability. Retry the device check.");
          }
        };
        navigator.mediaDevices.addEventListener("devicechange", mediaDeviceChangeHandler);
      }
    };

    start();

    return () => {
      cancelled = true;
      clearInterval(heartbeatTimer);
      clearInterval(snapshotTimer);
      if (mediaDeviceChangeHandler) {
        navigator.mediaDevices?.removeEventListener?.("devicechange", mediaDeviceChangeHandler);
      }
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [examId, required, microphoneRequired, retryCount]);

  if (!required && !microphoneRequired) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] w-52 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-600 shadow-lg bg-black/90">
      {required && (
        <>
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 bg-black/60">
            {cameraOk ? <Camera className="w-3 h-3 text-emerald-400" /> : <CameraOff className="w-3 h-3 text-red-400" />}
            {cameraOk ? "Camera on" : "Camera required"}
          </div>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-28 object-cover bg-neutral-900"
          />
        </>
      )}
      {microphoneRequired && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          {microphoneOk ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
          {microphoneOk ? "Microphone available (not recording)" : "Microphone required"}
        </div>
      )}
      {required && <canvas ref={canvasRef} className="hidden" />}
      {error && (
        <div className="px-2 py-1 text-[10px] text-red-300 bg-red-950/80">
          <p>{error}</p>
          <button
            type="button"
            className="mt-1 underline"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry device check
          </button>
        </div>
      )}
    </div>
  );
}
