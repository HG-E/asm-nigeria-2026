"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireRole } from "@/lib/auth"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  conflictDeclarationSchema,
  reviewSchema,
  type ConflictDeclarationInput,
  type ReviewInput,
} from "@/lib/validations/review"

export type ActionResult = { error: string } | { success: true }

// Runs after EITHER a review is submitted OR a conflict is declared --
// both are ways an assignment becomes "done", and the submission needs to
// move on once every active assignment is done, regardless of which path
// got it there. Previously only the submit-review path checked this, so a
// reviewer declaring a conflict (especially the only reviewer on a
// subtheme) left the submission silently stuck at "assigned" forever with
// no signal to admin that a replacement reviewer was needed.
async function finalizeReviewRoundIfDone(
  admin: ReturnType<typeof createAdminClient>,
  submissionId: string
) {
  const { data: siblingAssignments } = await admin
    .from("review_assignments")
    .select("status")
    .eq("submission_id", submissionId)
    .eq("is_active", true)

  const assignments = siblingAssignments ?? []
  if (assignments.length === 0) return

  const allDone = assignments.every((a) => a.status === "completed" || a.status === "conflict")
  if (!allDone) return

  const anyCompleted = assignments.some((a) => a.status === "completed")

  if (anyCompleted) {
    await admin
      .from("submissions")
      .update({ status: "reviews_completed" })
      .eq("id", submissionId)
      .in("status", ["assigned", "under_review"])
    return
  }

  // Every active reviewer declared a conflict -- nobody actually reviewed
  // it. Route back to screening (the same status used when nobody was
  // auto-routed in the first place) so admin can assign a replacement, and
  // alert every admin since nothing else would surface this.
  const { data: submission } = await admin
    .from("submissions")
    .select("reference_number")
    .eq("id", submissionId)
    .single()

  await admin
    .from("submissions")
    .update({ status: "screening" })
    .eq("id", submissionId)
    .in("status", ["assigned", "under_review"])

  const { data: admins } = await admin
    .from("user_profiles")
    .select("id, email")
    .in("role", ["admin", "super_admin"])

  if (admins && admins.length > 0) {
    const { data: inserted } = await admin
      .from("notifications")
      .insert(
        admins.map((a) => ({
          recipient_id: a.id,
          recipient_email: a.email,
          submission_id: submissionId,
          notification_type: "reviewer_conflict_needs_reassignment",
          subject: `All reviewers declared a conflict of interest: ${submission?.reference_number ?? submissionId}`,
          status: "pending" as const,
        }))
      )
      .select("id")

    if (inserted && inserted.length > 0) {
      after(() => sendNotifications(inserted.map((n) => n.id)))
    }
  }
}

async function loadOwnAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  reviewerId: string
) {
  const { data } = await supabase
    .from("review_assignments")
    .select("id, reviewer_id, status, submission_id")
    .eq("id", assignmentId)
    .single()

  if (!data || data.reviewer_id !== reviewerId) {
    return null
  }
  return data
}

export async function declareConflictAction(
  assignmentId: string,
  input: ConflictDeclarationInput
): Promise<ActionResult> {
  const session = await requireRole("reviewer")
  const parsed = conflictDeclarationSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const assignment = await loadOwnAssignment(supabase, assignmentId, session.authUserId)
  if (!assignment) {
    return { error: "Assignment not found." }
  }
  if (assignment.status !== "pending") {
    return { error: "This assignment has already been actioned." }
  }

  if (parsed.data.hasConflict) {
    const { error } = await supabase
      .from("review_assignments")
      .update({
        status: "conflict",
        conflict_declared_at: new Date().toISOString(),
        conflict_reason: parsed.data.conflictReason || null,
      })
      .eq("id", assignmentId)

    if (error) {
      return { error: "Could not save. Please try again." }
    }

    await supabase.from("audit_logs").insert({
      actor_id: session.authUserId,
      actor_email: session.email,
      action: "conflict_of_interest_declared",
      entity_type: "review_assignment",
      entity_id: assignmentId,
      previous_status: "pending",
      new_status: "conflict",
    })

    await finalizeReviewRoundIfDone(createAdminClient(), assignment.submission_id)
  } else {
    const { error } = await supabase
      .from("review_assignments")
      .update({ status: "in_progress", accepted_at: new Date().toISOString() })
      .eq("id", assignmentId)

    if (error) {
      return { error: "Could not save. Please try again." }
    }
  }

  revalidatePath(`/reviewer/assignments/${assignmentId}`)
  return { success: true }
}

export async function saveReviewDraftAction(
  assignmentId: string,
  input: ReviewInput
): Promise<ActionResult> {
  return saveReview(assignmentId, input, false)
}

export async function submitReviewAction(
  assignmentId: string,
  input: ReviewInput
): Promise<ActionResult> {
  return saveReview(assignmentId, input, true)
}

async function saveReview(
  assignmentId: string,
  input: ReviewInput,
  submit: boolean
): Promise<ActionResult> {
  const session = await requireRole("reviewer")
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const assignment = await loadOwnAssignment(supabase, assignmentId, session.authUserId)
  if (!assignment) {
    return { error: "Assignment not found." }
  }
  if (assignment.status !== "in_progress" && assignment.status !== "completed") {
    return { error: "Declare your conflict-of-interest status before reviewing." }
  }
  if (assignment.status === "completed") {
    return { error: "This review has already been submitted." }
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, is_submitted")
    .eq("assignment_id", assignmentId)
    .maybeSingle()

  if (existing?.is_submitted) {
    return { error: "This review has already been submitted." }
  }

  const reviewFields = {
    score_originality: parsed.data.scoreOriginality,
    score_relevance: parsed.data.scoreRelevance,
    score_methodology: parsed.data.scoreMethodology,
    score_clarity: parsed.data.scoreClarity,
    score_significance: parsed.data.scoreSignificance,
    recommendation: parsed.data.recommendation,
    comments_to_committee: parsed.data.commentsToCommittee,
    comments_to_author: parsed.data.commentsToAuthor || null,
    is_submitted: submit,
    ...(submit ? { submitted_at: new Date().toISOString() } : {}),
  }

  const { error } = existing
    ? await supabase.from("reviews").update(reviewFields).eq("id", existing.id)
    : await supabase.from("reviews").insert({
        assignment_id: assignmentId,
        submission_id: assignment.submission_id,
        reviewer_id: session.authUserId,
        ...reviewFields,
      })

  if (error) {
    return { error: "Could not save your review. Please try again." }
  }

  if (submit) {
    await supabase
      .from("review_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assignmentId)

    await supabase.from("audit_logs").insert({
      actor_id: session.authUserId,
      actor_email: session.email,
      action: "review_completed",
      entity_type: "review_assignment",
      entity_id: assignmentId,
      previous_status: "in_progress",
      new_status: "completed",
    })

    // A plain reviewer's own session can only see their own assignment row
    // (RLS), not their co-reviewers', so checking whether ALL assignments
    // for this submission are done needs the admin client -- same reason
    // the status transition itself does, since reviewers have no UPDATE
    // access to submissions at all.
    await finalizeReviewRoundIfDone(createAdminClient(), assignment.submission_id)
  }

  revalidatePath(`/reviewer/assignments/${assignmentId}`)
  return { success: true }
}
