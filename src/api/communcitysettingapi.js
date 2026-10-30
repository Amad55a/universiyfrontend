import api from "@/api/client";

// ── Profile (bio + skills only — academic fields are read-only, verified data) ──
export const getMySettings = () =>
  api.get("/communityusers/settings").then((r) => r.data);

export const updateProfile = ({ 
  bio, 
  skills, 
  photoFile, 
  displayName, 
  username,
  name, 
  phone, 
  department, 
  preferredLanguage 
}) => {
  const fd = new FormData();
  if (bio !== undefined) fd.append("bio", bio);
  if (skills !== undefined) fd.append("skills", JSON.stringify(skills));
  if (displayName !== undefined) fd.append("displayName", displayName);
  if (username !== undefined) fd.append("username", username);
  if (name !== undefined) fd.append("name", name);
  if (phone !== undefined) fd.append("phone", phone);
  if (department !== undefined) fd.append("department", department);
  if (preferredLanguage !== undefined) fd.append("preferredLanguage", preferredLanguage);
  if (photoFile) fd.append("photo", photoFile);
  return api
    .put("/communityusers/settings/profile", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ── Notifications ──
export const updateNotificationPrefs = (prefs) =>
  api.put("/communityusers/settings/notifications", prefs).then((r) => r.data);

// ── Privacy ──
export const updatePrivacyPrefs = (prefs) =>
  api.put("/communityusers/settings/privacy", prefs).then((r) => r.data);

// ── Security ──
export const changePassword = ({ currentPassword, newPassword }) =>
  api
    .put("/auth/update-password", { currentPassword, newPassword })
    .then((r) => r.data);

export const getActiveSessions = () =>
  api.get("/auth/sessions").then((r) => r.data);

export const logoutOtherDevices = () =>
  api.post("/auth/logout-others").then((r) => r.data);