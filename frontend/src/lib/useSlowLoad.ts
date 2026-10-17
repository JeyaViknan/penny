import { useEffect, useState } from 'react'

/**
 * True once something has been loading long enough to be worth explaining.
 *
 * <p>Free hosting sleeps an idle service, so the first visitor to a demo waits
 * for a cold start that can take half a minute. A spinner held for thirty
 * seconds is indistinguishable from a broken page, and the visitor most likely
 * to hit it is the one seeing the product for the first time.
 *
 * <p>The delay matters in both directions. Explaining a wait that never
 * materialises is its own problem -- a warm server answers in milliseconds, and
 * flashing "this may take a while" before the data lands makes a fast product
 * feel slow. So the message is withheld until the wait is real.
 */
export function useSlowLoad(loading: boolean, afterMs = 2500): boolean {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), afterMs)
    return () => clearTimeout(timer)
  }, [loading, afterMs])

  return slow
}
