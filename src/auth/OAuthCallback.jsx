import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/client";

const OAuthCallback = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const completeGoogleLogin = async (attempt = 0) => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      if (error) {
        console.error("OAuth callback error (redirect):", error);
        try {
          const { toast } = await import("sonner");
          toast.error(decodeURIComponent(error));
        } catch (e) {
          console.error(e);
        }
        navigate("/login", { replace: true });
        return;
      }

      try {
        const { data } = await api.get("/auth/me", {
          withCredentials: true,
          headers: { "Cache-Control": "no-store" },
        });
        const userObj = data.data || data.user;
        login(userObj);

        const destination = userObj.role === "admin" ? "/admin/dashboard" : "/dashboard";
        navigate(destination, { replace: true });
      } catch (error) {
        if (attempt < 2 && error?.response?.status === 401) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return completeGoogleLogin(attempt + 1);
        }

        console.error("OAuth callback error:", error);
        navigate("/login", { replace: true });
      }
    };

    completeGoogleLogin();
  }, [navigate, login, t]);

  return <div>{t.common.completingLogin}</div>;
};

export default OAuthCallback;
