/// <reference types="vite/client" />

/**
 * Build-time configuration, inlined by Vite.
 *
 * <p>Declared rather than left implicit so a typo in a variable name is a
 * compile error instead of `undefined` silently reaching the running app --
 * which is exactly how the API base URL ended up pointing at a hostname that
 * did not resolve.
 */
interface ImportMetaEnv {
  /** Where the API lives. A bare host is normalised to https; see api/client.ts. */
  readonly VITE_API_BASE_URL?: string
  /**
   * Shared password for the seeded demo accounts. Its presence is what marks a
   * build as a demo: unset, the sign-in page shows no demo logins at all.
   */
  readonly VITE_DEMO_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
