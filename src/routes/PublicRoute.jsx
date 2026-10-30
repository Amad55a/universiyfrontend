import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LIBRARIAN_HOME } from "@/admin/routes/adminAccess";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (location.pathname === "/login" && location.state?.librarianSignInMessage) return children;
  if (!user) return children;

  switch (user?.role) {
    case "admin":
      return <Navigate to="/admin/dashboard" />;

    // case "teacher":
    //   return <Navigate to="/teacher/dashboard" />;

    case "librarian":
      return <Navigate to={LIBRARIAN_HOME} replace />;

    default:
      return <Navigate to="/dashboard" />;
  }

};

export default PublicRoute;
