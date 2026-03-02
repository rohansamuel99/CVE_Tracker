/**
 * @file app/page.jsx
 *
 * Homepage — the root page of the CVE Tracker app.
 *
 * This file is a Next.js Server Component (no 'use client' directive), which
 * means it runs on the server during the request and never ships its own
 * JavaScript to the browser. The server fetches CVE data and streams the
 * rendered HTML to the client.
 *
 * Component hierarchy in this file:
 *
 *   HomePage           — outer layout shell, always renders immediately
 *     └─ Suspense      — shows CVEListSkeleton while CVESection is loading
 *          └─ CVESection (async) — fetches data, then renders CVEList
 *
 * Why CVESection is a separate async component:
 *   In Next.js App Router, React Suspense only triggers for async child
 *   components. If the await was inside HomePage directly, the Suspense
 *   boundary would never activate and the skeleton would never show.
 *   Moving the data fetch into its own async component CVESection solves this.
 *
 * Why page.jsx calls lib/nvd.js directly instead of /api/cves:
 *   A Server Component calling its own API route via HTTP would be a
 *   loopback request (server → server), which adds unnecessary latency.
 *   Importing fetchCVEs() directly skips the HTTP layer entirely.
 */

import { Suspense } from 'react'
import CVEList from '@/components/CVEList'
import { fetchCVEs } from '@/lib/nvd'

/**
 * Animated placeholder grid shown while CVESection fetches data from NVD.
 * Renders 12 skeleton cards that mirror the real card layout so the page
 * doesn't jump when real content streams in.
 *
 * Uses Tailwind's `animate-pulse` utility which applies a breathing opacity
 * animation to give the impression of content loading.
 *
 * @returns {JSX.Element}
 */
function CVEListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-sm border-l-4 border-l-gray-200
                     p-4 flex flex-col gap-3 animate-pulse h-44"
        >
          {/* Skeleton header: CVE ID placeholder + badge placeholder */}
          <div className="flex justify-between">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded-full" />
          </div>
          {/* Skeleton description: three lines of varying width */}
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/6" />
          </div>
          {/* Skeleton footer: score + date placeholders */}
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Formats a JavaScript Date into the string format the NVD API requires.
 *
 * NVD expects ISO 8601 without a timezone designator:
 *   ✓ "2024-01-15T10:00:00.000"
 *   ✗ "2024-01-15T10:00:00.000Z"  (trailing Z not accepted)
 *
 * @param {Date} date
 * @returns {string}  e.g. "2024-01-15T10:00:00.000"
 */
function nvdDate(date) {
  return date.toISOString().replace('Z', '')
}

/**
 * Async Server Component that fetches CVE data and renders the CVEList.
 *
 * Fetches the 60 most recently published CVEs within the last 30 days.
 * The 30-day window is required because the NVD API has no "sort by newest"
 * parameter — without a date range it returns results starting from 1988.
 *
 * Error handling:
 *   - Hard error (network failure, 5xx) → red error box
 *   - Soft error (rate limit 403)       → yellow notice box
 *   - Success                           → renders CVEList with the data
 *
 * @returns {Promise<JSX.Element>}
 */
async function CVESection() {
  let data

  // Restrict to the last 30 days so we only get recent, relevant CVEs.
  // Without these date bounds the NVD API returns the oldest CVEs in its
  // database (going back to 1988), not the newest ones.
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    data = await fetchCVEs({
      resultsPerPage: 60,
      pubStartDate: nvdDate(thirtyDaysAgo),
      pubEndDate: nvdDate(now),
    })
  } catch (error) {
    return (
      <div className="flex justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-red-700 font-semibold text-lg mb-2">
            Failed to load CVEs
          </h2>
          <p className="text-red-600 text-sm">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please try refreshing.'}
          </p>
        </div>
      </div>
    )
  }

  return <CVEList initialCves={data.cves} totalResults={data.totalResults} />
}

/**
 * Root page component — the layout shell for the entire app.
 *
 * Renders immediately with the header and a Suspense boundary.
 * The Suspense boundary shows CVEListSkeleton until CVESection resolves.
 *
 * @returns {JSX.Element}
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            CVE Tracker
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Recent vulnerabilities from the{' '}
            <a
              href="https://nvd.nist.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              National Vulnerability Database
            </a>
            . Refreshed every 5 minutes.
          </p>
        </header>

        {/* CVE grid — skeleton shows immediately, real content streams in */}
        <Suspense fallback={<CVEListSkeleton />}>
          <CVESection />
        </Suspense>
      </div>
    </main>
  )
}
