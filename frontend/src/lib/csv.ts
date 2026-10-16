/**
 * CSV export, done carefully enough to be trusted.
 *
 * <p>Money data gets opened in a spreadsheet, and a naive join on commas
 * corrupts exactly the rows that matter: a reference containing a comma shifts
 * every column after it, and one containing a quote breaks the row outright.
 * Both produce a file that opens without complaint and is silently wrong, which
 * is worse than a file that fails to open.
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  // RFC 4180: wrap in quotes if the value contains a delimiter, quote or
  // newline, and double any embedded quotes.
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  // CRLF, because that is what RFC 4180 specifies and what Excel expects.
  return lines.join('\r\n')
}

/**
 * Hands the file to the browser.
 *
 * <p>The BOM is not decoration: without it Excel on Windows reads the file as
 * the system codepage rather than UTF-8, and any non-ASCII character in a
 * holder's name arrives mangled.
 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the navigation to have started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A filename that sorts chronologically and says what it contains. */
export function timestampedFilename(prefix: string): string {
  const now = new Date()
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-')
  return `${prefix}-${stamp}.csv`
}
