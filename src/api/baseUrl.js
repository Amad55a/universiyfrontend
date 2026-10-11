const DEFAULT_BACKEND_URL = "/api/v1";

export const resolveApiBaseUrl = (provided = "", host = "") => {
  const raw = String(provided ?? "").trim();

  if (raw) {
    const cleaned = raw.replace(/\/+$/u, "");

    if (/^https?:\/\//u.test(cleaned)) {
      return cleaned.endsWith("/api/v1") || cleaned.endsWith("/api")
        ? cleaned
        : `${cleaned}/api/v1`;
    }

    if (cleaned.startsWith("/")) {
      return cleaned.includes("/api/v1") || cleaned.includes("/api")
        ? cleaned
        : `${cleaned}/api/v1`;
    }

    return `/${cleaned}`;
  }

  return DEFAULT_BACKEND_URL;
};

export const resolveApiOrigin = (provided = "") => {
  const baseUrl = resolveApiBaseUrl(provided);
  return /^https?:\/\//iu.test(baseUrl) ? new URL(baseUrl).origin : "";
};

export const buildGoogleAuthUrl = (provided = "", host = "") => {
  const baseUrl = resolveApiBaseUrl(provided, host);
  return `${baseUrl}/auth/google`;
};
