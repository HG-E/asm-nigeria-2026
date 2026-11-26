import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { toPlain } from "@/lib/rich-text"

export type PresentationAuthorCandidate = {
  authorOrder: number
  fullName: string
}

export type PresentationEligibility =
  | {
      ok: false
      error: "paused" | "not_found" | "fee_not_verified" | "not_accepted" | "format_pending"
    }
  | {
      ok: true
      submissionId: string
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
    .select("presentation_certificates_open")
    .eq("is_active", true)
    .maybeSingle()

  const hasValidPreview =
    Boolean(process.env.PRESENTATION_CERTIFICATE_PREVIEW_TOKEN) &&
    previewToken === process.env.PRESENTATION_CERTIFICATE_PREVIEW_TOKEN

  if (!conference?.presentation_certificates_open && !hasValidPreview) {
    return { ok: false, error: "paused" }
  }

  const { data: submission } = await admin
    .from("submissions")
    .select(
      "id, title, reference_number, presentation_preference, payment_status, submission_authors(email, first_name, last_name, author_order)"
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
    candidates.push({ authorOrder: author.author_order, fullName })
  }

  return {
    ok: true,
    submissionId: submission.id,
    referenceNumber: submission.reference_number ?? referenceNumber,
    abstractTitle: toPlain(submission.title),
    presentationType,
    candidates,
  }
}
