/**
 * @file components/SearchFilter.jsx
 *
 * Controlled component that renders the search, filter, and sort controls
 * for the CVE dashboard.
 *
 * This component is fully controlled — it owns no state of its own. Every
 * input value comes in as a prop, and every change is reported back to the
 * parent (CVEList) via callback props. This makes the filtering logic easy
 * to test and keeps all state in one place.
 *
 * Layout (responsive):
 *   - Search input (full width)
 *   - Severity pills + sort dropdown (stacked on mobile, one row on sm+)
 *   - Result count line
 *
 * Accessibility notes:
 *   - The search input has a visually hidden <label> (sr-only) for screen readers
 *   - Severity buttons use aria-pressed to communicate toggle state
 *   - The button group has role="group" with an aria-label
 *   - The SVG search icon has aria-hidden="true" (decorative only)
 */

'use client'

import { SEVERITY_ACTIVE_BUTTON } from '@/lib/utils'

/**
 * The list of severity filter options shown as pill buttons.
 * 'ALL' is always first and acts as a "show everything" reset.
 */
const SEVERITY_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

/**
 * Renders the search bar, severity filter pills, sort dropdown, and result count.
 *
 * @param {Object}   props
 * @param {string}   props.keyword             Current search input value
 * @param {Function} props.onKeywordChange     Called with the new string on every keystroke
 * @param {string}   props.severity            Active severity filter: 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @param {Function} props.onSeverityChange    Called with the new severity when a pill is clicked
 * @param {string}   props.sortOption          Active sort: 'date-desc' | 'date-asc' | 'score-desc'
 * @param {Function} props.onSortChange        Called with the new sort option when the dropdown changes
 * @param {number}   props.totalShowing        Number of CVEs currently visible after filtering
 * @param {number}   props.totalResults        Total CVEs fetched from NVD (before filtering)
 */
export default function SearchFilter({
  keyword,
  onKeywordChange,
  severity,
  onSeverityChange,
  sortOption,
  onSortChange,
  totalShowing,
  totalResults,
}) {
  return (
    <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm p-4 mb-6">
      {/* ── Search input ───────────────────────────────────────────────────── */}
      <div className="relative">
        {/* sr-only label keeps the input accessible without showing visible text */}
        <label htmlFor="cve-search" className="sr-only">
          Search CVEs
        </label>
        {/* Decorative search icon — positioned absolutely inside the input */}
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </div>
        <input
          id="cve-search"
          type="search"
          placeholder="Search by CVE ID or keyword..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg
                     text-sm text-gray-800 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* ── Severity pills + sort row ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Severity filter buttons — act as a radio-group style toggle */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by severity"
        >
          {SEVERITY_OPTIONS.map(({ label, value }) => {
            const isActive = severity === value
            return (
              <button
                key={value}
                onClick={() => onSeverityChange(value)}
                aria-pressed={isActive}  // Communicates toggle state to screen readers
                className={`
                  text-xs font-semibold px-3 py-1.5 rounded-full
                  transition-colors duration-150 border
                  ${
                    isActive
                      ? SEVERITY_ACTIVE_BUTTON[value]   // Solid colored background when active
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }
                `}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort-select" className="text-xs text-gray-500 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5
                       text-gray-700 bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="score-desc">Highest score</option>
          </select>
        </div>
      </div>

      {/* ── Result count ───────────────────────────────────────────────────── */}
      {/* totalShowing reflects client-side filtering; totalResults is from NVD */}
      <p className="text-xs text-gray-400">
        Showing{' '}
        <span className="font-semibold text-gray-600">{totalShowing}</span>
        {' '}of{' '}
        <span className="font-semibold text-gray-600">{totalResults}</span> CVEs
      </p>
    </div>
  )
}
