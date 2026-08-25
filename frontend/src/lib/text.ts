/** ACCOUNT_STATUS reads as shouting; "Account status" reads as English. */
export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

/** Turns a SCREAMING_SNAKE action name into a sentence. */
export function humanise(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
