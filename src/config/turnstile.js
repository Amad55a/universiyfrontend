const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalBrowserHost =
  typeof window !== "undefined" && localHostnames.has(window.location.hostname.toLowerCase());

export const isLocalTurnstileBypassEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_TURNSTILE_DEV_BYPASS === "true" &&
  isLocalBrowserHost;

export const isTurnstileEnabled = !isLocalTurnstileBypassEnabled;
