import { createContext, useContext, useEffect, useState } from "react";
import api, { setAccessToken } from "@/api/client";

const AuthContext = createContext();

// Your /auth/me response returns `id`, but the rest of the app (PostCard,
// Feed, UserDetailsPage, socket event matching, etc.) all compare against
// `user._id` (the Mongo convention). Rather than hunt down every `_id`
// reference across the app, normalize once here so both keys always work.
const normalizeUser = (u) => {
  if (!u) return u;
  return { ...u, _id: u._id ?? u.id };
};

const fetchCurrentUser = async () => {
  const { data } = await api.get("/auth/me", { withCredentials: true });
  return normalizeUser(data.data || data.user);
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const userObj = await fetchCurrentUser();
        if (cancelled) return;
        setUser(userObj);
      } catch (err) {
        // The shared API client already performs one coordinated refresh and retry.
        if (err?.response?.status !== 401) {
          console.error("[AuthContext] auth check failed", err?.response?.status, err?.message);
        }

        if (cancelled) return;

        // If no server session, allow a persisted guest session (from Enter as Guest)
        const guestRaw = localStorage.getItem("guestUser");
        if (guestRaw) {
          try {
            const guestObj = normalizeUser(JSON.parse(guestRaw));
            setUser(guestObj);
          } catch {
            console.warn("[AuthContext] invalid guestUser in localStorage, clearing");
            localStorage.removeItem("guestUser");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (userData) => {
    // clear any guest marker when a real user logs in
    localStorage.removeItem("guestUser");
    setUser(normalizeUser(userData));
  };

  const logout = async () => {
    let serverLogoutSucceeded = true;
    try {
      if (user?.role !== "guest") {
        await api.post("/auth/logout", {}, { withCredentials: true });
      }
    } catch (error) {
      serverLogoutSucceeded = false;
      console.warn("[AuthContext] server logout failed; clearing local session", error);
    } finally {
      localStorage.removeItem("guestUser");
      setAccessToken(null);
      setUser(null);
    }

    return serverLogoutSucceeded;
  };

  const updateUser = (userData) => {
    if (!userData) return;
    // Merge with existing user so partial profile updates (photo/name) keep other fields
    setUser((prev) => normalizeUser(prev ? { ...prev, ...userData } : userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
export const useAuth = () => useContext(AuthContext);
