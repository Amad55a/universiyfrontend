import { USER_FEATURE_KEYS } from "@/api/admin";

export const getCurrentStatus = (user) => {
  if (typeof user?.accountStatus === "string") return user.accountStatus;
  if (typeof user?.status === "string") return user.status;
  if (typeof user?.isActive === "boolean") return user.isActive ? "active" : "suspended";
  return "unknown";
};

export const normalizeOverrides = (raw) => {
  const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw || {});
  return Object.fromEntries(entries.filter(([, value]) => value === true || value === false));
};

export const createPermissionOverridePatch = (before, after, keys = USER_FEATURE_KEYS) => {
  const patch = {};
  for (const key of keys) {
    const hadOverride = Object.prototype.hasOwnProperty.call(before, key);
    const hasOverride = Object.prototype.hasOwnProperty.call(after, key);
    const previous = hadOverride ? before[key] : undefined;
    const next = hasOverride ? after[key] : undefined;
    if (previous !== next) patch[key] = hasOverride ? next : null;
  }
  return patch;
};
