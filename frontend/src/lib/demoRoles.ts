import type { Role } from '../api/types'

export interface DemoRole {
  username: string
  role: Role
  summary: string
  permissions: string[]
}

/**
 * The demo logins, as static content.
 *
 * <p>These were previously served by the API, which was a mistake worth naming:
 * it made the most important thing on the sign-in page -- the explanation of
 * what the product does -- wait on a request. On free hosting the service
 * sleeps, so the first visitor waited half a minute looking at placeholder
 * boxes. Showing a skeleton instead of nothing was an improvement and still the
 * wrong answer; the correct one is not to need the round trip.
 *
 * <p>Nothing here is data. The roles do not change at runtime, and the
 * descriptions are documentation of rules enforced in the service layer -- each
 * line corresponds to a {@code @PreAuthorize} in the backend. Fetching
 * documentation is the part that made no sense.
 *
 * <p>The password is supplied at build time through {@code VITE_DEMO_PASSWORD}.
 * When it is unset this whole section does not render, so a deployment that is
 * not a demo advertises no way in.
 */
export const DEMO_ROLES: DemoRole[] = [
  {
    username: 'jane_customer',
    role: 'CUSTOMER',
    summary: 'Sees only her own accounts and the transactions touching them.',
    permissions: [
      'Read her own accounts',
      'Send money from her own accounts',
      'Cannot see other customers, staff pages, or the audit trail',
    ],
  },
  {
    username: 'tom_teller',
    role: 'TELLER',
    summary: 'Front-desk staff: opens accounts and moves money for customers.',
    permissions: [
      'Open accounts',
      'Record deposits and withdrawals',
      'Post transfers',
      'Read every account',
      'Cannot freeze or close an account',
    ],
  },
  {
    username: 'amy_auditor',
    role: 'AUDITOR',
    summary: 'Reads everything and changes nothing.',
    permissions: [
      'Read every account and transaction',
      'Read the audit trail',
      'Verify the books balance',
      'Cannot move money at all',
    ],
  },
  {
    username: 'dana_admin',
    role: 'ADMIN',
    summary: 'Full access, including the account lifecycle.',
    permissions: [
      'Everything a teller can do',
      'Freeze, reactivate and close accounts',
      'Add people',
      'Read the audit trail',
    ],
  },
]

/** Empty unless this build was configured as a demo. */
export const DEMO_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD ?? ''

export const IS_DEMO = DEMO_PASSWORD.length > 0
