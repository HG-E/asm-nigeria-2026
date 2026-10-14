// Validates a "where to go after logging in" path (the "next" query param
// proxy.ts attaches when it bounces an unauthenticated visit away from a
// protected page, e.g. an author clicking the emailed "format my abstract"
// link without an active session). Only a same-origin, single-leading-slash
// path is accepted -- "//evil.com" and "https://evil.com" are both rejected,
// so this can never be turned into an open redirect by a crafted link.
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  if (value.includes("://")) return null
  return value
}
