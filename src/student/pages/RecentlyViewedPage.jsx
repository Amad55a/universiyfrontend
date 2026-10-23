import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { getRecentlyViewedBooks } from "@/api/dashboard";
import { useLanguage } from "@/hooks/useLanguage";

export default function RecentlyViewedPage() {
  const { t } = useLanguage();
  const copy = t?.mainContent ?? {};
  const { data: books = [], isLoading, isError } = useQuery({
    queryKey: ["dashboard", "recentlyViewed"],
    queryFn: getRecentlyViewedBooks,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#2C2DE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] dark:text-gray-300">
        <ArrowLeft size={16} /> {copy.dashboard || "Dashboard"}
      </Link>
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">{copy.recentlyViewedTitle || "Recently viewed books"}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{copy.recentlyViewedSubtitle || "Books you have opened most recently."}</p>

      {isLoading ? (
        <>
          <p role="status" className="sr-only">{copy.recentlyViewedLoading || "Loading your recently viewed books…"}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />)}
          </div>
        </>
      ) : isError ? (
        <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{copy.recentlyViewedErrorDetail || "Your recently viewed books could not be loaded."}</p>
      ) : books.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <BookOpen className="mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">{copy.emptyViewed || "Books you open will show up here."}</p>
          <Link to="/e-library" className="mt-4 inline-block text-sm font-bold text-[#2C2DE0] hover:underline">{copy.browseLibrary || "Browse the e-library"}</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <Link key={book._id} to={`/e-library/reader/${book._id}`} className="group min-w-0 rounded-2xl border border-gray-100 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] dark:border-gray-800 dark:bg-gray-950">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900">
                {book.cover ? <img src={book.cover} alt={book.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><BookOpen className="text-gray-400" /></div>}
              </div>
              <p className="mt-3 truncate text-sm font-bold text-gray-900 dark:text-white">{book.title}</p>
              <p className="truncate text-xs text-gray-500">{book.author}</p>
              {book.progress > 0 && <p className="mt-2 text-xs font-semibold text-[#2C2DE0]">{book.progress}% read</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
