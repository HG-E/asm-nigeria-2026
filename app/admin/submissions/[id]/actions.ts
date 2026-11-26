"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"

import { applyFormattingOnly } from "@/lib/abstract-formatting"
import { normalizeKeywords, normalizeTitle } from "@/lib/abstract-structure"
import { requireRole } from "@/lib/auth"
import { createDecisionDocuments, formatAuthorList, isAcceptDecision } from "@/lib/decision-documents"
import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  formattingSchema,
  revisionTitleSchema,
  type FormattingFormInput,
  type RevisionTitleInput,
} from "@/lib/validations/submission"
import type { Database } from "@/types/database"
import { toPlain } from "@/lib/rich-text"

export type ActionResult = { error: string } | { success: true }

const DECISION_TO_SUBMISSION_STATUS: Record<
  Database["public"]["Enums"]["decision_type"],
  Database["public"]["Enums"]["submission_status"]
> = {
  accepted: "accepted",
  accepted_oral: "accepted_oral",
  accepted_poster: "accepted_poster",
  minor_revision: "revision_required",
  major_revision: "revision_required",
  rejected: "rejected",
}

export async function assignReviewerAction(
  submissionId: string,
  reviewerId: string
): Promise<ActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("conference_id, status, conferences(review_deadline)")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  // submit_abstract() sets due_date from the conference's review_deadline
  // when auto-routing on first submission -- this manual path (used when
  // nobody matched by subtheme, or an extra reviewer is needed) never did,
  // so a manually-assigned reviewer's due date showed as "--" on both
  // dashboards, never counted as overdue, and -- the bigger problem --
  // app/api/cron/reminders/route.ts filters on due_date is not null, so
  // they never received a single deadline reminder email either.
  const reviewDeadline = submission.conferences?.review_deadline ?? null

  // review_assignments_submission_reviewer_key is a plain unique constraint
  // on (submission_id, reviewer_id) -- not scoped to is_active -- while
  // removeAssignmentAction only soft-deletes (is_active = false). So a
  // reviewer who was ever removed from this submission, even once, could
  // never be re-assigned to it again: the INSERT below would always hit the
  // constraint and report "already assigned," which is actively misleading
  // once they're no longer showing as assigned anywhere in the UI.
  // Reactivate the existing row instead of inserting a fresh one when a
  // prior (now-inactive) assignment is found, same as a fresh assignment in
  // every way that matters to the reviewer and the committee.
  const { data: existing } = await supabase
    .from("review_assignments")
    .select("id, is_active")
    .eq("submission_id", submissionId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle()

  if (existing?.is_active) {
    return { error: "This reviewer is already assigned to this submission." }
  }

  const { error } = existing
    ? await supabase
        .from("review_assignments")
        .update({
          is_active: true,
          status: "pending",
          assigned_by: session.authUserId,
          due_date: reviewDeadline,
          accepted_at: null,
          completed_at: null,
          conflict_declared_at: null,
          conflict_reason: null,
        })
        .eq("id", existing.id)
    : await supabase.from("review_assignments").insert({
        submission_id: submissionId,
        reviewer_id: reviewerId,
        conference_id: submission.conference_id,
        status: "pending",
        assigned_by: session.authUserId,
        due_date: reviewDeadline,
      })

  if (error) {
    if (error.code === "23505") {
      return { error: "This reviewer is already assigned to this submission." }
    }
    return { error: "Could not assign the reviewer. Please try again." }
  }

  if (submission.status === "submitted" || submission.status === "screening") {
    await supabase.from("submissions").update({ status: "assigned" }).eq("id", submissionId)
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "reviewer_manually_assigned",
    entity_type: "submission",
    entity_id: submissionId,
    metadata: { reviewer_id: reviewerId },
  })

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}

export async function finalizeDecisionAction(
  submissionId: string,
  decisionId: string
): Promise<ActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { data: decision } = await supabase
    .from("decisions")
    .select("id, decision, is_final")
    .eq("id", decisionId)
    .single()

  if (!decision) {
    return { error: "Decision not found." }
  }
  if (decision.is_final) {
    return { error: "This decision has already been finalized." }
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("corresponding_author_id, reference_number, status, title, presentation_preference")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  // RLS on user_profiles has no policy letting one user read another's
  // row, so this lookup needs the service-role client -- the session-bound
  // one silently returns null here, which previously fed an empty
  // recipient_email into the notification and made it fail SMTP-side.
  const { data: author } = await createAdminClient()
    .from("user_profiles")
    .select("email, first_name, last_name")
    .eq("id", submission.corresponding_author_id)
    .single()

  const { error: decisionError } = await supabase
    .from("decisions")
    .update({ is_final: true })
    .eq("id", decisionId)

  if (decisionError) {
    return { error: "Could not finalize the decision. Please try again." }
  }

  const newStatus = DECISION_TO_SUBMISSION_STATUS[decision.decision]

  await supabase
    .from("submissions")
    .update({ status: newStatus })
    .eq("id", submissionId)

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "decision_finalized",
    entity_type: "submission",
    entity_id: submissionId,
    previous_status: submission.status,
    new_status: newStatus,
  })

  // Accept-type decisions get an auto-generated notification + letter, each
  // reachable via its own long-lived link in the acceptance email below --
  // revision/reject decisions never get one (nothing to accept yet). A
  // generation failure here is logged but not fatal: the decision is
  // already finalized and the author still needs to hear about it, just
  // without the document links this one time (findable/regeneratable by an
  // admin later; there's no user-facing retry surface for this yet).
  if (isAcceptDecision(decision.decision)) {
    const presentationType =
      decision.decision === "accepted_oral"
        ? "Oral Presentation"
        : decision.decision === "accepted_poster"
          ? "Poster Presentation"
          : submission.presentation_preference === "oral"
            ? "Oral Presentation"
            : submission.presentation_preference === "poster"
              ? "Poster Presentation"
              : "Oral or Poster Presentation"

    // All listed authors, in order, for the formal acceptance letter --
    // not just the corresponding author (submission_authors already has
    // first/last name, so no extra profile lookups are needed). Also
    // carries email/is_corresponding now, reused below to notify co-authors
    // directly -- previously only the corresponding author ever learned the
    // reference number, so a co-author had no way to self-serve their own
    // Certificate of Presentation unless the corresponding author happened
    // to forward it to them.
    const { data: allAuthors } = await createAdminClient()
      .from("submission_authors")
      .select("first_name, last_name, email, is_corresponding")
      .eq("submission_id", submissionId)
      .order("author_order")

    const result = await createDecisionDocuments(decisionId, submissionId, {
      authorFullName: `${author?.first_name ?? ""} ${author?.last_name ?? ""}`.trim(),
      authorNames: formatAuthorList((allAuthors ?? []).map((a) => `${a.first_name} ${a.last_name}`)),
      abstractTitle: toPlain(submission.title) || "Untitled",
      referenceNumber: submission.reference_number ?? submissionId,
      presentationType,
    })
    if ("error" in result) {
      console.error(`[finalizeDecisionAction] document generation failed for ${submissionId}:`, result.error)
    }

    // The corresponding author gets the full notification + acceptance
    // letter below; every OTHER listed author gets this shorter, separate
    // email instead, since they never get an account or a notifications-
    // table row (same reasoning as registration confirmations and the
    // co-author fee emails elsewhere in this app). One failed send here
    // doesn't block another author's, or the corresponding author's own
    // notification below.
    const referenceNumber = submission.reference_number ?? submissionId
    const abstractTitle = toPlain(submission.title) || "Untitled"
    const coAuthors = (allAuthors ?? []).filter((a) => !a.is_corresponding)
    if (coAuthors.length > 0) {
      after(() =>
        Promise.allSettled(
          coAuthors.map((coAuthor) =>
            sendMail({
              to: coAuthor.email,
              subject: `Your co-authored abstract has been accepted — ${referenceNumber}`,
              html: `
                <p>Hi ${escapeHtml(coAuthor.first_name)},</p>
                <p>The abstract you co-authored, "${escapeHtml(abstractTitle)}" (reference
                <strong>${escapeHtml(referenceNumber)}</strong>), has been accepted for ${escapeHtml(presentationType)}
                at the Maiden American Society for Microbiology Nigeria Conference 2026.</p>
                <p>As a co-author, you can download your own Certificate of Presentation -- in your own name -- after
                the conference, at <a href="https://www.asmnigeriaconference.com.ng/certificate?type=presentation">asmnigeriaconference.com.ng/certificate</a>,
                using this reference number and your own email address.</p>
                <p>If you haven't separately registered and paid for the conference, a one-time ₦5,000 co-author
                certificate fee applies -- you'll be guided through that automatically if needed when you try to
                download.</p>
              `,
            })
          )
        )
      )
    }
  }

  const { data: notification } = await supabase
    .from("notifications")
    .insert({
      recipient_id: submission.corresponding_author_id,
      recipient_email: author?.email ?? "",
      submission_id: submissionId,
      notification_type: "decision_notification",
      subject: `Decision on your submission: ${submission.reference_number}`,
      status: "pending",
    })
    .select("id")
    .single()

  if (notification) {
    after(() => sendNotifications([notification.id]))
  }

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}

export async function verifyPaymentAction(submissionId: string): Promise<ActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("corresponding_author_id, reference_number")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      payment_status: "verified",
      payment_verified_by: session.authUserId,
      payment_verified_at: new Date().toISOString(),
      payment_rejection_reason: null,
    })
    .eq("id", submissionId)

  if (error) {
    return { error: "Could not verify the payment. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "payment_verified",
    entity_type: "submission",
    entity_id: submissionId,
  })

  // Payment rejection already emails the author (below); verification is
  // the other half of that same signal and was silently not sending one
  // (found reviewing the flow end-to-end) -- the author had no way to know
  // their payment cleared short of logging in and checking.
  const { data: author } = await createAdminClient()
    .from("user_profiles")
    .select("email")
    .eq("id", submission.corresponding_author_id)
    .single()

  const { data: notification } = await supabase
    .from("notifications")
    .insert({
      recipient_id: submission.corresponding_author_id,
      recipient_email: author?.email ?? "",
      submission_id: submissionId,
      notification_type: "payment_verified",
      subject: `Payment confirmed: ${submission.reference_number ?? submissionId}`,
      status: "pending",
    })
    .select("id")
    .single()

  if (notification) {
    after(() => sendNotifications([notification.id]))
  }

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}

export async function rejectPaymentAction(
  submissionId: string,
  reason: string
): Promise<ActionResult> {
  const session = await requireRole("admin")
  if (!reason.trim()) {
    return { error: "Provide a reason so the author knows what to fix." }
  }
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("corresponding_author_id, reference_number")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  const { data: author } = await createAdminClient()
    .from("user_profiles")
    .select("email")
    .eq("id", submission.corresponding_author_id)
    .single()

  const { error } = await supabase
    .from("submissions")
    .update({
      payment_status: "rejected",
      payment_verified_by: session.authUserId,
      payment_verified_at: new Date().toISOString(),
      payment_rejection_reason: reason.trim(),
    })
    .eq("id", submissionId)

  if (error) {
    return { error: "Could not reject the payment. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "payment_rejected",
    entity_type: "submission",
    entity_id: submissionId,
    metadata: { reason: reason.trim() },
  })

  const { data: notification } = await supabase
    .from("notifications")
    .insert({
      recipient_id: submission.corresponding_author_id,
      recipient_email: author?.email ?? "",
      submission_id: submissionId,
      notification_type: "payment_rejected",
      subject: `Payment receipt needs attention: ${submission.reference_number ?? submissionId}`,
      status: "pending",
    })
    .select("id")
    .single()

  if (notification) {
    after(() => sendNotifications([notification.id]))
  }

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}

export async function removeAssignmentAction(
  submissionId: string,
  assignmentId: string
): Promise<ActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { error } = await supabase
    .from("review_assignments")
    .update({ is_active: false })
    .eq("id", assignmentId)

  if (error) {
    return { error: "Could not remove the assignment. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "reviewer_unassigned",
    entity_type: "submission",
    entity_id: submissionId,
    metadata: { assignment_id: assignmentId },
  })

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}

// Admin fixing italics etc. on an author's behalf. Same rule as the author's
// own edit: formatting only -- the words must not change.
export async function adminUpdateFormattingAction(
  submissionId: string,
  input: FormattingFormInput
): Promise<ActionResult> {
  const session = await requireRole("admin")
  const parsed = formattingSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid input" }

  const result = await applyFormattingOnly(submissionId, parsed.data, {
    id: session.authUserId,
    email: session.email,
    role: "admin",
  })
  if ("error" in result) return result

  revalidatePath(`/admin/submissions/${submissionId}`)
  revalidatePath(`/author/submissions/${submissionId}`)
  return { success: true }
}

// The admin-side counterpart of the author's updateRevisionTitleAction, for
// when ASM makes the reviewer's requested wording change on the author's
// behalf. A real edit, not formatting-only -- scoped to a submission that is
// actually sitting in revision_required, same as the author's own version.
export async function adminUpdateRevisionTitleAction(
  submissionId: string,
  input: RevisionTitleInput
): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = revisionTitleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const admin = createAdminClient()
  const { data: submission } = await admin
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .maybeSingle()

  if (!submission || submission.status !== "revision_required") {
    return { error: "This submission is not open for revision." }
  }

  const { error } = await admin
    .from("submissions")
    .update({
      title: normalizeTitle(parsed.data.title),
      keywords: normalizeKeywords(parsed.data.keywords),
    })
    .eq("id", submissionId)

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  revalidatePath(`/admin/submissions/${submissionId}`)
  revalidatePath(`/author/submissions/${submissionId}`)
  return { success: true }
}

const authorContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.email("Enter a valid email address."),
})

export type UpdateAuthorContactResult =
  | { error: string }
  | { error: string; duplicateOf: string; requiresConfirm: true }
  | { success: true }

// Lets an admin correct an author's own name/email on a submission -- most
// often to fix a co-author row where the corresponding author didn't have
// the real co-author's email at submission time and typed in someone
// else's instead (confirmed live on ~8% of multi-author accepted
// abstracts). That data error is exactly what the self-serve Certificate
// of Presentation flow (app/certificate/download/route.ts) has to work
// around with a "which name is yours" disambiguation step -- fixing the
// record here is what lets that step go away for a given abstract.
export async function updateAuthorContactAction(
  submissionId: string,
  authorId: string,
  input: { firstName: string; lastName: string; email: string },
  // Explicit, separate opt-in -- the default path refuses to save an email
  // that already belongs to a different author on the SAME submission,
  // since that's the exact duplicate-email condition the certificate
  // lookup has to disambiguate. An admin can force it through for the rare
  // genuine case (e.g. two authors sharing one institutional mailbox), but
  // only as a second, deliberate step, never silently.
  allowDuplicateEmail = false
): Promise<UpdateAuthorContactResult> {
  const session = await requireRole("admin")

  const parsed = authorContactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }
  const { firstName, lastName, email } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  const admin = createAdminClient()

  // Scoped by submission_id too, not just the author row's own id -- a
  // stale or tampered authorId must not be able to edit a row on a
  // different submission.
  const { data: authors } = await admin
    .from("submission_authors")
    .select("id, first_name, last_name, email")
    .eq("submission_id", submissionId)

  const target = authors?.find((a) => a.id === authorId)
  if (!target) {
    return { error: "Author not found on this submission." }
  }

  const duplicate = authors?.find(
    (a) => a.id !== authorId && a.email.trim().toLowerCase() === normalizedEmail
  )
  if (duplicate && !allowDuplicateEmail) {
    return {
      error: `This email is already on file for ${duplicate.first_name} ${duplicate.last_name} on this same abstract. Saving anyway will make it ambiguous which of them it belongs to when either downloads a certificate.`,
      duplicateOf: `${duplicate.first_name} ${duplicate.last_name}`,
      requiresConfirm: true,
    }
  }

  const { error: updateError } = await admin
    .from("submission_authors")
    .update({ first_name: firstName, last_name: lastName, email: normalizedEmail })
    .eq("id", authorId)

  if (updateError) {
    return { error: "Could not save. Please try again." }
  }

  await admin.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "submission_author_contact_corrected",
    entity_type: "submission",
    entity_id: submissionId,
    metadata: {
      author_id: authorId,
      previous: { first_name: target.first_name, last_name: target.last_name, email: target.email },
      updated: { first_name: firstName, last_name: lastName, email: normalizedEmail },
      forced_duplicate: Boolean(duplicate && allowDuplicateEmail),
    },
  })

  revalidatePath(`/admin/submissions/${submissionId}`)
  return { success: true }
}
