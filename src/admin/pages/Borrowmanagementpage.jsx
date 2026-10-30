import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import {
    BookOpen, User, Calendar, Clock, CheckCircle2, XCircle,
    AlertTriangle, Search, RefreshCw, ChevronLeft, ChevronRight,
    Plus, Eye, RotateCcw, Skull, CalendarClock, Loader2,
    BookMarked, TrendingUp, BookX, BarChart3, X, Check,
    ChevronDown, Filter,
} from "lucide-react";
import PageTransition from "@/admin/components/PageTransition";
import PageHeader from "@/admin/components/PageHeader";

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
    stats: () => apiClient.get("/admin/borrows/stats"),
    list: (params) => apiClient.get("/admin/borrows", { params }),
    get: (id) => apiClient.get(`/admin/borrows/${id}`),
    issue: (body) => apiClient.post("/admin/borrows", body),
    return: (id) => apiClient.post(`/admin/borrows/${id}/return`),
    extend: (id, dueDate) => apiClient.patch(`/admin/borrows/${id}/extend`, { dueDate }),
    lost: (id) => apiClient.patch(`/admin/borrows/${id}/lost`),
    searchStudents: (q) => apiClient.get("/admin/borrows/students/search", { params: { q } }),
    searchBooks: (q) => apiClient.get("/admin/books", { params: { search: q, limit: 10, status: "active" } }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtTime = (d) =>
    d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
const isOverdue = (dueDate, status) =>
    status !== "returned" && status !== "lost" && new Date() > new Date(dueDate);
const daysOverdue = (dueDate) => {
    const diff = new Date() - new Date(dueDate);
    return Math.max(0, Math.floor(diff / 86400000));
};
const minDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
};

// Cloudinary stores coverImage as { url, publicId } — never pass the object to <img>
const coverUrl = (bookOrCover) => {
    if (!bookOrCover) return null;
    const cover = bookOrCover.coverImage ?? bookOrCover;
    if (typeof cover === "string") return cover || null;
    return cover?.url || null;
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
    active: { dot: "bg-[#2C2DE0]", badge: "bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/10 text-[#2C2DE0] dark:text-[#2C2DE0] border border-[#2C2DE0]/20 dark:border-[#2C2DE0]/20" },
    returned: { dot: "bg-gray-400", badge: "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700" },
    overdue: { dot: "bg-red-500 animate-pulse", badge: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20" },
    lost: { dot: "bg-orange-500", badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, accent, pulse }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
        <div className={`relative flex size-10 items-center justify-center rounded-xl ${accent}`}>
            <Icon size={18} className="text-white" />
            {pulse && <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-950" />}
        </div>
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, label }) => {
    const s = STATUS[status] || STATUS.active;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${s.badge}`}>
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            {label}
        </span>
    );
};

// ─── Searchable Dropdown ──────────────────────────────────────────────────────
const SearchDropdown = ({ placeholder, onSearch, results, onSelect, selected, renderItem, renderSelected, loading }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");

    useEffect(() => {
        const t = setTimeout(() => { if (q.trim()) onSearch(q); }, 300);
        return () => clearTimeout(t);
    }, [q]);

    return (
        <div className="relative">
            {selected ? (
                <div className="flex items-center justify-between rounded-xl border border-[#2C2DE0]/30 dark:border-[#2C2DE0]/30 bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/10 px-3 py-2.5">
                    {renderSelected(selected)}
                    <button onClick={() => onSelect(null)} className="ml-2 text-gray-400 hover:text-red-400 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]"
                    />
                    {loading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
            )}
            {open && !selected && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {loading ? (
                        <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin" /> Searching…
                        </div>
                    ) : results.length > 0 ? (
                        results.map((item) => (
                            <button key={item._id} type="button" onClick={() => { onSelect(item); setOpen(false); setQ(""); }}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                {renderItem(item)}
                            </button>
                        ))
                    ) : q.trim() ? (
                        <div className="px-4 py-3 text-xs text-gray-400">No results found</div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

// ─── Issue Modal ──────────────────────────────────────────────────────────────
const IssueModal = ({ onClose, onSuccess, t }) => {
    const p = t.borrow;
    const [selectedBook, setSelectedBook] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [bookResults, setBookResults] = useState([]);
    const [studentResults, setStudentResults] = useState([]);
    const [loadingBooks, setLoadingBooks] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const searchBooks = async (q) => {
        setLoadingBooks(true);
        try {
            const res = await api.searchBooks(q);
            const books = res.data?.books || res.data?.data || [];
            setBookResults(
              books.filter((b) => b.format !== "ebook" && (b.availableCopies ?? 0) >= 0)
            );
        } catch {
            setBookResults([]);
        } finally { setLoadingBooks(false); }
    };

    const searchStudents = async (q) => {
        setLoadingStudents(true);
        try {
            const res = await api.searchStudents(q);
            setStudentResults(res.data?.data || res.data?.students || []);
        } catch {
            setStudentResults([]);
        } finally { setLoadingStudents(false); }
    };

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.issue({
            bookId: selectedBook._id,
            borrowerId: selectedStudent._id,
            dueDate,
            notes,
        }),
        onSuccess: () => { toast.success(p.issuedSuccess); onSuccess(); onClose(); },
        onError: (e) => toast.error(e.response?.data?.message || p.issuedError),
    });

    const canSubmit = selectedBook && selectedStudent && dueDate;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <p className="font-black text-gray-900 dark:text-white">{p.issueBook}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.issueSub}</p>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                        <X size={15} />
                    </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    {/* Book */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{p.selectBook}</label>
                        <SearchDropdown
                            placeholder={p.searchBookPlaceholder}
                            onSearch={searchBooks}
                            results={bookResults}
                            onSelect={setSelectedBook}
                            selected={selectedBook}
                            loading={loadingBooks}
                            renderItem={(b) => (
                                <div className="flex items-center gap-3">
                                    {coverUrl(b)
                                        ? <img src={coverUrl(b)} alt="" className="size-9 rounded-lg object-cover" />
                                        : <div className="size-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><BookOpen size={14} className="text-gray-400" /></div>}
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.title}</p>
                                        <p className="text-xs text-gray-400">{b.author} · {b.availableCopies} {p.available}</p>
                                    </div>
                                </div>
                            )}
                            renderSelected={(b) => (
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} className="text-[#2C2DE0]" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{b.title}</p>
                                        <p className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0]">{b.availableCopies} {p.available}</p>
                                    </div>
                                </div>
                            )}
                        />
                        {selectedBook?.availableCopies === 0 && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{p.outOfStock}</p>
                        )}
                    </div>

                    {/* Student */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{p.selectStudent}</label>
                        <SearchDropdown
                            placeholder={p.searchStudentPlaceholder}
                            onSearch={searchStudents}
                            results={studentResults}
                            onSelect={setSelectedStudent}
                            selected={selectedStudent}
                            loading={loadingStudents}
                            renderItem={(s) => (
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-[#2C2DE0]/10 flex items-center justify-center text-[10px] font-black text-[#2C2DE0]">
                                        {(s.fullName || s.name || "?").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.fullName || s.name}</p>
                                        <p className="text-xs text-gray-400">{s.studentId || s.email}</p>
                                    </div>
                                </div>
                            )}
                            renderSelected={(s) => (
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-[#2C2DE0]" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{s.fullName || s.name || s.email}</p>
                                        <p className="text-xs text-[#2C2DE0] dark:text-[#2C2DE0]">{s.studentId || s.email}</p>
                                    </div>
                                </div>
                            )}
                        />
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{p.dueDate}</label>
                        <input type="date" value={dueDate} min={minDate()} onChange={(e) => setDueDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]" />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{p.notes} <span className="normal-case font-normal text-gray-400">({p.optional})</span></label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                            placeholder={p.notesPlaceholder}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]" />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                        {p.cancel}
                    </button>
                    <button onClick={() => mutate()} disabled={isPending || !canSubmit || selectedBook?.availableCopies === 0}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2C2DE0] hover:bg-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                        {isPending ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />{p.issuing}</span> : p.issueBook}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ borrowId, onClose, onAction, canManageLoan, t }) => {
    const p = t.borrow;
    const [extending, setExtending] = useState(false);
    const [newDate, setNewDate] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["borrow-detail", borrowId],
        queryFn: async () => (await api.get(borrowId)).data.data,
        enabled: !!borrowId,
    });

    const b = data;
    const over = b ? isOverdue(b.dueDate, b.status) : false;
    const days = b ? daysOverdue(b.dueDate) : 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <p className="font-black text-gray-900 dark:text-white">{p.borrowDetail}</p>
                    <button onClick={onClose} className="size-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                        <X size={15} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-[#2C2DE0]" />
                        </div>
                    ) : b ? (
                        <>
                            {/* Book */}
                            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                {coverUrl(b.book)
                                    ? <img src={coverUrl(b.book)} alt="" className="w-14 rounded-xl object-cover aspect-[2/3]" />
                                    : <div className="w-14 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><BookOpen size={20} className="text-gray-400" /></div>}
                                <div>
                                    <p className="font-black text-gray-900 dark:text-white">{b.book?.title}</p>
                                    <p className="text-sm text-gray-400">{b.book?.author}</p>
                                    {b.book?.shelfLocation && <p className="text-xs text-gray-400 mt-1">{p.shelf}: {b.book.shelfLocation}</p>}
                                </div>
                            </div>

                            {/* Overdue warning */}
                            {over && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3">
                                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">{p.overdueBy} {days} {days === 1 ? p.day : p.days}</p>
                                </div>
                            )}

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: User, label: p.student, value: b.borrower?.fullName || b.borrower?.name },
                                    { icon: BookMarked, label: p.studentId, value: b.borrower?.studentId || b.borrower?.email },
                                    { icon: Calendar, label: p.borrowedAt, value: fmtDate(b.borrowedAt) },
                                    { icon: Clock, label: p.dueDate, value: fmtDate(b.dueDate), red: over },
                                    { icon: User, label: p.issuedBy, value: b.issuedBy?.fullName || b.issuedBy?.name },
                                    { icon: b.returnedAt ? CheckCircle2 : Clock, label: p.returnedAt, value: b.returnedAt ? fmtDate(b.returnedAt) : "—" },
                                ].map(({ icon: Icon, label, value, red }) => (
                                    <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Icon size={11} className="text-gray-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                                        </div>
                                        <p className={`text-sm font-semibold ${red ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{value || "—"}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2">
                                <StatusBadge status={b.status} label={p[`status_${b.status}`] || b.status} />
                                {b.notes && <p className="text-xs text-gray-400 ml-2">{b.notes}</p>}
                            </div>

                            {/* Extend section */}
                            {canManageLoan && extending && (
                                <div className="rounded-xl border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/10 p-4 space-y-3">
                                    <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{p.newDueDate}</p>
                                    <input type="date" value={newDate} min={minDate()} onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full rounded-xl border border-yellow-300 dark:border-yellow-500/30 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30" />
                                    <div className="flex gap-2">
                                        <button onClick={() => setExtending(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                            {p.cancel}
                                        </button>
                                        <button onClick={() => { if (newDate) { onAction("extend", b._id, newDate); setExtending(false); } }}
                                            disabled={!newDate}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-40">
                                            {p.confirmExtend}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Actions */}
                {b && !isLoading && (
                    <div className="flex-shrink-0 flex flex-wrap gap-2 px-6 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800">
                        {["active", "overdue"].includes(b.status) && !b.returnedAt && (
                            <button onClick={() => onAction("return", b._id)}
                                className="flex items-center gap-1.5 rounded-xl bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white px-4 py-2 text-xs font-bold transition-all">
                                <RotateCcw size={13} />{p.returnBook}
                            </button>
                        )}
                        {canManageLoan && ["active", "overdue"].includes(b.status) && !extending && (
                            <button onClick={() => setExtending(true)}
                                className="flex items-center gap-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 px-4 py-2 text-xs font-bold transition-all">
                                <CalendarClock size={13} />{p.extendDue}
                            </button>
                        )}
                        {canManageLoan && ["active", "overdue"].includes(b.status) && (
                            <button onClick={() => onAction("lost", b._id)}
                                className="flex items-center gap-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 px-4 py-2 text-xs font-bold transition-all">
                                <Skull size={13} />{p.markLost}
                            </button>
                        )}
                        <button onClick={onClose}
                            className="ml-auto flex items-center gap-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 text-xs font-semibold transition-all">
                            {p.close}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const BorrowManagementPage = ({ initialStatus = "all" }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const isLibrarian = user?.role === "librarian";
    const p = t.borrow;
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState(initialStatus);
    const [issueOpen, setIssueOpen] = useState(false);
    const [viewingId, setViewingId] = useState(null);

    // Stats
    const { data: statsData } = useQuery({
        queryKey: ["borrow-stats"],
        queryFn: async () => (await api.stats()).data.data,
        enabled: !isLibrarian,
        refetchInterval: 30000,
    });

    // List
    const { data: listData, isLoading } = useQuery({
        queryKey: ["borrows", page, search, status],
        queryFn: async () => (await api.list({ page, limit: 20, search, status })).data,
        keepPreviousData: true,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["borrows"] });
        queryClient.invalidateQueries({ queryKey: ["borrow-stats"] });
        if (viewingId) queryClient.invalidateQueries({ queryKey: ["borrow-detail", viewingId] });
    };

    const returnMut = useMutation({ mutationFn: (id) => api.return(id), onSuccess: () => { toast.success(p.returnedSuccess); invalidate(); }, onError: (e) => toast.error(e.response?.data?.message || p.error) });
    const extendMut = useMutation({ mutationFn: ({ id, date }) => api.extend(id, date), onSuccess: () => { toast.success(p.extendedSuccess); invalidate(); }, onError: (e) => toast.error(e.response?.data?.message || p.error) });
    const lostMut = useMutation({ mutationFn: (id) => api.lost(id), onSuccess: () => { toast.success(p.lostSuccess); invalidate(); }, onError: (e) => toast.error(e.response?.data?.message || p.error) });

    const handleAction = (type, id, date) => {
        if (type === "return") returnMut.mutate(id);
        if (type === "extend") extendMut.mutate({ id, date });
        if (type === "lost") lostMut.mutate(id);
    };

    const rows = listData?.data ?? [];
    const pagination = listData?.pagination ?? { page: 1, totalPages: 1, total: 0 };
    const stats = statsData ?? {};

    const statusOptions = [
        { value: "all", label: p.all },
        { value: "active", label: p.status_active },
        { value: "returned", label: p.status_returned },
        { value: "overdue", label: p.status_overdue },
        { value: "lost", label: p.status_lost },
    ];

    return (
        <PageTransition>
            <div className="flex items-center justify-between mb-6">
                <PageHeader title={p.title} subtitle={p.subtitle} />
                <button onClick={() => setIssueOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#2C2DE0] hover:bg-[#2C2DE0] text-white px-4 py-2.5 text-sm font-bold transition-all shadow-sm shadow-[#2C2DE0] dark:shadow-none">
                    <Plus size={16} />{p.issueBook}
                </button>
            </div>

            {/* Stats */}
            {!isLibrarian && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                <StatCard label={p.statsActive} value={stats.active} icon={BookOpen} accent="bg-[#2C2DE0]" />
                <StatCard label={p.statsOverdue} value={stats.overdue} icon={AlertTriangle} accent="bg-red-500" pulse={stats.overdue > 0} />
                <StatCard label={p.statsReturnedToday} value={stats.returnedToday} icon={CheckCircle2} accent="bg-gray-600" />
                <StatCard label={p.statsTotal} value={stats.total} icon={BarChart3} accent="bg-black dark:bg-white/20" />
            </div>}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder={p.searchPlaceholder}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((opt) => (
                        <button key={opt.value} onClick={() => { setStatus(opt.value); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${status === opt.value
                                ? "bg-[#2C2DE0] border-[#2C2DE0] text-white"
                                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#2C2DE0]"
                                }`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-[#2C2DE0]" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="size-14 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
                            <BookX size={22} className="text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{p.emptyTitle}</p>
                        <p className="text-xs text-gray-400 mt-1">{p.emptySubtitle}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    {[p.colBook, p.colStudent, p.colBorrowedAt, p.colDueDate, p.colStatus, p.colIssuedBy, p.colActions].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {rows.map((row) => {
                                    const over = isOverdue(row.dueDate, row.status);
                                    const days = over ? daysOverdue(row.dueDate) : 0;
                                    return (
                                        <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            {/* Book */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {coverUrl(row.book)
                                                        ? <img src={coverUrl(row.book)} alt="" className="size-9 rounded-lg object-cover flex-shrink-0" />
                                                        : <div className="size-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><BookOpen size={14} className="text-gray-400" /></div>}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-36">{row.book?.title}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{row.book?.author}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Student */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.borrower?.fullName || row.borrower?.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{row.borrower?.studentId || row.borrower?.email}</p>
                                            </td>
                                            {/* Borrowed At */}
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(row.borrowedAt)}</td>
                                            {/* Due Date */}
                                            <td className="px-4 py-3">
                                                <p className={`text-xs font-semibold whitespace-nowrap ${over ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>{fmtDate(row.dueDate)}</p>
                                                {over && <p className="text-[10px] text-red-400">+{days}d</p>}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge status={row.status} label={p[`status_${row.status}`] || row.status} />
                                            </td>
                                            {/* Issued By */}
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{row.issuedBy?.fullName || row.issuedBy?.name || "—"}</td>
                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setViewingId(row._id)}
                                                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                        <Eye size={11} />{p.view}
                                                    </button>
                                                    {["active", "overdue"].includes(row.status) && !row.returnedAt && (
                                                        <button onClick={() => handleAction("return", row._id)}
                                                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-[#2C2DE0] dark:text-[#2C2DE0] bg-[#2C2DE0]/10 dark:bg-[#2C2DE0]/10 hover:bg-[#2C2DE0]/20 dark:hover:bg-[#2C2DE0]/20 transition-colors">
                                                            <RotateCcw size={11} />{p.return}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-400">{pagination.total} {p.totalRecords}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="size-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{page} / {pagination.totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                                className="size-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#2C2DE0] hover:text-[#2C2DE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {issueOpen && <IssueModal onClose={() => setIssueOpen(false)} onSuccess={invalidate} t={t} />}
            {viewingId && <DetailModal borrowId={viewingId} onClose={() => setViewingId(null)} onAction={(type, id, date) => { handleAction(type, id, date); setViewingId(null); }} canManageLoan={!isLibrarian} t={t} />}
        </PageTransition>
    );
};

export default BorrowManagementPage;