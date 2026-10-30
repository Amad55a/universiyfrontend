import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LIBRARIAN_HOME } from "@/admin/routes/adminAccess";

const RoleRoute = ({ children, role }) => {
  const { user } = useAuth();

  // if (loading) return null;
  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }

  // Allow guest accounts to access student routes, without forcing a redirect away from /seats or /e-library.
  if (user.role === "guest" && role === "student") {
    return children;
  }
// 
const requiresVerification =
  ["student", "teacher"].includes(user.role);

if (requiresVerification && !user.isUniversityVerified) {
  return <Navigate to="/verify-university-id" replace />;
}

  if (user.role !== role) {
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;

      case "teacher":
        return <Navigate to="/teacher/dashboard" replace />;

      case "librarian":
        return <Navigate to={LIBRARIAN_HOME} replace />;

      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default RoleRoute;
