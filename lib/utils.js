/**
 * @file lib/utils.js
 *
 * Shared utility functions and Tailwind CSS class maps used across components.
 *
 * Contains:
 *   - Severity class maps  — Tailwind classes keyed by severity level
 *   - resolveSeverity      — safe fallback for CVEs without CVSS scores
 *   - formatDate           — ISO 8601 → human-readable date string
 *   - truncateDescription  — word-boundary-aware text truncation
 *   - filterCVEs           — pure filter function for keyword + severity
 *   - sortCVEs             — pure sort function for date and score ordering
 *
 * IMPORTANT — Tailwind JIT:
 *   All Tailwind class strings in this file must be written as complete
 *   literal strings (e.g. 'bg-red-100 text-red-800'). Never build them
 *   dynamically with string concatenation (e.g. `bg-${color}-100`) because
 *   Tailwind's JIT compiler scans source files statically and would fail to
 *   detect dynamically constructed class names, stripping them from the
 *   production CSS bundle.
 */

/**
 * Tailwind classes for severity badge pills shown in the top-right of each card.
 * Uses a light background with matching border for a subtle "chip" look.
 *
 * @type {Record<string, string>}
 */
export const SEVERITY_BADGE_CLASSES = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border border-green-300',
  NONE: 'bg-gray-100 text-gray-500 border border-gray-300',
}

/**
 * Tailwind classes for the colored left border on each CVE card.
 * The border gives an immediate visual severity signal before reading the badge.
 *
 * @type {Record<string, string>}
 */
export const SEVERITY_CARD_BORDER = {
  CRITICAL: 'border-l-4 border-l-red-500',
  HIGH: 'border-l-4 border-l-orange-500',
  MEDIUM: 'border-l-4 border-l-yellow-400',
  LOW: 'border-l-4 border-l-green-500',
  NONE: 'border-l-4 border-l-gray-300',
}

/**
 * Tailwind text-color classes for the CVSS score number in each card footer.
 * Matches the severity color palette to reinforce the visual signal.
 *
 * @type {Record<string, string>}
 */
export const SEVERITY_SCORE_COLOR = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-600',
  LOW: 'text-green-600',
  NONE: 'text-gray-400',
}

/**
 * Tailwind classes for the active state of severity filter buttons in SearchFilter.
 * When a button is active (aria-pressed=true), it gets a solid filled background
 * matching the severity color rather than the default outlined style.
 *
 * 'ALL' uses a neutral dark background since it isn't tied to a severity color.
 *
 * @type {Record<string, string>}
 */
export const SEVERITY_ACTIVE_BUTTON = {
  ALL: 'bg-gray-800 text-white border-gray-800',
  CRITICAL: 'bg-red-600 text-white border-red-600',
  HIGH: 'bg-orange-500 text-white border-orange-500',
  MEDIUM: 'bg-yellow-400 text-gray-900 border-yellow-400',
  LOW: 'bg-green-600 text-white border-green-600',
  NONE: 'bg-gray-400 text-white border-gray-400',
}

/**
 * Returns the severity string, substituting 'NONE' when severity is null.
 *
 * Some CVEs — particularly newly published ones or very old entries — have
 * no CVSS scoring at all. This function ensures severity-dependent code
 * (class maps, badge text) always receives a valid key rather than null.
 *
 * @param {string|null} severity  The raw severity from a normalized CVE object
 * @returns {string}              The severity or 'NONE' as a safe fallback
 */
export function resolveSeverity(severity) {
  return severity ?? 'NONE'
}

/**
 * Formats an ISO 8601 date string into a short, readable format.
 *
 * Example: "2024-01-15T10:00:00.000" → "Jan 15, 2024"
 *
 * Uses en-US locale for consistent formatting. Wraps in try/catch to
 * gracefully handle malformed date strings by returning them as-is.
 *
 * @param {string} isoString  An ISO 8601 date string (as returned by NVD)
 * @returns {string}          Formatted date string, e.g. "Jan 15, 2024"
 */
export function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString
  }
}

/**
 * Truncates a string to at most maxLength characters, breaking at the
 * last word boundary before the limit to avoid cutting mid-word.
 *
 * Example:
 *   truncateDescription("A long description about a vulnerability", 20)
 *   → "A long description..."
 *
 * If the text is already within the limit, it is returned unchanged.
 *
 * @param {string} text         The text to truncate
 * @param {number} [maxLength=180]  Maximum character count before truncating
 * @returns {string}            Truncated string with '...' appended, or original
 */
export function truncateDescription(text, maxLength = 180) {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

/**
 * Filters an array of normalized CVE objects by keyword and severity.
 *
 * Filtering is applied in this order:
 *   1. Severity — drop CVEs whose resolved severity doesn't match (skipped if 'ALL')
 *   2. Keyword  — drop CVEs where neither the ID nor description contains the keyword
 *
 * Both comparisons are case-insensitive. The keyword is trimmed before matching
 * so leading/trailing whitespace in the search box doesn't affect results.
 *
 * This is a pure function — it does not mutate the input array.
 *
 * @param {Object[]} cves      Array of normalized CVE objects
 * @param {string}   keyword   Search term (matched against id and description)
 * @param {string}   severity  'ALL' to show everything, or 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns {Object[]}         A new filtered array (original is unchanged)
 */
export function filterCVEs(cves, keyword, severity) {
  let result = cves

  if (severity !== 'ALL') {
    result = result.filter((cve) => resolveSeverity(cve.severity) === severity)
  }

  const trimmed = keyword.trim().toLowerCase()
  if (trimmed.length > 0) {
    result = result.filter(
      (cve) =>
        cve.id.toLowerCase().includes(trimmed) ||
        cve.description.toLowerCase().includes(trimmed)
    )
  }

  return result
}

/**
 * Sorts an array of normalized CVE objects by the given sort option.
 *
 * Sort options:
 *   'date-desc'   — Newest published first (default view)
 *   'date-asc'    — Oldest published first
 *   'score-desc'  — Highest CVSS score first; CVEs with no score (null) sort last
 *
 * This is a pure function — it returns a new array and does not mutate the input.
 * The spread `[...cves]` is intentional to avoid modifying the original array
 * held in React state.
 *
 * @param {Object[]} cves                           Array of normalized CVE objects
 * @param {'date-desc'|'date-asc'|'score-desc'} sort  The sort mode to apply
 * @returns {Object[]}                              A new sorted array
 */
export function sortCVEs(cves, sort) {
  return [...cves].sort((a, b) => {
    if (sort === 'date-desc') {
      return new Date(b.published).getTime() - new Date(a.published).getTime()
    }
    if (sort === 'date-asc') {
      return new Date(a.published).getTime() - new Date(b.published).getTime()
    }
    if (sort === 'score-desc') {
      // Treat null scores as -1 so unscored CVEs always fall to the bottom
      return (b.baseScore ?? -1) - (a.baseScore ?? -1)
    }
    return 0
  })
}
