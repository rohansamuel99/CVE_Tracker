/**
 * @file components/CVECard.jsx
 *
 * Presentational component that renders a single CVE as a clickable card.
 *
 * The entire card is wrapped in an <a> tag so it behaves as a native link:
 * users can right-click → "Open in new tab", keyboard-navigate with Tab,
 * and activate with Enter — without any extra JavaScript.
 *
 * Visual design:
 *   - Left border color  → instant severity signal before reading any text
 *   - Severity badge     → explicit label in the top-right corner
 *   - CVSS score         → color-matched numeric score in the footer
 *   - Published date     → right-aligned in the footer
 *
 * This component has no state and no side effects — it only renders what
 * it receives via props. All class lookups come from the severity maps in
 * lib/utils.js, which are Tailwind-JIT safe (full literal strings, not dynamic).
 */

import {
  SEVERITY_BADGE_CLASSES,
  SEVERITY_CARD_BORDER,
  SEVERITY_SCORE_COLOR,
  formatDate,
  truncateDescription,
  resolveSeverity,
} from '@/lib/utils'

/**
 * Renders one CVE as a card linking to its NVD detail page.
 *
 * @param {Object} props
 * @param {Object} props.cve                  Normalized CVE object from lib/nvd.js
 * @param {string} props.cve.id               CVE identifier, e.g. "CVE-2024-12345"
 * @param {string} props.cve.description      Full English description text
 * @param {number|null} props.cve.baseScore   CVSS base score (0.0–10.0), or null if unscored
 * @param {string|null} props.cve.severity    Severity label, or null if unscored
 * @param {string} props.cve.published        ISO 8601 publish date
 * @param {string} props.cve.nvdUrl           Full URL to the NVD detail page
 */
export default function CVECard({ cve }) {
  // resolveSeverity converts null → 'NONE' so the class map lookups always
  // receive a valid key and never return undefined
  const severity = resolveSeverity(cve.severity)
  const borderClass = SEVERITY_CARD_BORDER[severity]
  const badgeClass = SEVERITY_BADGE_CLASSES[severity]
  const scoreColor = SEVERITY_SCORE_COLOR[severity]

  return (
    <a
      href={cve.nvdUrl}
      target="_blank"
      rel="noopener noreferrer"  // Prevents tab-napping — new tab can't access window.opener
      className={`
        block bg-white rounded-lg shadow-sm
        hover:shadow-md transition-shadow duration-200
        ${borderClass} overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-blue-500
      `}
      aria-label={`View ${cve.id} on NVD`}
    >
      <div className="p-4 flex flex-col gap-3 h-full">
        {/* Header: CVE ID on the left, severity badge on the right */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-blue-700 shrink-0">
            {cve.id}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}
          >
            {/* Show 'N/A' instead of 'NONE' — 'NONE' is an internal sentinel value */}
            {severity === 'NONE' ? 'N/A' : severity}
          </span>
        </div>

        {/* Description — truncated at a word boundary to fit the card */}
        <p className="text-sm text-gray-600 leading-relaxed flex-1">
          {truncateDescription(cve.description)}
        </p>

        {/* Footer: CVSS score on the left, publish date on the right */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">CVSS</span>
            <span className={`text-sm font-bold ${scoreColor}`}>
              {/* toFixed(1) formats e.g. 9.8 (not 9.800000001) */}
              {cve.baseScore !== null ? cve.baseScore.toFixed(1) : 'N/A'}
            </span>
          </div>
          <span className="text-xs text-gray-400">{formatDate(cve.published)}</span>
        </div>
      </div>
    </a>
  )
}
