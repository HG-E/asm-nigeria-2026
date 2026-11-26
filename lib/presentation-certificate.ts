import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { toPlain } from "@/lib/rich-text"

const HONORIFICS = new Set(["dr", "prof", "professor", "mr", "mrs", "ms", "miss", "phd", "md", "engr", "barr"])

function nameWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !HONORIFICS.has(w))
  )
}

/**
 * Loosely checks that two names plausibly refer to the same person --
 * tolerant of titles ("PhD", "Dr"), middle names, and punctuation
 * differences, but not of two genuinely different names. Every
 * meaningful word of the SHORTER name must appear in the longer one, so
 * "Sylvia Anyadoh-Nwadike" matches "Sylvia Onyinyechi Anyadoh-Nwadike,
 * PhD", but "Juliet Okafor" does not.
 *
 * This exists because a registration or fee payment is looked up by email
 * alone, and live data confirmed real cases of two genuinely different
 * co-authors sharing one listed email on the same abstract (see the dedupe
 * comment in lookupPresentationEligibility). Without this check, one of
 * them registering or paying would silently exempt the OTHER one too --
 * confirmed exploitable: a co-author with no registration and no paid fee
 * got a free certificate purely by sharing a shared, duplicated email with
 * someone who did have one. Comparing names doesn't fully solve the
 * underlying data problem (fixed properly via the admin author-edit panel
 * in app/admin/submissions/[id]/actions.ts), but it closes the actual
 * exploit: an exemption can no longer cross from one real person to a
 * different one who merely shares their email.
 */
export function namesLikelyMatch(a: string, b: string): boolean {
  const wordsA = nameWords(a)
  const wordsB = nameWords(b)
  if (wordsA.size === 0 || wordsB.size === 0) return false
  const [shorter, longer] = wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA]
  return [...shorter].every((w) => longer.has(w))
}

export type PresentationAuthorCandidate = {
  authorOrder: number
  fullName: string
  // Corresponding authors already paid the abstract's own ₦3,000 processing
  // fee at submission time, so they're exempt from the separate co-author
  // certificate fee checked in handlePresentation -- this flag is what lets
  // that decision be made per chosen candidate, not per submission.
  isCorresponding: boolean
}

export type PresentationEligibility =
  | {
      ok: false
      error: "paused" | "not_found" | "fee_not_verified" | "not_accepted" | "format_pending"
    }
  | {
      ok: true
      submissionId: string
      conferenceId: string
      referenceNumber: string
      abstractTitle: string
      presentationType: "Oral Presentation" | "Poster Presentation"
      /**
       * Every distinct person on the abstract whose email matched what was
       * submitted, deduped by name -- normally exactly one. See the
       * dedupe comment below for why this can be more than one.
       */
      candidates: PresentationAuthorCandidate[]
    }

/**
 * Shared by the certificate download route and the author-selection page so
 * the eligibility rules (fee verified, final decision accepted, oral/poster
 * resolved) and the email-matching rule live in exactly one place. Two
 * independent copies of this logic is how a security or eligibility check
 * quietly drifts out of sync between the two call sites.
 */
export async function lookupPresentationEligibility(
  referenceNumber: string,
  email: string,
  // Lets the admin's own testing bypass the public pause below -- compared
  // against PRESENTATION_CERTIFICATE_PREVIEW_TOKEN, same pattern as
  // COMMITTEE_REGISTRATION_TOKEN / VOLUNTEER_REGISTRATION_TOKEN elsewhere in
  // this app. Never trusted from anywhere but this exact env comparison.
  previewToken?: string
): Promise<PresentationEligibility> {
  const admin = createAdminClient()

  const { data: conference } = await admin
    .from("conferences")
    .select("id, presentation_certificates_open")
    .eq("is_active", true)
    .maybeSingle()

  const hasValidPreview =
    Boolean(process.env.PRESENTATION_CERTIFICATE_PREVIEW_TOKEN) &&
    previewToken === process.env.PRESENTATION_CERTIFICATE_PREVIEW_TOKEN

  if (!conference?.presentation_certificates_open && !hasValidPreview) {
    return { ok: false, error: "paused" }
  }
  // Guards the conference.id use below -- only reachable via the preview
  // bypass with no active conference configured at all, which shouldn't
  // happen in practice but would otherwise make every downstream lookup
  // meaningless.
  if (!conference) {
    return { ok: false, error: "not_found" }
  }

  const { data: submission } = await admin
    .from("submissions")
    .select(
      "id, title, reference_number, presentation_preference, payment_status, submission_authors(email, first_name, last_name, author_order, is_corresponding)"
    )
    .eq("reference_number", referenceNumber)
    .order("author_order", { referencedTable: "submission_authors", ascending: true })
    .maybeSingle()

  // Matched against ANY author listed on the abstract, not just the
  // corresponding author -- every co-author's own name and email is
  // captured and validated (required, not optional) when the corresponding
  // author submits the abstract (see coAuthorSchema in
  // lib/validations/submission.ts), so each one can self-serve their own
  // certificate using their own email, without registering separately.
  const normalizedEmail = email.trim().toLowerCase()
  const matchedAuthors = (submission?.submission_authors ?? []).filter(
    (a) => a.email?.trim().toLowerCase() === normalizedEmail
  )

  if (!submission || matchedAuthors.length === 0) {
    return { ok: false, error: "not_found" }
  }

  // Nothing earlier in the review pipeline (assignReviewerAction,
  // finalizeDecisionAction) checks this -- an abstract can be screened,
  // reviewed and accepted entirely independently of whether its ₦3,000
  // processing fee was ever verified. Without this check, an accepted
  // submission whose fee was never paid (or was rejected) could still
  // produce a Certificate of Presentation.
  if (submission.payment_status !== "verified") {
    return { ok: false, error: "fee_not_verified" }
  }

  const { data: decision } = await admin
    .from("decisions")
    .select("decision")
    .eq("submission_id", submission.id)
    .eq("is_final", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const ACCEPTED = ["accepted", "accepted_oral", "accepted_poster"]
  if (!decision || !ACCEPTED.includes(decision.decision)) {
    return { ok: false, error: "not_accepted" }
  }

  let presentationType: "Oral Presentation" | "Poster Presentation"
  if (decision.decision === "accepted_oral") {
    presentationType = "Oral Presentation"
  } else if (decision.decision === "accepted_poster") {
    presentationType = "Poster Presentation"
  } else if (submission.presentation_preference === "oral") {
    presentationType = "Oral Presentation"
  } else if (submission.presentation_preference === "poster") {
    presentationType = "Poster Presentation"
  } else {
    // Generic "accepted" with no oral/poster preference on record -- there's
    // no honest value to print here, so this isn't ready yet rather than a
    // guess.
    return { ok: false, error: "format_pending" }
  }

  // Real submission data has corresponding authors who didn't yet have a
  // co-author's email at submission time and typed their own (or another
  // listed author's) email into that co-author's row instead -- live data
  // confirmed ~8% of multi-author accepted abstracts have this. Without
  // deduping, two or more *different* people sharing one email would
  // silently collapse onto whichever has the lowest author_order, handing
  // every one of them the same wrong name. Deduping by normalized name
  // collapses only genuine duplicates (the same person's row entered twice
  // under the same email) down to one entry; anyone else still appears as
  // their own candidate for the selection step below to disambiguate.
  const seen = new Set<string>()
  const candidates: PresentationAuthorCandidate[] = []
  for (const author of matchedAuthors) {
    const fullName = `${author.first_name} ${author.last_name}`.trim().replace(/\s+/g, " ")
    const key = fullName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({ authorOrder: author.author_order, fullName, isCorresponding: author.is_corresponding })
  }

  return {
    ok: true,
    submissionId: submission.id,
    conferenceId: conference.id,
    referenceNumber: submission.reference_number ?? referenceNumber,
    abstractTitle: toPlain(submission.title),
    presentationType,
    candidates,
  }
}

export type CoauthorFeeStatus = "exempt" | "verified" | "pending" | "rejected" | "unpaid"

/**
 * Whether this specific candidate still needs to pay (or wait on) the flat,
 * one-time co-author certificate fee before their Certificate of
 * Presentation can be issued. Two independent ways to be "exempt":
 *
 *  1. They're the corresponding author on THIS abstract -- already paid
 *     the abstract's own processing fee.
 *  2. They've separately registered and paid for the conference itself,
 *     under this same email -- the fee exists to charge co-authors who
 *     never contributed anything toward the conference financially; it was
 *     never meant to charge someone twice who already has.
 *
 * An earlier version of this file tried a much stricter rule -- requiring
 * EVERY author to have a conference registration before any certificate
 * could be issued at all -- and live data showed that would have blocked
 * roughly three in four listed authors, including a third of actual
 * presenters, almost none of it from a fixable email mismatch. This is the
 * safe version of that same idea: a registered person is simply exempt from
 * the fee rather than the fee becoming a hard, irreversible lockout for
 * everyone else. Worst case on a missed match here is someone who should
 * have been exempt is asked to pay instead -- an inconvenience an admin can
 * manually wave through, not a hard failure.
 *
 * fullName is required (not optional) specifically so every call site is
 * forced to pass the actual chosen candidate's name -- see namesLikelyMatch
 * above for why a name check is needed at all here.
 */
export async function getCoauthorFeeStatus(
  conferenceId: string,
  email: string,
  fullName: string,
  isCorresponding: boolean
): Promise<CoauthorFeeStatus> {
  if (isCorresponding) return "exempt"

  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  // Looked up the same safe way as every other email match in this file:
  // filter server-side on the cheap, known-safe columns, then compare the
  // email exactly in JS -- never .ilike(column, email), which treats
  // "%"/"_" in the value as wildcards. The name check on top stops one
  // real person's registration from exempting a DIFFERENT real person who
  // merely shares their listed email (see namesLikelyMatch's comment).
  const { data: registrations } = await admin
    .from("conference_registrations")
    .select("email, full_name")
    .eq("conference_id", conferenceId)
    .eq("payment_status", "verified")
  const hasConferenceRegistration = (registrations ?? []).some(
    (r) => r.email.trim().toLowerCase() === normalizedEmail && namesLikelyMatch(r.full_name, fullName)
  )
  if (hasConferenceRegistration) return "exempt"

  // Scoped by conference_id server-side (safe, not user input), then
  // compared exactly in JS for the email -- same reasoning as elsewhere in
  // this file: never .ilike(column, userValue). Same name guard as above.
  const { data: rows } = await admin
    .from("coauthor_certificate_fees")
    .select("email, full_name, payment_status")
    .eq("conference_id", conferenceId)
  const row = rows?.find(
    (r) => r.email.trim().toLowerCase() === normalizedEmail && namesLikelyMatch(r.full_name, fullName)
  )

  if (!row) return "unpaid"
  if (row.payment_status === "verified") return "verified"
  if (row.payment_status === "rejected") return "rejected"
  return "pending"
}

export type AmbiguousAuthorEmailGroup = {
  submissionId: string
  referenceNumber: string
  abstractTitle: string
  email: string
  names: string[]
}

/**
 * Finds every accepted, fee-verified abstract where two or more genuinely
 * different people share one listed author email -- the exact data
 * condition that forces a co-author onto the "which name is yours?"
 * selection screen, and the one namesLikelyMatch above exists to stop from
 * becoming a free-certificate exploit. Letting an admin proactively find
 * and fix these via the author-edit panel in
 * app/admin/submissions/[id]/actions.ts is better than only ever
 * discovering one when a real co-author happens to hit the selection
 * screen themselves.
 */
export async function findAmbiguousAuthorEmails(conferenceId: string): Promise<AmbiguousAuthorEmailGroup[]> {
  const admin = createAdminClient()

  const { data: decisions } = await admin
    .from("decisions")
    .select("submission_id, decision, is_final")
    .eq("is_final", true)
    .in("decision", ["accepted", "accepted_oral", "accepted_poster"])
  const acceptedIds = new Set((decisions ?? []).map((d) => d.submission_id))
  if (acceptedIds.size === 0) return []

  const { data: submissions } = await admin
    .from("submissions")
    .select(
      "id, reference_number, title, payment_status, conference_id, submission_authors(email, first_name, last_name, author_order)"
    )
    .eq("conference_id", conferenceId)
    .eq("payment_status", "verified")

  const groups: AmbiguousAuthorEmailGroup[] = []
  for (const s of submissions ?? []) {
    if (!acceptedIds.has(s.id) || !s.reference_number) continue

    const byEmail = new Map<string, typeof s.submission_authors>()
    for (const a of s.submission_authors) {
      const key = a.email.trim().toLowerCase()
      if (!byEmail.has(key)) byEmail.set(key, [])
      byEmail.get(key)!.push(a)
    }

    for (const [email, authors] of byEmail) {
      if (authors.length < 2) continue
      const seen = new Set<string>()
      const names: string[] = []
      for (const a of authors.sort((x, y) => x.author_order - y.author_order)) {
        const fullName = `${a.first_name} ${a.last_name}`.trim().replace(/\s+/g, " ")
        const key = fullName.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        names.push(fullName)
      }
      if (names.length > 1) {
        groups.push({ submissionId: s.id, referenceNumber: s.reference_number, abstractTitle: toPlain(s.title), email, names })
      }
    }
  }

  return groups
}
