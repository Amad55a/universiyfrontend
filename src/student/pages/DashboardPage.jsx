import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import HeroWelcome from "@/student/components/DashboardComponents/BrandSection";
import ProgressStrip from "@/student/components/DashboardComponents/Progressstrip";
import QuickActions from "@/student/components/DashboardComponents/QuickActions";
import { TutorialSection } from "../components/VideoSection_and_Footer";
import MainContentArea from "../components/MaincontentArea";
import { getReservationMeta } from "@/api/reservation";
import { getDashboardStats } from "@/api/dashboard";
import NotificationWelcomeModal from "@/components/NotificationWelcomeModal";
import StudentExamList from "./StudentExamList";

function useDashboardData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  });

  return {
    loading: isLoading,
    error: isError,
    streak: data?.streak ?? 0,
    dailyGoal: data?.dailyGoal ?? 3,
    completedToday: data?.completedToday ?? 0,
    stats: {
      borrowed: data?.borrowed,
      reservations: data?.reservations,
      dueSoon: data?.dueSoon,
      unread: data?.unread,
    },
  };
}

const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-100 dark:bg-gray-900 rounded-2xl ${className}`} />
);

const DashboardPage = () => {
  const data = useDashboardData();
  const { t } = useLanguage();
  const copy = t?.mainContent ?? {};

  const { data: reservationMeta } = useQuery({
    queryKey: ["reservationMeta"],
    queryFn: getReservationMeta,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const fetchServerTime = useCallback(async () => {
    if (reservationMeta?.serverTime) return reservationMeta.serverTime;
    const meta = await getReservationMeta();
    return meta.serverTime;
  }, [reservationMeta]);

  return (
    <>
      <NotificationWelcomeModal />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {data.error && !data.loading && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-5 py-4">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Could not load dashboard stats. Please refresh to try again.</p>
          </div>
        )}
        {data.loading ? (
          <>
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-32" />
          </>
        ) : (
          <>
            {data.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{copy.dashboardStatsError || "Dashboard statistics could not be loaded. Please refresh to try again."}</p>}
            <HeroWelcome
              streak={data.streak}
              dailyGoal={data.dailyGoal}
              completedToday={data.completedToday}
              fetchServerTime={fetchServerTime}
              initialServerTime={reservationMeta?.serverTime}
            />
            <StudentExamList />
            <ProgressStrip stats={data.stats} />
            <QuickActions />
          </>
        )}
        <MainContentArea />
        <TutorialSection />
      </div>
    </>
  );
};

export default DashboardPage;