"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

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
