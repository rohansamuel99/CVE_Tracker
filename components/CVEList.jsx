/**
 * @file components/CVEList.jsx
 *
 * "Smart" component that owns the search/filter/sort state and renders
 * the CVE card grid along with the SearchFilter controls above it.
 *
 * Why state lives here (not in page.jsx):
 *   page.jsx is a Server Component — it can't hold React state. CVEList is
 *   the top-most Client Component in the tree, so it's the right place to
 *   own the interactive state. It receives the initial fetched data as props
 *   from the server and then manages all client-side interactivity from there.
 *
 * Performance note:
 *   filterCVEs and sortCVEs are wrapped in useMemo so they only re-run when
 *   their inputs actually change (keyword, severity, sortOption, or initialCves).
 *   Without memoization they'd recompute on every render, including unrelated
 *   parent re-renders.
 */

'use client'

import { useState, useMemo } from 'react'
import CVECard from './CVECard'
import SearchFilter from './SearchFilter'
import { filterCVEs, sortCVEs } from '@/lib/utils'

/**
 * Manages filter/sort state and renders the full CVE dashboard section:
 * the SearchFilter controls and the responsive card grid (or empty state).
 *
 * @param {Object}   props
 * @param {Object[]} props.initialCves    Array of normalized CVE objects fetched server-side
 * @param {number}   props.totalResults   Total CVE count returned by NVD for the query
 *                                        (may be larger than initialCves.length if paginated)
 */
export default function CVEList({ initialCves, totalResults }) {
  const [keyword, setKeyword] = useState('')
  const [severity, setSeverity] = useState('ALL')
  const [sortOption, setSortOption] = useState('date-desc')

  /**
   * Derived state: apply filter then sort whenever any input changes.
   * Order matters — filter first (reduce the array), then sort (cheaper on a smaller set).
   */
  const displayedCves = useMemo(() => {
    const filtered = filterCVEs(initialCves, keyword, severity)
    return sortCVEs(filtered, sortOption)
  }, [initialCves, keyword, severity, sortOption])

  return (
    <section>
      {/* Pass state down and wire up callbacks — SearchFilter is fully controlled */}
      <SearchFilter
        keyword={keyword}
        onKeywordChange={setKeyword}
        severity={severity}
        onSeverityChange={setSeverity}
        sortOption={sortOption}
        onSortChange={setSortOption}
        totalShowing={displayedCves.length}
        totalResults={totalResults}
      />

      {displayedCves.length === 0 ? (
        /* Empty state — shown when filters produce no results */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-500 font-medium">No CVEs match your filters.</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search or severity filter.
          </p>
        </div>
      ) : (
        /* Responsive grid: 1 col → 2 → 3 → 4 as viewport widens */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedCves.map((cve) => (
            /* cve.id is stable and unique — safe to use as the React key */
            <CVECard key={cve.id} cve={cve} />
          ))}
        </div>
      )}
    </section>
  )
}
