import "server-only"

import { findColumn, parseCsvRecords } from "@/lib/parse-csv"

// Reference numbers are typed by hand into the Google Form -- phones
// autocorrect "-" to an en-dash, copy-paste from a confirmation email often
// drags in a stray space, and a leading zero ("004" vs "4") is an easy slip.
// None of those are the presenter doing anything wrong, so all of them need
// to still match: collapse every separator variant to "-", then drop
// leading zeros from each numeric run before comparing.
export function normalizeRef(ref: string): string {
  return ref
    .trim()
    .toUpperCase()
    .replace(/[‐-―_]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\d+/g, (m) => String(parseInt(m, 10)))
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type SubmissionRecord = {
  timestamp: string | null
  fileLink: string | null
}

export type TrackingData = { byRef: Map<string, SubmissionRecord>; byEmail: Map<string, SubmissionRecord> }

export async function fetchTrackingData(csvUrl: string): Promise<TrackingData | { error: string }> {
  let response: Response
  try {
    // A hung request would otherwise hold this page open indefinitely --
    // Google's own infrastructure is reliable, but there's no reason to
    // trust an external fetch to always come back promptly.
    response = await fetch(csvUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { error: "The tracking sheet took too long to respond. Try again in a moment." }
    }
    return { error: "Could not reach that URL. Check it's the published CSV link, not the normal sheet link." }
  }
  if (!response.ok) {
    return { error: `The tracking sheet URL returned an error (HTTP ${response.status}). Check it's still published.` }
  }

  const text = await response.text()
  const records = parseCsvRecords(text)
  const byRef = new Map<string, SubmissionRecord>()
  const byEmail = new Map<string, SubmissionRecord>()

  for (const record of records) {
    const fileColumn = findColumn(record, ["file", "drive", "presentation", "upload"])
    const timestampColumn = findColumn(record, ["timestamp"])
    const entry: SubmissionRecord = {
      timestamp: timestampColumn ? record[timestampColumn] || null : null,
      fileLink: fileColumn ? record[fileColumn] || null : null,
    }

    const refColumn = findColumn(record, ["reference"])
    const ref = refColumn ? normalizeRef(record[refColumn]) : ""
    if (ref) byRef.set(ref, entry)

    // Fallback key: if the reference number is garbled beyond what
    // normalizeRef can recover (or left blank), a matching email still
    // surfaces the submission instead of it silently reading as missing.
    const emailColumn = findColumn(record, ["email"])
    const email = emailColumn ? normalizeEmail(record[emailColumn]) : ""
    if (email) byEmail.set(email, entry)
  }

  return { byRef, byEmail }
}

export function lookupTrackedSubmission(
  tracking: TrackingData,
  referenceNumber: string | null,
  email: string | undefined
): SubmissionRecord | null {
  if (referenceNumber) {
    const byRef = tracking.byRef.get(normalizeRef(referenceNumber))
    if (byRef) return byRef
  }
  if (email) {
    const byEmail = tracking.byEmail.get(normalizeEmail(email))
    if (byEmail) return byEmail
  }
  return null
}
