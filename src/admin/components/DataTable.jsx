'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Search } from 'lucide-react'
import Button from './Button'
import EmptyState from './EmptyState'
import Skeleton from './Skeleton'

// Client-side table: sorting, text search, select filters, pagination.
// columns = [{ key, header, sortable?, align?: 'right', render?(row), sortValue?(row), searchValue?(row) }]
// filters = [{ key, label, options: [{ value, label }], match?(row, value) }]
// rowActions(row) returns buttons for the trailing actions column.
//
// Server mode (manual=true): rows are already the current page. Pass total,
// page (1-based), pageSize and onPageChange(page); search is the initial query
// and onSearch(q) fires on every keystroke (debounce in the caller).
// filterValues + onFilterChange(key, value) control the selects (any mode).
// Column sorting is disabled in server mode.
export default function DataTable({
  columns,
  rows = [],
  getRowId = (row) => row.id,
  caption,
  searchable = true,
  searchPlaceholder = 'Search…',
  filters = [],
  pageSize = 10,
  loading = false,
  emptyState,
  rowActions,
  stackOnMobile = true,
  toolbarExtra,
  manual = false,
  total,
  page: pageProp,
  onPageChange,
  search,
  onSearch,
  filterValues: filterValuesProp,
  onFilterChange,
}) {
  const [query, setQuery] = useState(search ?? '')
  const [localFilters, setLocalFilters] = useState({})
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [localPage, setLocalPage] = useState(1)
  const filterValues = filterValuesProp ?? localFilters
  const page = manual ? Math.max(1, Number(pageProp) || 1) : localPage
  const setPage = (p) => (manual ? onPageChange?.(p) : setLocalPage(p))
  const setFilter = (key, value) => {
    onFilterChange?.(key, value)
    if (!filterValuesProp) setLocalFilters((v) => ({ ...v, [key]: value }))
    if (!manual) setLocalPage(1)
  }

  const processed = useMemo(() => {
    if (manual) return rows
    const q = query.trim().toLowerCase()
    let out = rows.filter((row) => {
      if (q) {
        const hay = columns.map((c) => (c.searchValue ? c.searchValue(row) : row[c.key])).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return filters.every((f) => {
        const v = filterValues[f.key]
        if (!v) return true
        return f.match ? f.match(row, v) : String(row[f.key]) === v
      })
    })
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key)
      const get = col?.sortValue ?? ((row) => row[sort.key])
      out = [...out].sort((a, b) => {
        const av = get(a)
        const bv = get(b)
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [manual, rows, columns, filters, query, filterValues, sort])

  const totalCount = manual ? (Number.isFinite(total) ? total : rows.length) : processed.length
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const current = Math.min(page, pageCount)
  const visible = manual ? processed : processed.slice((current - 1) * pageSize, current * pageSize)
  const colCount = columns.length + (rowActions ? 1 : 0)

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const showToolbar = searchable || filters.length > 0 || toolbarExtra

  return (
    <div className={stackOnMobile ? 'va-table-stack' : undefined}>
      {showToolbar && (
        <div className="va-table-toolbar">
          {searchable && (
            <div className="va-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                className="va-input"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder.replace(/…$/, '')}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (manual) onSearch?.(e.target.value)
                  else setLocalPage(1)
                }}
              />
            </div>
          )}
          {filters.map((f) => (
            <select
              key={f.key}
              className="va-select"
              aria-label={f.label}
              value={filterValues[f.key] ?? ''}
              onChange={(e) => setFilter(f.key, e.target.value)}
            >
              <option value="">{`All ${f.label.toLowerCase()}`}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          {toolbarExtra}
        </div>
      )}

      <div className="va-table-scroll">
        <table className="va-table">
          {caption && <caption className="va-sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort.key === c.key
                const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                const SortIcon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
                return (
                  <th key={c.key} scope="col" aria-sort={ariaSort} className={c.align === 'right' ? 'va-num' : undefined}>
                    {c.sortable && !manual ? (
                      <button type="button" className="va-sort-btn" onClick={() => toggleSort(c.key)}>
                        {c.header}
                        <SortIcon size={13} aria-hidden="true" />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {rowActions && <th scope="col" className="va-num"><span className="va-sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody aria-busy={loading || undefined}>
            {loading &&
              Array.from({ length: Math.min(pageSize, 5) }, (_, i) => (
                <tr key={`sk-${i}`}>
                  {Array.from({ length: colCount }, (__, j) => (
                    <td key={j}><Skeleton width={j === 0 ? '70%' : '50%'} /></td>
                  ))}
                </tr>
              ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={colCount} style={{ display: 'table-cell' }}>
                  {emptyState ?? (
                    <EmptyState
                      title={query || Object.values(filterValues).some(Boolean) ? 'No matches' : 'Nothing here yet'}
                      description={query || Object.values(filterValues).some(Boolean) ? 'Try a different search or clear the filters.' : undefined}
                    />
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={typeof c.header === 'string' ? c.header : c.key} className={c.align === 'right' ? 'va-num' : undefined}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                  {rowActions && (
                    <td data-label="Actions">
                      <div className="va-row-actions">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && totalCount > pageSize && (
        <nav className="va-table-foot" aria-label="Table pagination">
          <span aria-live="polite">
            {`${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, totalCount)} of ${totalCount}`}
          </span>
          <div className="va-pager">
            <Button size="sm" iconOnly icon={ChevronLeft} aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)} />
            <span>{`Page ${current} of ${pageCount}`}</span>
            <Button size="sm" iconOnly icon={ChevronRight} aria-label="Next page" disabled={current >= pageCount} onClick={() => setPage(current + 1)} />
          </div>
        </nav>
      )}
    </div>
  )
}
