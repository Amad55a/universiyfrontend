import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios';
import './styles/index.css'
import LandingLayout from './FrontDoorSystem/layout/LandingLayout'
import HomePage from './FrontDoorSystem/pages/HomePage'
import AboutPage from './FrontDoorSystem/pages/AboutPage'
import ContactPage from './FrontDoorSystem/pages/ContactPage'
import StudentLayout from './student/layout/StudentLayout'
import DashboardPage from './student/pages/DashboardPage'
import StudentSeatsPage from './student/pages/SeatsPage'
import MyReservationsPage from './student/pages/MyReservationsPage'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './auth/Login'
import { Toaster } from './components/ui/sonner'
import api from './api/client'
import PrivateRouter from './routes/PrivateRouter'
import PublicRoute from './routes/PublicRoute'
import "@fontsource/inter";
import RoleRoute from './routes/RoleRoutes'
import AdminLayout from './admin/layout/AdminLayout'
import AdminDashboardPage from './admin/pages/AdminDashboardPage'
import AdminProfilePage from './admin/pages/AdminProfilePage'
import AdminSearchDetailPage from './admin/pages/AdminSearchDetailPage'
import UsersPage from './admin/pages/UsersPage'
import UserDetailsPage from './admin/pages/UserDetailsPage'
import UniversityStudentsPage from './admin/pages/UniversityRegistryPage'
import BooksPage from './admin/pages/BooksPage'
import SeatReservationsPage from './admin/pages/ReservationsPage'
import QrCheckinPage from './admin/pages/QrCheckinPage'
import AnalyticsPage from './admin/pages/AnalyticsPage'
import SettingsPage from './admin/pages/SettingsPage'
import SeatTimelinePage from './admin/pages/SeatTimeLinePage'
import VerifyCode from './auth/VerifyCode'
import OAuthCallback from './auth/OAuthCallback'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SocketSyncProvider } from './socket/SocketSyncProvider'

import { LanguageProvider } from './context/LanguageContext'
import NotFound from './Not-Found';
import ForgotPassword from './auth/ForgetPassword';
import VerifyUniversityId from './auth/VerifyIdPage';
import SeatsPage from './admin/pages/SeatsPage';
import MyQrCode from './student/components/DashboardComponents/Myqrcode';

import NotificationsPage from './student/pages/NotificationsPage';
import AdminSendNotification from './admin/pages/AdminSendNotification';
import BorrowManagementPage from './admin/pages/Borrowmanagementpage';
import SignupCombined from './auth/Signup';
import ReportsPage from './admin/pages/ReportPage';
import LibraryHome from './student/components/DashboardComponents/e-librar';
import BookReader from './student/components/DashboardComponents/bookreader';
import { ELibrarySearchProvider } from './student/components/DashboardComponents/E-librarysearch';
import MyLibrary from './student/components/DashboardComponents/myLibrary';
import MyBorrowsPage from './student/components/DashboardComponents/Myborrowspage';
import RecentlyViewedPage from './student/pages/RecentlyViewedPage';
import UserAuthorityPage from './admin/pages/userAuthorityPage';
import AdminGroupsPage from './admin/pages/GroupsPage';
import TeacherDashboardPage from './teacher/page/TeacherDashboardPage';
import { teacherRoutes } from './teacher/TeacherRoutes';
import TeacherLayout from './teacher/TeacherLayout';
import TeacherPlaceholderPage from './teacher/page/TeacherPlaceholderPage';
import TeacherExamsPage from './teacher/page/TeacherExamsPage';
import TeacherClassesPage from './teacher/page/TeacherClassPage';
import TeacherClassDetailPage from './teacher/page/TeacherclassDetailPage';
import TeacherQuestionBankPage from './teacher/page/TeacherQuestionBankPage';
import TeacherSubmissionsPage from './teacher/page/TeacherSubmissionsPage';
import TeacherGradingWorkspace from './teacher/page/TeacherGradingWorkspace';
import TeacherAppealsPage from './teacher/page/TeacherAppealsPage';
import TeacherResultsPage from './teacher/page/TeacherResultsPage';
import TeacherResourcesPage from './teacher/page/TeacherResourcesPage';
import TeacherProfilePage from './teacher/page/TeacherProfilePage';
import StudentExamPortal from './student/pages/StudentExamPortal';
import StudentExamDetailsPage from './student/pages/StudentExamDetailsPage';
import StudentExamSession from './student/pages/StudentExamSession';
import StudentResultsPage from './student/pages/StudentResultsPage';
import CommunityLayout from './community/communityLayout';
import Feed from './community/Feed';
import Roadmaps from './community/Roadmaps';
import Groups from './community/Groups';
import GroupDetailPage from './community/GroupDetailPage';
import Meetings from './community/Meetings';
import MeetingRoom from './community/MeetingRoom';
import Chat from './community/Chats';
import BookmarksPage from './community/BookmarksPage';
import TrendingPage from './community/TrendingPage';
import PostDetails from './community/PostDetails';
import RoadmapDetail from './community/RoadmapDetail';
import MembersPage from './community/MembersPage';
import CommunitySettings from './community/communcitySettings';
import HelpCenter from './community/HelpCenter';
import Guidelines from './community/Guidlines';
import ReportProblem from './community/reportProblem';
import ContactUs from './community/contactUs';
import UserProfile from './community/userspagesss';
import { HelmetProvider } from "react-helmet-async";



const ProfileRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === "teacher") return <Navigate to="/teacher/profile" replace />;
    return <Navigate to={`/community/user/${user._id || user.id}`} replace />;
};

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
          <HelmetProvider>

        <LanguageProvider>
            <ThemeProvider>
                <ELibrarySearchProvider>

                    <AuthProvider>
                        <BrowserRouter>
                            <SocketSyncProvider>
                                <StrictMode>
                                    <Routes>
                                        <Route element={<PublicRoute><LandingLayout /></PublicRoute>}>
                                            <Route path="/" element={<HomePage />} />
                                            <Route path="/about" element={<AboutPage />} />
                                            <Route path="/contact" element={<ContactPage />} />
                                        </Route>
                                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                                        <Route path="/signup" element={<PublicRoute><SignupCombined /></PublicRoute>} />
                                        <Route path="/verify-code" element={<PublicRoute><VerifyCode /></PublicRoute>} />
                                        <Route path="/oauth-callback" element={<OAuthCallback />} />
                                        <Route path="/my-qr" element={<MyQrCode />} />
                                        <Route path="/forgot-password" element={<ForgotPassword />} />
                                        <Route path="/verify-university-id" element={
                                            <PrivateRouter>
                                                <VerifyUniversityId />
                                            </PrivateRouter>
                                        } />

                                        <Route
                                            element={
                                                <PrivateRouter>
                                                    <RoleRoute role="student">
                                                        <StudentLayout />
                                                    </RoleRoute>
                                                </PrivateRouter>
                                            }
                                        >

                                            <Route path="/dashboard" element={<DashboardPage />} />
                                            <Route path="/student/dashboard" element={<Navigate to="/dashboard" replace />} />
                                            <Route path="/seats" element={<StudentSeatsPage />} />
                                            <Route path="/e-library/my-borrows" element={<MyBorrowsPage />} />
                                            <Route path="/e-library" element={<LibraryHome />} />
                                            <Route path="/e-library/my-library" element={<MyLibrary />} />
                                            <Route path="/e-library/reader/:id" element={<BookReader />} />
                                            <Route path="/e-library/recently-viewed" element={<RecentlyViewedPage />} />
                                            <Route path="/e-library/:id" element={<BookReader />} />

                                            <Route path="/my-reservations" element={<MyReservationsPage />} />
                                            <Route path="/notifications" element={<NotificationsPage />} />
                                            <Route path="/exam-portal" element={<StudentExamPortal />} />
                                            <Route path="/exams/:examId" element={<StudentExamDetailsPage />} />
                                            <Route path="/results" element={<StudentResultsPage />} />
                                        </Route>





                                        <Route
                                            path="/exam-session/:examId"
                                            element={<StudentExamSession />}
                                        />

                                        <Route
                                            path="/admin"
                                            element={
                                                <PrivateRouter>
                                                    <RoleRoute role="admin">
                                                        <AdminLayout />
                                                    </RoleRoute>
                                                </PrivateRouter>
                                            }
                                        >

                                            <Route index element={<Navigate to="dashboard" replace />} />
                                            <Route path="dashboard" element={<AdminDashboardPage />} />
                                            <Route path="users" element={<UsersPage />} />
                                            <Route path="users/:id" element={<UserDetailsPage />} />
                                            <Route path="groups" element={<AdminGroupsPage />} />
                                            <Route path="university-registry" element={<UniversityStudentsPage />} />
                                            <Route path="seats/:id/timeline" element={<SeatTimelinePage />} />
                                            <Route path="seats" element={<SeatsPage />} />
                                            <Route path="books" element={<BooksPage />} />
                                            <Route path="books/borrowing" element={<BorrowManagementPage />} />
                                            <Route path="reservations" element={<SeatReservationsPage />} />
                                            <Route path="notifications" element={<AdminSendNotification />} />
                                            <Route path="my-notifications" element={<NotificationsPage />} />
                                            <Route path="qr-checkin" element={<QrCheckinPage />} />
                                            <Route path="analytics" element={<AnalyticsPage />} />
                                            <Route path="reports" element={<ReportsPage />} />
                                            <Route path="settings" element={<SettingsPage />} />
                                            <Route path="profile" element={<AdminProfilePage />} />
                                            <Route path="search/:type/:id" element={<AdminSearchDetailPage />} />
                                            <Route path="/admin/user-authority" element={<UserAuthorityPage />} />
                                        </Route>

                                        <Route path="/adminpanel" element={<Navigate to="/admin/dashboard" replace />} />
                                        <Route path="/admin/user-management" element={<Navigate to="/admin/users" replace />} />

                                        <Route path="*" element={<NotFound />} />

                                        <Route
                                            path="/teacher"
                                            element={<TeacherLayout />}
                                        >
                                            <Route index element={<TeacherDashboardPage />} />
                                            <Route path="dashboard" element={<TeacherDashboardPage />} />
                                            <Route path="classes" element={<TeacherClassesPage />} />
                                            <Route path="classes/:classId" element={<TeacherClassDetailPage />} />
                                            <Route path="exams" element={<TeacherExamsPage />} />
                                            <Route path="question-bank" element={<TeacherQuestionBankPage />} />
                                            <Route path="submissions" element={<TeacherSubmissionsPage />} />
                                            <Route path="submissions/:subId" element={<TeacherGradingWorkspace />} />
                                            <Route path="results" element={<TeacherResultsPage />} />
                                            <Route path="appeals" element={<TeacherAppealsPage />} />
                                            <Route path="resources" element={<TeacherResourcesPage />} />
                                            <Route path="profile" element={<TeacherProfilePage />} />
                                        </Route>

                                        <Route path="/community" element={<CommunityLayout />}>
                                            <Route index element={<Feed />} />
                                            <Route path="post/:id" element={<PostDetails />} />
                                            <Route path="bookmarks" element={<BookmarksPage />} />
                                            <Route path="trending" element={<TrendingPage />} />
                                            <Route path="roadmaps" element={<Roadmaps />} />
                                            <Route path="roadmaps/:id" element={<RoadmapDetail />} />
                                            <Route path="groups" element={<Groups />} />
                                            <Route path="groups/:groupId/members" element={<MembersPage />} />
                                            <Route path="groups/:id" element={<GroupDetailPage />} />
                                            <Route path="meetings" element={<Meetings />} />
                                            <Route path="meetings/room/:code" element={<MeetingRoom />} />
                                            <Route path="user/:id" element={<UserProfile />} />
                                            <Route path="/community/user/:id" element={<UserProfile />} />
                                            <Route path="chat" element={<Chat />} />
                                            <Route path="settings" element={<CommunitySettings />} />
                                            <Route path="help" element={<HelpCenter />} />
                                            <Route path="guidelines" element={<Guidelines />} />
                                            <Route path="report" element={<ReportProblem />} />
                                            <Route path="support" element={<ContactUs />} />
                                        </Route>

                                        <Route path="/profile" element={<ProfileRedirect />} />
                                        <Route path="/settings" element={<Navigate to="/community/settings" replace />} />

                                    </Routes>
                                    <Toaster />
                                </StrictMode>
                            </SocketSyncProvider>
                        </BrowserRouter>
                    </AuthProvider>
                </ELibrarySearchProvider>

            </ThemeProvider>
        </LanguageProvider>
          </HelmetProvider>

    </QueryClientProvider>
);
