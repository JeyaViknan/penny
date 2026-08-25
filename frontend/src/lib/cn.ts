/**
 * Minimal class-name joiner. Deliberately not a dependency -- the app only
 * needs conditional joining, and `clsx` would be 2kB for a five-line function.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
