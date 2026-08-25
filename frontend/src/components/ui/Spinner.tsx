import { cn } from '../../lib/cn'

/**
 * Rotation is a continuous, non-vestibular motion, so it is one of the few
 * animations worth keeping under reduced-motion -- it communicates "still
 * working" and removing it entirely would leave a static dot that reads as
 * frozen. It is slowed rather than stopped.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin motion-reduce:[animation-duration:1.8s]', className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
