import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock3, History, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getRecommendedBooks, getRecentActivity, getRecentlyViewedBooks } from "@/api/dashboard";

const SectionHeader = ({ title, href, seeAll }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-black text-gray-900 dark:text-white">{title}</h3>
    {href && (
      <Link
        to={href}
        className="flex items-center gap-1 text-[11px] font-bold text-[#2C2DE0] dark:text-[#2C2DE0] hover:gap-1.5 transition-all"
      >
        {seeAll} <ArrowRight size={12} />
      </Link>
    )}
  </div>
);

const BookCard = ({ book }) => (
  <Link to={`/e-library/reader/${book._id}`} className="flex-shrink-0 w-32 group">
    <div className="w-32 h-44 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-100 dark:border-gray-800 group-hover:-translate-y-1 transition-transform duration-150">
      {book.cover ? (
        <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BookOpen size={22} className="text-gray-300 dark:text-gray-700" />
        </div>
      )}
    </div>
    <p className="text-xs font-bold text-gray-800 dark:text-white mt-2 line-clamp-1">{book.title}</p>
    <p className="text-[10px] text-gray-400 line-clamp-1">{book.author}</p>
    {typeof book.progress === "number" && book.progress > 0 && (
      <p className="mt-1 text-[10px] font-semibold text-[#2C2DE0]">{book.progress}% read</p>
    )}
  </Link>
);

const ActivityRow = ({ item }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/10 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/20 flex items-center justify-center flex-shrink-0 ring-1 ring-[#2C2DE0]/20 dark:ring-[#2C2DE0]/30">
      <Clock3 size={14} className="text-[#2C2DE0] dark:text-[#A9B1FF]" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{item.label}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.time}</p>
    </div>
  </div>
);

const HorizontalSkeleton = () => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="w-32 h-44 rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse flex-shrink-0" />
    ))}
  </div>
);

const MainContentArea = () => {
  const { t, language } = useLanguage();
  const mc = t?.dashboard.mainContent ?? {};

  const { data: recommended = [], isLoading: loadingRecommended, isError: recommendedError } = useQuery({
    queryKey: ["dashboard", "recommendedBooks"],
    queryFn: getRecommendedBooks,
  });
  const { data: activity = [], isLoading: loadingActivity, isError: activityError } = useQuery({
    queryKey: ["dashboard", "recentActivity"],
    queryFn: getRecentActivity,
  });
  const { data: recentlyViewed = [], isLoading: loadingViewed, isError: viewedError } = useQuery({
    queryKey: ["dashboard", "recentlyViewed"],
    queryFn: getRecentlyViewedBooks,
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Recommended books */}
      <section>
        <SectionHeader title={mc.recommended ?? "Recommended For You"} href="/e-library" seeAll={mc.seeAll ?? "See all"} />
        {loadingRecommended ? (
          <HorizontalSkeleton />
        ) : recommendedError ? (
          <p role="alert" className="text-xs text-red-600">{mc.recommendationsError ?? "Recommendations could not be loaded."}</p>
        ) : recommended.length === 0 ? (
          <p className="text-xs text-gray-400">{mc.emptyRecommended ?? "No recommendations yet — start reading to get suggestions."}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommended.map((b) => <BookCard key={b._id} book={b} />)}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity history */}
        <section>
          <SectionHeader title={mc.activity ?? "Activity History"} />
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4">
            {loadingActivity ? (
              <div className="py-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activityError ? (
              <p role="alert" className="py-6 text-center text-xs text-red-600">{mc.activityError ?? "Activity history could not be loaded."}</p>
            ) : activity.length === 0 ? (
              <div className="py-8 text-center">
                <History size={20} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-xs text-gray-400">{mc.emptyActivity ?? "No recent activity yet."}</p>
              </div>
            ) : (
              activity.map((a, i) => <ActivityRow key={`${a.type}-${a.occurredAt || i}`} item={a} copy={mc} language={language} />)
            )}
          </div>
        </section>

        {/* Recently viewed */}
        <section>
          <SectionHeader title={mc.recentlyViewed ?? "Recently Viewed"} href="/e-library/recently-viewed" seeAll={mc.seeAll ?? "See all"} />
          {loadingViewed ? (
            <HorizontalSkeleton />
          ) : viewedError ? (
            <p role="alert" className="text-xs text-red-600">{mc.recentlyViewedError ?? "Recently viewed books could not be loaded."}</p>
          ) : recentlyViewed.length === 0 ? (
            <p className="text-xs text-gray-400">{mc.emptyViewed ?? "Books you open will show up here."}</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed.map((b) => <BookCard key={b._id} book={b} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MainContentArea;