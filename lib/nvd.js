/**
 * @file lib/nvd.js
 *
 * NVD (National Vulnerability Database) API client.
 *
 * Handles all communication with the NVD CVE 2.0 API:
 *   https://services.nvd.nist.gov/rest/json/cves/2.0
 *
 * Responsibilities:
 *   - Build query URLs from parameter objects
 *   - Fetch CVE data server-side with a 5-minute Next.js cache
 *   - Normalize the deeply-nested NVD response into a flat, display-friendly shape
 *   - Handle CVSS score extraction with a V3.1 → V3.0 → V2 fallback chain
 *
 * This module is only ever imported in Server Components or API routes —
 * it must never run in the browser (no 'use client' files should import it).
 */

const NVD_BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'

/**
 * Builds the full NVD API request URL by appending only the provided
 * parameters as query string entries. Undefined/null values are skipped.
 *
 * The NVD API requires keywordSearch to be at least 3 characters, so
 * shorter strings are silently dropped rather than causing a 400 error.
 *
 * @param {Object}  params
 * @param {number}  [params.resultsPerPage]   How many CVEs to return (max 2000)
 * @param {number}  [params.startIndex]       Offset for pagination (0-based)
 * @param {string}  [params.pubStartDate]     ISO 8601 start of publish date range, e.g. "2024-01-01T00:00:00.000"
 * @param {string}  [params.pubEndDate]       ISO 8601 end of publish date range
 * @param {string}  [params.cvssV3Severity]   Filter by severity: CRITICAL | HIGH | MEDIUM | LOW
 * @param {string}  [params.keywordSearch]    Full-text keyword search (min 3 chars)
 * @returns {string} The complete NVD API URL with query parameters
 */
function buildNVDUrl(params) {
  const url = new URL(NVD_BASE_URL)

  if (params.resultsPerPage !== undefined)
    url.searchParams.set('resultsPerPage', String(params.resultsPerPage))
  if (params.startIndex !== undefined)
    url.searchParams.set('startIndex', String(params.startIndex))
  if (params.pubStartDate)
    url.searchParams.set('pubStartDate', params.pubStartDate)
  if (params.pubEndDate)
    url.searchParams.set('pubEndDate', params.pubEndDate)
  if (params.cvssV3Severity)
    url.searchParams.set('cvssV3Severity', params.cvssV3Severity)
  if (params.keywordSearch && params.keywordSearch.length >= 3)
    url.searchParams.set('keywordSearch', params.keywordSearch)

  return url.toString()
}

/**
 * Extracts the English-language description from a CVE's descriptions array.
 * The NVD API returns descriptions in multiple languages; we always want 'en'.
 * Falls back to a placeholder string if no English description is present.
 *
 * @param {Object} cve  Raw NVD CVE object from the API response
 * @returns {string}    The English description, or a fallback message
 */
function getEnglishDescription(cve) {
  const english = cve.descriptions?.find((d) => d.lang === 'en')
  return english?.value ?? 'No description available.'
}

/**
 * Extracts the CVSS base score and severity label from a CVE, using a
 * version fallback chain: CVSS V3.1 → CVSS V3.0 → CVSS V2.
 *
 * Within each version, the 'Primary' source (scored by NIST) is preferred
 * over 'Secondary' sources (scored by the vendor or a third party), because
 * vendor scores can be lower than NIST's independent assessment.
 *
 * Note: In CVSS V2, baseSeverity is stored at the metric level (not inside
 * cvssData), so it needs to be read from a different location than V3.x.
 *
 * Returns null if the CVE has no CVSS scoring at all (common for very
 * old CVEs or newly published ones that haven't been scored yet).
 *
 * @param {Object} cve  Raw NVD CVE object
 * @returns {{ baseScore: number, severity: string } | null}
 */
function getCvssData(cve) {
  const metrics = cve.metrics ?? {}
  const v31 = metrics.cvssMetricV31
  const v30 = metrics.cvssMetricV30
  const v2 = metrics.cvssMetricV2

  // Helper: prefer the Primary source entry, fall back to first available
  const findPrimary = (arr) =>
    arr?.find((m) => m.type === 'Primary') ?? arr?.[0]

  const v31metric = findPrimary(v31)
  if (v31metric) {
    return {
      baseScore: v31metric.cvssData.baseScore,
      severity: v31metric.cvssData.baseSeverity,
    }
  }

  const v30metric = findPrimary(v30)
  if (v30metric) {
    return {
      baseScore: v30metric.cvssData.baseScore,
      severity: v30metric.cvssData.baseSeverity,
    }
  }

  // V2 quirk: baseSeverity lives at the metric level, not inside cvssData
  const v2metric = findPrimary(v2)
  if (v2metric) {
    return {
      baseScore: v2metric.cvssData.baseScore,
      severity: v2metric.baseSeverity?.toUpperCase() ?? null,
    }
  }

  return null
}

/**
 * Flattens a raw NVD CVE object (deeply nested) into a clean, flat object
 * that components can consume directly without further data processing.
 *
 * The normalized shape intentionally omits fields that components don't need
 * (e.g. weaknesses, configurations, full references list) to keep the
 * client-side payload small.
 *
 * @param {Object} cve  Raw NVD CVE object from the vulnerabilities array
 * @returns {{
 *   id:           string,   // e.g. "CVE-2024-12345"
 *   description:  string,   // English description
 *   baseScore:    number|null,  // CVSS base score, e.g. 9.8
 *   severity:     string|null,  // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null
 *   published:    string,   // ISO 8601 publish date
 *   lastModified: string,   // ISO 8601 last-modified date
 *   nvdUrl:       string,   // Link to the NVD detail page
 *   vulnStatus:   string,   // e.g. "Analyzed", "Awaiting Analysis"
 * }}
 */
function normalizeCve(cve) {
  const cvss = getCvssData(cve)
  return {
    id: cve.id,
    description: getEnglishDescription(cve),
    baseScore: cvss?.baseScore ?? null,
    severity: cvss?.severity ?? null,
    published: cve.published,
    lastModified: cve.lastModified,
    nvdUrl: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
    vulnStatus: cve.vulnStatus ?? '',
  }
}

/**
 * Fetches CVEs from the NVD API, normalizes each result, and returns
 * the data along with pagination metadata.
 *
 * Uses Next.js extended fetch caching (`next: { revalidate: 300 }`) so the
 * server only makes a real request to NVD once every 5 minutes regardless
 * of how many users hit the page. This keeps the app well within the NVD
 * rate limit of ~5 unauthenticated requests per 30 seconds.
 *
 * Throws descriptive errors on non-OK responses so callers can display
 * appropriate messages (e.g. rate-limit notice vs. generic error).
 *
 * @param {Object}  [params={}]             Query parameters (see buildNVDUrl)
 * @param {number}  [params.resultsPerPage]
 * @param {number}  [params.startIndex]
 * @param {string}  [params.pubStartDate]
 * @param {string}  [params.pubEndDate]
 * @param {string}  [params.cvssV3Severity]
 * @param {string}  [params.keywordSearch]
 * @returns {Promise<{
 *   cves:           Object[],  // Array of normalized CVE objects
 *   totalResults:   number,    // Total matching CVEs in NVD (may exceed resultsPerPage)
 *   resultsPerPage: number,    // How many were returned in this response
 *   startIndex:     number,    // Pagination offset that was used
 * }>}
 * @throws {Error} If the NVD API returns a non-OK status
 */
export async function fetchCVEs(params = {}) {
  const url = buildNVDUrl(params)

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Next.js extended fetch: cache response for 5 minutes across all users
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('NVD API rate limit exceeded. Please try again shortly.')
    }
    throw new Error(`NVD API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  return {
    cves: data.vulnerabilities.map((v) => normalizeCve(v.cve)),
    totalResults: data.totalResults,
    resultsPerPage: data.resultsPerPage,
    startIndex: data.startIndex,
  }
}
