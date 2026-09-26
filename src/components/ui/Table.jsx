import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Input } from './Input';

export default function Table({
  columns = [],
  data = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No records found',
  onRowClick,
  toolbar,
  mobileCard,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      const keys = searchKeys || columns.map((c) => c.key).filter(Boolean);
      rows = rows.filter((row) =>
        keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [data, search, sortKey, sortDir, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <Input
              leftIcon={Search}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
          ) : (
            <div />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/80">
              {columns.map((col) => (
                <th
                  key={col.key || col.header}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500',
                    col.sortable && 'cursor-pointer select-none hover:text-ink-800',
                    col.className
                  )}
                  onClick={() => toggleSort(col.key, col.sortable)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable &&
                      (sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-ink-50">
                  {columns.map((col) => (
                    <td key={col.key || col.header} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-ink-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={row._id || row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-ink-50 transition hover:bg-brand-50/40',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key || col.header} className={cn('px-4 py-3 text-ink-700', col.className)}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-100" />
          ))
        ) : paged.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">{emptyMessage}</p>
        ) : (
          paged.map((row, idx) => (
            <div
              key={row._id || row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'rounded-xl border border-ink-100 bg-ink-50/50 p-3 transition',
                onRowClick && 'cursor-pointer active:bg-brand-50'
              )}
            >
              {mobileCard ? (
                mobileCard(row)
              ) : (
                <div className="space-y-1.5">
                  {columns.slice(0, 4).map((col) => (
                    <div key={col.key || col.header} className="flex justify-between gap-2 text-sm">
                      <span className="text-ink-400">{col.header}</span>
                      <span className="font-medium text-ink-800">
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-1.5 hover:bg-ink-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium text-ink-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-1.5 hover:bg-ink-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
