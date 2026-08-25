/**
 * A small, consistent icon set drawn on one 20x20 grid with a single 1.6
 * stroke weight. Mixing icon families is one of the fastest ways to make an
 * interface look assembled rather than designed, so these are hand-kept
 * uniform rather than pulled from a library.
 */
const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

type IconProps = { className?: string }

export const IconDashboard = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="6" height="7" rx="1.5" />
    <rect x="11" y="3" width="6" height="4" rx="1.5" />
    <rect x="11" y="9" width="6" height="8" rx="1.5" />
    <rect x="3" y="12" width="6" height="5" rx="1.5" />
  </svg>
)

export const IconAccounts = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="2.5" y="5" width="15" height="11" rx="2" />
    <path d="M2.5 8.5h15" />
    <path d="M5.5 12.5h3" />
  </svg>
)

export const IconTransfer = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 7.5h11M12 4.5l3 3" />
    <path d="M16 12.5H5M8 15.5l-3-3" />
  </svg>
)

export const IconHistory = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 1.75" />
  </svg>
)

export const IconAudit = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 3.5h7l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
    <path d="M11.5 3.5V7H15" />
    <path d="M7 11h6M7 13.5h4" />
  </svg>
)

export const IconUsers = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="7" r="2.75" />
    <path d="M3.5 16c0-2.5 2-4.25 4.5-4.25S12.5 13.5 12.5 16" />
    <path d="M13.5 7.5a2.25 2.25 0 0 1 0 4M15 15.75c0-1.9-.6-3.1-1.6-3.85" />
  </svg>
)

export const IconPlus = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
)

export const IconArrowLeft = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M15.5 10h-11M8 5.5 3.5 10 8 14.5" />
  </svg>
)

export const IconMenu = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
  </svg>
)

export const IconClose = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
  </svg>
)

export const IconDeposit = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9" />
    <path d="M4 16.5h12" />
  </svg>
)

export const IconWithdraw = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M10 12.5v-9M6.5 7 10 3.5 13.5 7" />
    <path d="M4 16.5h12" />
  </svg>
)

export const IconShield = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M10 2.75 16 5v4.5c0 3.6-2.4 6.5-6 7.75-3.6-1.25-6-4.15-6-7.75V5l6-2.25Z" />
    <path d="m7.5 10 1.75 1.75L12.75 8.5" />
  </svg>
)

export const IconLogout = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12.5 6V4.5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V14" />
    <path d="M8.5 10h8M14 7.5 16.5 10 14 12.5" />
  </svg>
)
