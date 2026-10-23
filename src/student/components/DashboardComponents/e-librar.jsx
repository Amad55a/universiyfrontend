// Design: green-500 · black · white only (Tailwind)
// All strings via useLanguage
// Recommendation section groups by reason (_reason / _reasonLabel from API)
// Shows "Books Read" stat when the user has reading history
// Primary CTAs (pagination active page, retry) use the shared 3D pill style


import { useRef, useEffect } from "react";
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight, BookMarked, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useELibrary } from "@/hooks/usee-library";
import HeroBanner from "./herobanner";
import CategoryBar from "./catergorybar";
import BookGrid from "./bookgrid";
import { BookGridSkeleton, RecommendedSkeleton } from "./skeletons";
import { useELibrarySearch } from "./E-librarysearch";


// ── Shared primary-action style ────────────────────────────────────────────────
const PRIMARY_BTN =
 "bg-[#2C2DE0] text-white shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150";


// ── Section header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, right }) => (
 <div className="flex items-end justify-between mb-5">
   <div>
     <h2
       className="text-[17px] font-black text-black tracking-tight m-0"
       style={{ fontFamily: "'Georgia', serif" }}
     >
       {title}
     </h2>
     {subtitle && (
       <p className="text-[12px] text-gray-400 mt-0.5 font-medium">{subtitle}</p>
     )}
   </div>
   {right && <div>{right}</div>}
 </div>
);


// ── Thin rule ──────────────────────────────────────────────────────────────────
const Divider = () => <div className="h-px w-full bg-gray-100" />;


// ── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = ({ search, t }) => (
 <div className="py-18 flex flex-col items-center text-center">
   <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-gray-50 border border-gray-200">
     <BookOpen size={22} className="text-gray-300" />
   </div>
   <p className="font-bold text-black text-sm mb-1">
     {search ? `${t["search.noResults"] ?? "No results for"} "${search}"` : (t["books.empty"] ?? "No books found")}
   </p>
   <p className="text-gray-400 text-[12px]">
     {t["books.emptySub"] ?? "Try adjusting your search or filters"}
   </p>
 </div>
);


// ── Books-Read stat banner (shown when user has reading history) ───────────────
const BooksReadBanner = ({ count, inProgress, t }) => {
 if (!count && !inProgress) return null;


 return (
   <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black border border-black">
     <div className="flex items-center gap-2">
       <BookMarked size={15} className="text-[#2C2DE0]" />
       <span className="text-[13px] font-black text-white">
         {count}{" "}
         <span className="font-medium text-white/70">
           {t["stats.booksRead"] ?? "books read"}
         </span>
       </span>
     </div>
     {inProgress > 0 && (
       <>
         <div className="h-4 w-px bg-white/20" />
         <div className="flex items-center gap-2">
           <TrendingUp size={14} className="text-[#2C2DE0]" />
           <span className="text-[13px] font-black text-white">
             {inProgress}{" "}
             <span className="font-medium text-white/70">
               {t["stats.inProgress"] ?? "in progress"}
             </span>
           </span>
         </div>
       </>
     )}
   </div>
 );
};


// ── Pagination ─────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onPageChange }) => {
 if (totalPages <= 1) return null;


 const getPages = () => {
   if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
   if (page <= 4)               return [1, 2, 3, 4, 5, null, totalPages];
   if (page >= totalPages - 3)  return [1, null, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
   return [1, null, page - 1, page, page + 1, null, totalPages];
 };


 const NavBtn = ({ onClick, disabled, children }) => (
   <button
     onClick={onClick}
     disabled={disabled}
     className={`
       w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-semibold
       border transition-all duration-150
       ${disabled
         ? "border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
         : "border-gray-200 text-gray-400 cursor-pointer hover:border-[#2C2DE0] hover:text-[#2C2DE0]"
       }
     `}
   >
     {children}
   </button>
 );


 return (
   <div className="library-pagination flex items-center justify-center gap-1.5 mt-8 pt-6 border-t border-gray-100">
     <NavBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}>
       <ChevronLeft size={14} />
     </NavBtn>


     {getPages().map((p, i) =>
       p === null ? (
         <span key={`e-${i}`} className="library-page-ellipsis text-[13px] text-gray-300 w-8 text-center">
           …
         </span>
       ) : (
         <button
           key={`p-${p}`}
           onClick={() => onPageChange(p)}
           className={`
             library-page-number w-8 h-8 shrink-0 rounded-lg text-[13px] font-bold transition-all duration-150 cursor-pointer
             ${p === page ? "library-page-current" : ""}
             ${p === 1 || p === totalPages ? "library-page-edge" : ""}
             ${p === page
               ? PRIMARY_BTN
               : "border border-gray-200 text-gray-500 hover:border-[#2C2DE0] hover:text-[#2C2DE0] bg-white"
             }
           `}
         >
           {p}
         </button>
       )
     )}


     <NavBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
       <ChevronRight size={14} />
     </NavBtn>
   </div>
 );
};


// ── Main page ──────────────────────────────────────────────────────────────────
const LibraryHome = () => {
 const { t } = useLanguage();
 const { search: globalSearch, setSearch: setGlobalSearch } = useELibrarySearch();


 const {
   searchInput, setSearchInput, debouncedSearch,
   activeCategory, handleCategoryChange,
   books, pagination, page, setPage,
   isLoading, isFetching, error,
   recommended, recLoading, booksRead, inProgress,
   savedBooks, toggleSave,
 } = useELibrary();


 useEffect(() => {
   if (globalSearch !== searchInput) setSearchInput(globalSearch || "");
 }, [globalSearch, setSearchInput]);


 const allBooksRef = useRef(null);
 const isSearching = Boolean(debouncedSearch?.length);


 const handleSearchChange = (val) => { setSearchInput(val); setGlobalSearch(val); };
 const handleSearchClear  = ()    => { setSearchInput(""); setGlobalSearch(""); };


 const handlePageChange = (p) => {
   setPage(p);
   allBooksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 };


 return (
   <div className="min-h-screen pb-8 bg-white">
     <div
       style={{ maxWidth: "1440px", margin: "0 auto" }}
       className="w-full min-w-0 flex flex-col gap-7 px-3 py-4 sm:px-6 sm:py-5"
     >


       {/* ── Hero ── */}
       <HeroBanner
         searchValue={searchInput}
         onSearchChange={handleSearchChange}
         onSearchClear={handleSearchClear}
         totalBooks={pagination?.total || 0}
       />


       {/* ── Search result indicator ── */}
       {isSearching && (
         <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
           {isFetching ? (
             <span className="flex items-center gap-1.5 text-[#2C2DE0]">
               <RefreshCw size={12} className="animate-spin" />
               {t["common.loading"] ?? "Searching…"}
             </span>
           ) : (
             <>
               <span className="font-bold text-black">{pagination?.total || 0}</span>{" "}
               {t["search.results"] ?? "results for"}{" "}
               <span className="text-[#2C2DE0] font-semibold">"{debouncedSearch}"</span>
             </>
           )}
         </div>
       )}


       {/* ── Category bar ── */}
       <div>
         <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2.5">
           {t["categories.title"] ?? "Browse Categories"}
         </p>
         <CategoryBar activeCategory={activeCategory} onSelect={handleCategoryChange} />
       </div>


       <Divider />


       {/* ── Recommended section ── */}
       {!isSearching && activeCategory === "all" && (
         <>
           <section>
             <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
               <div>
                 <h2
                   className="text-[17px] font-black text-black tracking-tight m-0"
                   style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                 >
                   {t["recommended.title"] ?? "Recommended for You"}
                 </h2>
                 <p className="text-[12px] text-gray-400 mt-0.5 font-medium">
                   {t["recommended.subtitle"] ?? "Curated based on your reading history"}
                 </p>
               </div>
               <BooksReadBanner
                 count={booksRead ?? 0}
                 inProgress={inProgress ?? 0}
                 t={t}
               />
             </div>


             {recLoading ? (
               <RecommendedSkeleton count={6} />
             ) : recommended && recommended.length > 0 ? (
               <BookGrid
                 books={recommended}
                 savedBooks={savedBooks}
                 onToggleSave={toggleSave}
                 cols="recommended"
                 groupByReason
               />
             ) : null}
           </section>
           <Divider />
         </>
       )}


       {/* ── All Books ── */}
       <section ref={allBooksRef}>
         <SectionHeader
           title={
             isSearching
               ? `${t["search.resultsFor"] ?? "Results for"} "${debouncedSearch}"`
               : (t["books.title"] ?? "All Books")
           }
           subtitle={
             !isSearching
               ? (t["books.subtitle"] ?? "Fresh additions to our digital collection")
               : undefined
           }
           right={
             !isLoading && pagination?.total > 0 && (
               <span className="text-[11px] text-gray-400 font-medium">
                 {t["books.showing"] ?? "Showing"}{" "}
                 {Math.min((page - 1) * 12 + 1, pagination.total)}–
                 {Math.min(page * 12, pagination.total)}{" "}
                 {t["books.of"] ?? "of"} {pagination.total}
               </span>
             )
           }
         />


         {/* Loading skeleton */}
         {isLoading && <BookGridSkeleton count={12} />}


         {/* Soft refetch indicator */}
         {!isLoading && isFetching && (
           <div className="flex items-center gap-2 text-[12px] text-[#2C2DE0] mb-3">
             <RefreshCw size={12} className="animate-spin" />
             <span>{t["common.loading"] ?? "Updating…"}</span>
           </div>
         )}


         {/* Error */}
         {!isLoading && error && (
           <div className="py-12 text-center">
             <p className="text-red-500 text-[13px] mb-2.5">
               {t["common.error"] ?? "Something went wrong"}
             </p>
             <button
               onClick={() => window.location.reload()}
               className={`text-[12px] font-bold px-4 py-2 rounded-lg ${PRIMARY_BTN}`}
             >
               {t["common.retry"] ?? "Retry"}
             </button>
           </div>
         )}


         {/* Book grid */}
         {!isLoading && !error && books && books.length > 0 && (
           <>
             <BookGrid books={books} savedBooks={savedBooks} onToggleSave={toggleSave} />
             <Pagination
               page={page}
               totalPages={pagination?.totalPages || 1}
               onPageChange={handlePageChange}
             />
           </>
         )}


         {/* Empty */}
         {!isLoading && !error && (!books || books.length === 0) && (
           <EmptyState search={debouncedSearch} t={t} />
         )}
       </section>


     </div>


     {/* Spin keyframe fallback */}
     <style>{`
       @keyframes spin { to { transform: rotate(360deg); } }
       .animate-spin { animation: spin 1s linear infinite; }
       @media (max-width: 639px) {
         .library-pagination { gap: 4px; }
         .library-pagination .library-page-ellipsis { display: none; }
         .library-pagination .library-page-number:not(.library-page-current):not(.library-page-edge) { display: none; }
       }
     `}</style>
   </div>
 );
};


export default LibraryHome;
