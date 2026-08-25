import { useEffect, useState } from 'react'

/**
 * Delays a value so a filter fires when someone stops typing rather than on
 * every keystroke. Searching a ledger means a database query per character
 * otherwise, and the results flicker through states nobody asked for on the way
 * to the one they wanted.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}
