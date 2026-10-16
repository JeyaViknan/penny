import { useEffect } from 'react'

const SUFFIX = 'Penny'

/**
 * Names the browser tab after the page you are on.
 *
 * <p>Every route previously rendered under the same static title, so a reader
 * with Penny open alongside other work had several identical tabs and no way to
 * tell which held the account they were looking at. Browser history was equally
 * useless -- a day's navigation collapsed into one repeated entry.
 *
 * <p>The page name comes first because tab labels truncate from the right: at
 * the width of a crowded tab strip, "Transactions" survives and "Penny —" would
 * be all that remained of the other order.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
    return () => {
      document.title = previous
    }
  }, [title])
}
