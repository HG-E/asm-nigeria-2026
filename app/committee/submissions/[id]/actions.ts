"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { decisionSchema, type DecisionInput } from "@/lib/validations/decision"

export type ActionResult = { error: string } | { success: true }

export async function proposeDecisionAction(
  submissionId: string,
  input: DecisionInput
): Promise<ActionResult> {
  const session = await requireRole("committee")
  const parsed = decisionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("conference_id, status")
    .eq("id", submissionId)
    .single()

  if (!submission) {
    return { error: "Submission not found." }
  }

  const DECIDABLE_STATUSES = ["reviews_completed", "decision_pending"]
  if (!DECIDABLE_STATUSES.includes(submission.status)) {
    return { error: "This submission is not currently awaiting a decision." }
  }

  const { data: existing } = await supabase
    .from("decisions")
    .select("id, is_final")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // A final decision belongs to a past review round (e.g. the committee
  // asked for a revision, the author resubmitted, and reviewers are now
  // done with round 2) -- it's history, not a draft to overwrite. Only an
  // existing NON-final decision is the current round's in-progress draft.
  const draft = existing && !existing.is_final ? existing : null

  const decisionFields = {
    decision: data.decision,
    decision_notes: data.decisionNotes,
    author_message: data.authorMessage || null,
    revision_deadline: data.revisionDeadline || null,
  }

  const { error } = draft
    ? await supabase.from("decisions").update(decisionFields).eq("id", draft.id)
    : await supabase.from("decisions").insert({
        submission_id: submissionId,
        conference_id: submission.conference_id,
        decided_by: session.authUserId,
        ...decisionFields,
      })

  if (error) {
    return { error: "Could not save the decision. Please try again." }
  }

  if (submission.status !== "decision_pending") {
    await supabase
      .from("submissions")
      .update({ status: "decision_pending" })
      .eq("id", submissionId)
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: existing ? "decision_updated" : "decision_proposed",
    entity_type: "submission",
    entity_id: submissionId,
    metadata: { decision: data.decision },
  })

  revalidatePath(`/committee/submissions/${submissionId}`)
  return { success: true }
}
