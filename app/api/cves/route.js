/**
 * @file app/api/cves/route.js
 *
 * Next.js Route Handler: GET /api/cves
 *
 * Acts as a server-side proxy between the browser and the NVD CVE API.
 * Fetching NVD data through this route (rather than directly from the browser)
 * solves two problems:
 *
 *   1. CORS — NVD's CORS headers are inconsistent. Server-to-server requests
 *      bypass CORS entirely, so the browser never touches nvd.nist.gov directly.
 *
 *   2. Rate limiting — NVD allows ~5 unauthenticated requests per 30 seconds.
 *      Because fetchCVEs() uses Next.js fetch caching (revalidate: 300), all
 *      users share a single cached response for 5 minutes, so this endpoint
 *      almost never makes a real outbound request to NVD.
 *
 * This route is available for client-side use cases like pagination. The main
 * page (app/page.jsx) calls lib/nvd.js directly to avoid an extra HTTP round-trip.
 */

import { NextResponse } from 'next/server'
import { fetchCVEs } from '@/lib/nvd'

/** Severity values accepted by the NVD API's cvssV3Severity parameter */
const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

/**
 * Handles GET requests to /api/cves.
 *
 * Reads, validates, and sanitizes query parameters before forwarding them to
 * the NVD API via fetchCVEs(). Invalid values are replaced with safe defaults
 * rather than returning a 400 error, to keep the client code simple.
 *
 * Accepted query parameters:
 * @param {string} [resultsPerPage]  Number of CVEs to return. Clamped to 1–2000. Default: 20.
 * @param {string} [startIndex]      Pagination offset (0-based). Default: 0.
 * @param {string} [cvssV3Severity]  Filter by severity. Must be CRITICAL | HIGH | MEDIUM | LOW.
 *                                   Ignored if an unrecognized value is passed.
 * @param {string} [keywordSearch]   Full-text search term (passed through to NVD if ≥3 chars).
 * @param {string} [pubStartDate]    ISO 8601 start date for publish date range.
 * @param {string} [pubEndDate]      ISO 8601 end date for publish date range.
 *
 * Response shape (always the same, even on error):
 * @returns {{ cves: Object[], totalResults: number, resultsPerPage: number, startIndex: number, error?: string }}
 *
 * Status codes:
 *   200 — success
 *   503 — NVD rate limit hit (retry after a moment)
 *   500 — unexpected server error
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl

  const rawResultsPerPage = searchParams.get('resultsPerPage')
  const rawStartIndex = searchParams.get('startIndex')
  const rawSeverity = searchParams.get('cvssV3Severity')

  // Clamp resultsPerPage to the NVD-allowed range of 1–2000
  const resultsPerPage = rawResultsPerPage
    ? Math.min(Math.max(parseInt(rawResultsPerPage, 10) || 20, 1), 2000)
    : 20

  // Ensure startIndex is non-negative (negative offsets are invalid)
  const startIndex = rawStartIndex
    ? Math.max(parseInt(rawStartIndex, 10) || 0, 0)
    : 0

  // Only pass severity to NVD if it's a known valid value; unknown values
  // would cause a 400 from NVD, so we silently drop them here instead
  const cvssV3Severity =
    rawSeverity && VALID_SEVERITIES.includes(rawSeverity)
      ? rawSeverity
      : undefined

  const params = {
    resultsPerPage,
    startIndex,
    cvssV3Severity,
    keywordSearch: searchParams.get('keywordSearch') ?? undefined,
    pubStartDate: searchParams.get('pubStartDate') ?? undefined,
    pubEndDate: searchParams.get('pubEndDate') ?? undefined,
  }

  try {
    const result = await fetchCVEs(params)
    return NextResponse.json({
      cves: result.cves,
      totalResults: result.totalResults,
      resultsPerPage: result.resultsPerPage,
      startIndex: result.startIndex,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'

    // Return 503 for rate limit so clients know to retry, 500 for everything else
    const status = message.includes('rate limit') ? 503 : 500

    return NextResponse.json(
      { cves: [], totalResults: 0, resultsPerPage: 0, startIndex: 0, error: message },
      { status }
    )
  }
}
