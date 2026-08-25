import { useCallback, useEffect, useRef, useState } from 'react'
import { extractErrorMessage } from '../api/client'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loading / loaded / failed for a single fetch, in one place.
 *
 * <p>Every page previously repeated this as an ad-hoc `useEffect` with its own
 * `setError(extractErrorMessage(e))`, which meant each screen could quietly
 * handle failure differently. Centralising it is what makes "every data screen
 * has a real error state" true by construction rather than by discipline.
 *
 * <p>Results from a superseded request are discarded, so a slow first response
 * landing after a fast second one cannot overwrite fresher data.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)

  // Held in a ref so an inline arrow function does not retrigger the effect
  // on every render; `deps` is the intentional invalidation signal.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const currentRequest = ++requestId.current
    let active = true
    setLoading(true)
    setError(null)

    fetcherRef
      .current()
      .then((result) => {
        if (active && currentRequest === requestId.current) setData(result)
      })
      .catch((err) => {
        if (active && currentRequest === requestId.current) setError(extractErrorMessage(err))
      })
      .finally(() => {
        if (active && currentRequest === requestId.current) setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}
