import { NextResponse } from "next/server"

import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// A submission stays in one of these reminder states until the author or
// reviewer acts, or a decision moves it on -- so each reminder is queued at
// most once per (submission, recipient, type). No re-nudging on a timer;
// if a send fails, admin/notifications already has a manual retry button.
const REMINDER_WINDOW_DAYS = 3

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const windowEndIso = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const queuedIds: string[] = []

  async function queueOnce(params: {
    submissionId: string
    recipientId: string
    recipientEmail: string
    type: string
    subject: string
  }) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("submission_id", params.submissionId)
      .eq("recipient_id", params.recipientId)
      .eq("notification_type", params.type)
      .limit(1)
      .maybeSingle()
    if (existing) return

    const { data: inserted } = await supabase
      .from("notifications")
      .insert({
        submission_id: params.submissionId,
        recipient_id: params.recipientId,
        recipient_email: params.recipientEmail,
        notification_type: params.type,
        subject: params.subject,
        status: "pending",
      })
      .select("id")
      .single()
    if (inserted) queuedIds.push(inserted.id)
  }

  // Reviewer: review due within REMINDER_WINDOW_DAYS, or already overdue.
  const { data: assignments } = await supabase
    .from("review_assignments")
    .select(
      "submission_id, reviewer_id, due_date, submissions(reference_number), user_profiles:reviewer_id(email)"
    )
    .eq("is_active", true)
    .in("status", ["pending", "in_progress"])
    .not("due_date", "is", null)

  for (const a of assignments ?? []) {
    const email = a.user_profiles?.email
    if (!email || !a.due_date) continue
    const ref = a.submissions?.reference_number ?? a.submission_id
    if (a.due_date < nowIso) {
      await queueOnce({
        submissionId: a.submission_id,
        recipientId: a.reviewer_id,
        recipientEmail: email,
        type: "review_overdue",
        subject: `Review overdue: ${ref}`,
      })
    } else if (a.due_date <= windowEndIso) {
      await queueOnce({
        submissionId: a.submission_id,
        recipientId: a.reviewer_id,
        recipientEmail: email,
        type: "review_due_soon",
        subject: `Review due soon: ${ref}`,
      })
    }
  }

  // Author: revision deadline (from the latest final decision) approaching.
  const { data: revisionSubs } = await supabase
    .from("submissions")
    .select("id, reference_number, corresponding_author_id, user_profiles:corresponding_author_id(email)")
    .eq("status", "revision_required")

  for (const s of revisionSubs ?? []) {
    const email = s.user_profiles?.email
    if (!email) continue

    const { data: decision } = await supabase
      .from("decisions")
      .select("revision_deadline")
      .eq("submission_id", s.id)
      .eq("is_final", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const deadline = decision?.revision_deadline
    if (deadline && deadline >= nowIso && deadline <= windowEndIso) {
      await queueOnce({
        submissionId: s.id,
        recipientId: s.corresponding_author_id,
        recipientEmail: email,
        type: "revision_deadline_reminder",
        subject: `Revision deadline approaching: ${s.reference_number ?? s.id}`,
      })
    }
  }

  // Author: still-draft submissions as the conference's final submission
  // deadline approaches (only while the admin has submissions open).
  const { data: conference } = await supabase
    .from("conferences")
    .select("id, late_submission_deadline, submissions_open")
    .eq("is_active", true)
    .maybeSingle()

  if (
    conference?.submissions_open &&
    conference.late_submission_deadline &&
    conference.late_submission_deadline >= nowIso &&
    conference.late_submission_deadline <= windowEndIso
  ) {
    const { data: draftSubs } = await supabase
      .from("submissions")
      .select("id, corresponding_author_id, user_profiles:corresponding_author_id(email)")
      .eq("conference_id", conference.id)
      .eq("status", "draft")

    for (const s of draftSubs ?? []) {
      const email = s.user_profiles?.email
      if (!email) continue
      await queueOnce({
        submissionId: s.id,
        recipientId: s.corresponding_author_id,
        recipientEmail: email,
        type: "submission_deadline_reminder",
        subject: "Submission deadline approaching — ASM Nigeria 2026",
      })
    }
  }

  if (queuedIds.length > 0) {
    await sendNotifications(queuedIds)
  }

  return NextResponse.json({ queued: queuedIds.length })
}
