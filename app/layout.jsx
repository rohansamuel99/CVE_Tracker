/**
 * @file app/layout.jsx
 *
 * Root layout — wraps every page in the application.
 *
 * In Next.js App Router, this file is required and is the single place to:
 *   - Set the <html> and <body> tags (only allowed here, not in individual pages)
 *   - Apply global fonts and styles
 *   - Define default metadata (title, description) inherited by all pages
 *
 * The Inter font is loaded via next/font/google, which automatically self-hosts
 * the font files at build time. This avoids a third-party network request to
 * Google Fonts at runtime and prevents the font from blocking page render.
 *
 * `antialiased` on the body applies -webkit-font-smoothing: antialiased, which
 * makes text render more crisply on macOS/iOS displays.
 */

import { Inter } from 'next/font/google'
import './globals.css'

/**
 * Inter loaded with the Latin subset only — sufficient for English content
 * and keeps the font bundle smaller than loading all subsets.
 */
const inter = Inter({ subsets: ['latin'] })

/**
 * Default metadata applied to all pages.
 * Individual pages can override these values by exporting their own `metadata`.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata = {
  title: 'CVE Tracker',
  description: 'Track recent vulnerabilities from the National Vulnerability Database',
}

/**
 * Root layout component. Renders on every page request.
 *
 * @param {Object}      props
 * @param {JSX.Element} props.children  The current page's component tree
 * @returns {JSX.Element}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
