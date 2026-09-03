"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireRole } from "@/lib/auth"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

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
    .select("conference_id, status")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  const { error } = await supabase.from("review_assignments").insert({
    submission_id: submissionId,
    reviewer_id: reviewerId,
    conference_id: submission.conference_id,
    status: "pending",
    assigned_by: session.authUserId,
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
    .select("corresponding_author_id, reference_number, status")
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
    .select("email")
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
