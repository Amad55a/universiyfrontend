import { Navigate } from "react-router-dom";
import AdminLayout from "@/admin/layout/AdminLayout";
import AdminDashboardPage from "@/admin/pages/AdminDashboardPage";
import UsersPage from "@/admin/pages/UsersPage";
import UserDetailsPage from "@/admin/pages/UserDetailsPage";
import UniversityStudentsPage from "@/admin/pages/UniversityRegistryPage";
import BooksPage from "@/admin/pages/BooksPage";
import SeatsPage from "@/admin/pages/SeatsPage";
import SeatTimelinePage from "@/admin/pages/SeatTimeLinePage";
import QrCheckinPage from "@/admin/pages/QrCheckinPage";
import SettingsPage from "@/admin/pages/SettingsPage";
import SeatReservationsPage from "../pages/ReservationsPage";
import AdminSendNotification from "../pages/AdminSendNotification";
import ReportsPage from "../pages/ReportPage";
import AdminProfilePage from "../pages/AdminProfilePage";
import AdminSearchDetailPage from "../pages/AdminSearchDetailPage";

/**
 * Admin panel route tree — UI only, nested under /admin
 */
const AdminRoutes = [
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "users/:id", element: <UserDetailsPage /> },
      { path: "university-students", element: <UniversityStudentsPage /> },
      { path: "books", element: <BooksPage /> },
      { path: "books/categories", element: <BooksPage /> },
      { path: "seats", element: <SeatsPage /> },
      { path: "seats/:id/timeline", element: <SeatTimelinePage /> },
      { path: "reservations", element: <SeatReservationsPage /> },
      { path: "notification", element: <AdminSendNotification /> },
      { path: "qr-checkin", element: <QrCheckinPage /> },
      { path: "analytics", element: <Navigate to="/admin/reports" replace /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "profile", element: <AdminProfilePage /> },
      { path: "search/:type/:id", element: <AdminSearchDetailPage /> },
    ],
  },
  { path: "/adminpanel", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/admin/user-management", element: <Navigate to="/admin/users" replace /> },
];

export default AdminRoutes;
