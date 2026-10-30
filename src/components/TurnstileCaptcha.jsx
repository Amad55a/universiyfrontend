import React, { useEffect, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { isLocalTurnstileBypassEnabled } from "@/config/turnstile";

export default function TurnstileCaptcha({ onVerify, onError, onExpire, className = "" }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const reportedBypass = useRef(false);

  useEffect(() => {
    if (isLocalTurnstileBypassEnabled && !reportedBypass.current) {
      reportedBypass.current = true;
      onVerify?.("dev-bypass");
    }
  }, [onVerify]);

  if (isLocalTurnstileBypassEnabled) {
    return (
      <div className={`my-3 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 ${className}`}>
        Turnstile is bypassed for local development only.
      </div>
    );
  }

  if (!siteKey) {
    return (
      <div
        role="alert"
        className={`my-3 w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 ${className}`}
      >
        Human verification is not configured. Set VITE_TURNSTILE_SITE_KEY, or enable
        the local development bypass in both frontend and backend configuration.
      </div>
    );
  }

  return (
    <div className={`my-3 w-full ${className}`}>
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onVerify && onVerify(token)}
        onError={(err) => onError && onError(err)}
        onExpire={() => onExpire && onExpire()}
        options={{
          theme: "light",
          size: "flexible",
        }}
      />
    </div>
  );
}