/**
 * useSocketSync Hook — fixed version
 *
 * Fixes:
 * 1. useNavigate() must be called inside BrowserRouter — moved to a
 *    "status changed" handler that fires inside the tree, not at module init.
 * 2. Registration is now truly stable (runs once per mount, not per render).
 * 3. identify is re-sent on every reconnect.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerSocketListeners, unregisterSocketListeners } from "./listeners";
import socket from "../socket";
import { useAuth } from "../context/AuthContext";

export const useSocketSync = () => {
    const queryClient = useQueryClient();
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate(); // ✅ safe here — this hook is used inside <BrowserRouter>
    const userId = user?._id ?? user?.id;
    const isRegistered = useRef(false);
    // Keep a stable ref to the latest user so the socket handler always sees it
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // ── Register socket listeners ONCE on mount ───────────────────────────
    useEffect(() => {
        if (!isRegistered.current && queryClient) {
            registerSocketListeners(queryClient, () => userRef.current?._id ?? userRef.current?.id);
            isRegistered.current = true;
        }
        return () => {
            if (isRegistered.current) {
                unregisterSocketListeners();
                isRegistered.current = false;
            }
        };
    }, [queryClient]); // queryClient is stable — this truly runs once

    useEffect(() => {
        if (loading || !userId) {
            socket.disconnect();
            return;
        }

        socket.connect();
    }, [userId, loading]);

    useEffect(() => {
        const handleTokenChange = (event) => {
            if (!userRef.current) {
                socket.disconnect();
                return;
            }
            if (event.detail?.authenticated) {
                socket.disconnect();
                socket.connect();
            } else {
                socket.disconnect();
            }
        };

        window.addEventListener("unicores:auth-token-changed", handleTokenChange);
        return () => window.removeEventListener("unicores:auth-token-changed", handleTokenChange);
    }, []);

    // ── Join user room on connect / reconnect ─────────────────────────────
    useEffect(() => {
        const identify = () => {
            if (userRef.current) {
                socket.emit("identify", { userId: userRef.current._id });
            }
        };

        // Identify immediately if already connected
        if (socket.connected && user) identify();

        socket.on("connect", identify);
        return () => socket.off("connect", identify);
    }, [user]); // re-run when user changes (login / logout)

    // ── Handle ban / suspension ──────────────────────────────────────────
    useEffect(() => {
        const handleStatusChanged = (data) => {
            if (!data || !userRef.current) return;
            if (String(data._id) !== String(userRef.current._id)) return;

            const status = data.accountStatus || data.status;
            if (status !== "banned" && status !== "suspended") return;

            const message =
                status === "banned"
                    ? data.reason || "Your account has been banned. Contact support."
                    : "Your account has been suspended.";

            try { queryClient.clear(); } catch (_) {}
            try { logout(); } catch (_) {}
            toast.error(message);
            navigate("/login", { replace: true, state: { accountStatusMessage: message } });
        };

        socket.on("user:status_changed", handleStatusChanged);
        return () => socket.off("user:status_changed", handleStatusChanged);
    }, [queryClient, logout, navigate]); // navigate is stable from react-router
};

export default useSocketSync;