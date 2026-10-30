import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "@/admin/layout/AdminLayout";
import { canLibrarianAccessPath, LIBRARIAN_HOME } from "./adminAccess";

const AdminAccessRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role === "admin") return <AdminLayout />;
  if (user.role === "librarian") {
    return canLibrarianAccessPath(location.pathname)
      ? <AdminLayout />
      : <Navigate to={LIBRARIAN_HOME} replace />;
  }

  if (user.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default AdminAccessRoute;
