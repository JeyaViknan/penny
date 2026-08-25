import { twMerge } from 'tailwind-merge'

/**
 * Joins class names, with later Tailwind utilities winning over earlier ones in
 * the same category.
 *
 * <p>The previous implementation was a plain join, which meant a `className`
 * prop could only override a component's own classes when it happened to sort
 * later in the generated stylesheet. `cn('px-3', 'px-6')` emitted both and let
 * CSS source order decide -- so overrides worked by luck, and appeared to work
 * right up until Tailwind reordered its output. `twMerge` resolves the conflict
 * by keeping the last one, which is what every call site already assumed.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean).join(' '))
}
