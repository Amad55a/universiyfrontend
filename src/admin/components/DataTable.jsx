import { useEffect, useRef, useState } from "react";
// Core no-unused-vars does not detect JSX member-expression usage.
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  ArrowUpDown,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import SearchBar from "./SearchBar";
import FilterDropdown from "./FilterDropdown";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import { TableSkeleton } from "./LoadingSkeleton";
import { cn } from "@/lib/utils";

const DataTable = ({
  columns = [],
  data = [],
  searchPlaceholder,
  filterOptions,
  filterValue,
  onFilterChange,
  loading = false,
  emptyTitle,
  emptyDescription,
  onAdd,
  onExport,
  onBulkDelete,
  bulkActions = [],
  rowActions,
  serverPagination,
  onSearchChange,
  searchDebounceMs = 0,
  searchClassName,
  onSortChange,
  toolbarFilters,
  extraFilters,
  renderRowActions,
  onRowClick,
  hideAdd = false,
  hideExport = false,
}) => {
  const { t } = useLanguage();
  const ap = t.adminPanel;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const searchTimer = useRef(null);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const isServer = Boolean(serverPagination);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    clearTimeout(searchTimer.current);
    if (searchDebounceMs > 0) {
      searchTimer.current = setTimeout(() => onSearchChange?.(value.trim()), searchDebounceMs);
    } else {
      onSearchChange?.(value);
    }
  };

  const filtered = isServer
    ? data
    : data.filter((row) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return columns.some((col) => {
          const val = row[col.key];
          return String(val ?? "").toLowerCase().includes(q);
        });
      });

  const sorted = isServer
    ? filtered
    : [...filtered].sort((a, b) => {
        if (!sortKey) return 0;
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });

  const totalPages = isServer
    ? serverPagination.totalPages
    : Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const currentPage = isServer ? serverPagination.page : page;
  const pageData = isServer
    ? sorted
    : sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalItems = isServer ? serverPagination.totalItems : sorted.length;

  const toggleSort = (key) => {
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    if (sortKey === key) setSortDir(nextDir);
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    onSortChange?.({ sortBy: key, sortDir: sortKey === key ? nextDir : "asc" });
  };

  const getRowId = (row) => row.id || row._id;

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pageData.length) setSelected(new Set());
    else setSelected(new Set(pageData.map((r, idx) => getRowId(r) ?? `row-${(currentPage - 1) * rowsPerPage + idx}`).filter(Boolean)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-gray-100 dark:border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder={searchPlaceholder ?? ap.header.searchPlaceholder}
            className={cn("w-full sm:max-w-xs", searchClassName)}
          />
          {filterOptions && (
            <FilterDropdown
              label={ap.common.filter}
              options={filterOptions}
              value={filterValue}
              onChange={onFilterChange}
            />
          )}
          {toolbarFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {toolbarFilters}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              {bulkActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => action.onClick?.([...selected])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2C2DE0]/30 bg-[#2C2DE0]/10 px-3 py-2 text-xs font-bold text-[#2C2DE0] hover:bg-[#2C2DE0]/20 dark:text-[#2C2DE0] transition-colors"
                >
                  {action.icon}
                  {action.label} ({selected.size})
                </button>
              ))}
              <button
                type="button"
                onClick={() => onBulkDelete?.([...selected])}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
                {ap.common.delete} ({selected.size})
              </button>
            </>
          )}
          {extraFilters}
          {!hideExport && (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-[#2C2DE0]/30 transition-colors"
            >
              <Download size={14} />
              {ap.common.export}
            </button>
          )}
          {!hideAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C2DE0] px-3 py-2 text-xs font-bold text-white hover:bg-[#2C2DE0] transition-colors shadow-sm shadow-[#2C2DE0]/20 text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] active:translate-y-1 active:shadow-none transition-all duration-150 group"
            >
              <Plus size={14} />
              {ap.common.addNew}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-4">
          <TableSkeleton />
        </div>
      ) : pageData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === pageData.length && pageData.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-[#2C2DE0] focus:ring-[#2C2DE0]/30"
                    aria-label={ap.common.selectAll}
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#2C2DE0] dark:hover:text-[#2C2DE0] transition-colors"
                      >
                        {col.label}
                        <ArrowUpDown size={12} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                <th className="w-12 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {ap.common.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => {
                const rowId = getRowId(row);
                const rowKey = rowId ?? `row-${(currentPage - 1) * rowsPerPage + i}`;
                return (
                <motion.tr
                  key={rowKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-50 dark:border-white/5",
                    "hover:bg-[#2C2DE0]/[0.03] transition-colors",
                    selected.has(rowKey) && "bg-[#2C2DE0]/5",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(rowKey)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleRow(rowKey)}
                      className="rounded border-gray-300 text-[#2C2DE0] focus:ring-[#2C2DE0]/30"
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-gray-800 dark:text-gray-100"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderRowActions ? (
                        renderRowActions(row)
                      ) : (
                        <button
                          type="button"
                          onClick={() => rowActions?.(row)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pageData.length > 0 && (
        <div className="px-4 pb-4">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={
              isServer ? serverPagination.onPageChange : setPage
            }
            rowsPerPage={
              isServer ? serverPagination.rowsPerPage : rowsPerPage
            }
            onRowsPerPageChange={(n) => {
              if (isServer) {
                serverPagination.onRowsPerPageChange?.(n);
              } else {
                setRowsPerPage(n);
                setPage(1);
              }
            }}
            totalItems={totalItems}
          />
        </div>
      )}
    </motion.div>
  );
};

export default DataTable;
