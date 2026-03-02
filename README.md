# CVE Tracker

A cybersecurity portfolio project that fetches recent vulnerabilities from the [National Vulnerability Database (NVD)](https://nvd.nist.gov) and displays them in an interactive dashboard.

Built with **Next.js 16**, **React 19**, and **Tailwind CSS**. No TypeScript — plain JavaScript throughout.

---

## Features

- **Live CVE data** — pulls the 60 most recent CVEs published in the last 30 days from the NVD public API
- **Severity color-coding** — cards are visually color-coded by CVSS severity (Critical → red, High → orange, Medium → yellow, Low → green)
- **Real-time search** — filter by CVE ID or keyword in the description as you type
- **Severity filter** — one-click filter pills to show only Critical / High / Medium / Low CVEs
- **Sort controls** — sort by newest published, oldest published, or highest CVSS score
- **NVD links** — clicking any card opens the full official NVD detail page in a new tab
- **Server-side caching** — responses are cached for 5 minutes so the app never hits the NVD rate limit
- **Streaming loading state** — animated skeleton cards appear instantly while data loads
- **Responsive layout** — 1 column on mobile → 4 columns on wide screens

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) |
| Data source | [NVD CVE API 2.0](https://nvd.nist.gov/developers/vulnerabilities) |
| Language | JavaScript (ES modules, JSX) |
| Deployment | [Vercel](https://vercel.com) (recommended) |

---

## Project Structure

```
CVE_Tracker/
├── app/
│   ├── api/
│   │   └── cves/
│   │       └── route.js       # GET /api/cves — proxies requests to NVD
│   ├── globals.css            # Tailwind base styles
│   ├── layout.jsx             # Root layout, Inter font, metadata
│   └── page.jsx               # Homepage — server-side fetch + Suspense
├── components/
│   ├── CVECard.jsx            # Single CVE card (presentational)
│   ├── CVEList.jsx            # Card grid + owns all filter/sort state
│   └── SearchFilter.jsx       # Search input, severity pills, sort dropdown
├── lib/
│   ├── nvd.js                 # NVD API client, normalizer, CVSS fallback logic
│   └── utils.js               # Tailwind class maps, filter/sort/format helpers
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json              # Path alias: @/ → project root
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd CVE_Tracker

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other commands

```bash
npm run build    # Create a production build
npm run start    # Run the production build locally
npm run lint     # Run ESLint
```

---

## How It Works

### Data flow

```
Browser (page load)
  → app/page.jsx          [Server Component — runs on the server]
    → lib/nvd.js           fetchCVEs() with pubStartDate = 30 days ago
      → NVD API            services.nvd.nist.gov/rest/json/cves/2.0
    → normalizeCve()       flattens nested NVD response into clean objects
  → components/CVEList.jsx [Client Component — hydrated in the browser]
    → useMemo              re-runs filterCVEs() + sortCVEs() on every state change
    → components/CVECard   renders one card per CVE
    → user clicks card     opens nvd.nist.gov/vuln/detail/{id} in new tab
```

### Why a server-side proxy?

The app fetches NVD data in `app/page.jsx` (a Next.js Server Component) and through the `/api/cves` route rather than directly from the browser. This solves two problems:

1. **CORS** — NVD's CORS headers are inconsistent across browsers. Server-side requests bypass CORS entirely.
2. **Rate limiting** — NVD limits unauthenticated requests to ~5 per 30 seconds. Next.js caches the server-side fetch response for 5 minutes (`next: { revalidate: 300 }`), so all visitors share one cached response instead of each triggering a separate NVD request.

### CVSS scoring fallback

Not all CVEs have CVSS v3.1 scores. The app tries them in order:

```
CVSS v3.1 (preferred) → CVSS v3.0 → CVSS v2 → null (shown as "N/A")
```

Within each version, it prefers the **Primary** source (NIST's own score) over secondary vendor-supplied scores.

### Why no date filter by default returns 1988 CVEs

The NVD API has no "sort by newest" parameter — it returns results in internal database order, which starts from the oldest CVEs ever recorded (1988). The app solves this by always passing `pubStartDate` (30 days ago) and `pubEndDate` (today) to restrict results to recent vulnerabilities.

---

## NVD API

This project uses the [NVD CVE API 2.0](https://nvd.nist.gov/developers/vulnerabilities), which is **free and public** — no authentication required for basic use.

| Parameter | Used for |
|---|---|
| `resultsPerPage` | Fetch 60 CVEs per load |
| `pubStartDate` | Start of the 30-day window |
| `pubEndDate` | End of the 30-day window (today) |

### Optional: Get a free API key

Without a key, NVD allows ~5 requests per 30 seconds. The 5-minute cache means this limit is never hit in normal usage.

If you want higher freshness or build pagination that makes many requests, you can get a free API key at [https://nvd.nist.gov/developers/request-an-api-key](https://nvd.nist.gov/developers/request-an-api-key).

Once you have a key:

1. Create a `.env.local` file in the project root:
   ```
   NVD_API_KEY=your-key-here
   ```
2. Add the header in `lib/nvd.js` inside `fetchCVEs`:
   ```js
   headers: {
     Accept: 'application/json',
     apiKey: process.env.NVD_API_KEY ?? '',
   },
   ```

---

## Deployment

### Deploy to Vercel (recommended — free tier)

```bash
# Install the Vercel CLI
npm install -g vercel

# Deploy from the project directory
vercel
```

Vercel auto-detects Next.js and configures everything. Your app will be live at a `*.vercel.app` URL within seconds.

### Deploy to other platforms

Any platform that supports Node.js can run this app:

```bash
npm run build   # outputs to .next/
npm run start   # serves the production build on port 3000
```

---

## Possible Extensions

Some ideas for taking this further:

- **Pagination** — the `/api/cves` route already accepts `startIndex`, so adding a "Load more" button is straightforward
- **Date range picker** — let users choose a custom date window instead of the fixed 30-day window
- **NVD API key** — add your key to `.env.local` for higher rate limits and fresher data
- **Affected product search** — NVD supports `keywordSearch` for product names (e.g. "Apache", "OpenSSL")
- **RSS/email alerts** — simulate a CVE subscription feed using client-side state
- **Severity trend chart** — visualize CVSS score distribution with a library like Chart.js or Recharts

---

## License

MIT — free to use, modify, and distribute.

---

## Acknowledgements

- Vulnerability data provided by the [National Vulnerability Database](https://nvd.nist.gov), maintained by NIST.
- CVE® is a trademark of [The MITRE Corporation](https://cve.mitre.org).
