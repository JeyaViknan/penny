import { useCallback, useEffect, useRef, useState } from 'react'
import { extractErrorMessage } from '../api/client'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  /** True while re-fetching over data that is already on screen. */
  isRefetching: boolean
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
 *
 * <p><b>`loading` and `isRefetching` are deliberately different.</b> `loading`
 * is the first load, when there is nothing to show and a skeleton is honest.
 * `isRefetching` is every load after that, when the previous data is still on
 * screen and correct. Collapsing the two is what made reloading a page tear the
 * table down and rebuild it: a deposit would post, the list would blank to
 * skeletons, and the row would reappear — a flash of nothing between two
 * correct states, which reads as a page breaking rather than updating.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)

  // Held in a ref so an inline arrow function does not retrigger the effect
  // on every render; `deps` is the intentional invalidation signal.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Read inside the effect without making it a dependency: whether this load is
  // a first load or a refetch is a property of what is already on screen, not a
  // reason to fetch again.
  const hasData = useRef(false)
  hasData.current = data !== null

  useEffect(() => {
    const currentRequest = ++requestId.current
    let active = true

    if (hasData.current) setIsRefetching(true)
    else setLoading(true)
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
        if (active && currentRequest === requestId.current) {
          setLoading(false)
          setIsRefetching(false)
        }
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, isRefetching, error, reload }
}
