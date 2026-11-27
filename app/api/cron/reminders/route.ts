import { NextResponse } from "next/server"

import { escapeHtml } from "@/lib/html"
import { sendMail } from "@/lib/email"
import { sendNotifications } from "@/lib/notifications"
import { findAmbiguousAuthorEmails, namesLikelyMatch } from "@/lib/presentation-certificate"
import { toPlain } from "@/lib/rich-text"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const PENDING_BACKLOG_HOURS = 48
// Caps each run's co-author fee nudges so this can never repeat the Gmail
// daily-sending-quota exhaustion hit while bulk-backfilling notifications
// earlier -- at this size, even clearing a large backlog from scratch takes
// several days of cron runs rather than one burst, each well under any
// realistic sending limit.
const COAUTHOR_REMINDER_BATCH_SIZE = 30
const COAUTHOR_REMINDER_GRACE_DAYS = 7

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
    .select("id, late_submission_deadline, submissions_open, secretariat_email, presentation_certificates_open")
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

  let adminDigestSent = false
  let coauthorRemindersSent = 0

  // Admin digest: registrations and co-author fees sitting unreviewed past
  // PENDING_BACKLOG_HOURS, plus the shared-email mix-ups that need manual
  // author-edit cleanup. Resent every day the backlog persists -- unlike the
  // queueOnce reminders above (which fire once per fixed deadline), there's
  // no natural "due date" for a review queue, so this is a standing nudge
  // rather than a one-time alert.
  if (conference?.secretariat_email) {
    try {
      const backlogCutoff = new Date(now.getTime() - PENDING_BACKLOG_HOURS * 60 * 60 * 1000).toISOString()

      const { count: pendingRegistrations } = await supabase
        .from("conference_registrations")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending")
        .lte("created_at", backlogCutoff)

      const { count: pendingFees } = await supabase
        .from("coauthor_certificate_fees")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending")
        .lte("submitted_at", backlogCutoff)

      let ambiguousGroupCount = 0
      if (conference.id) {
        const groups = await findAmbiguousAuthorEmails(conference.id)
        ambiguousGroupCount = groups.length
      }

      if ((pendingRegistrations ?? 0) > 0 || (pendingFees ?? 0) > 0 || ambiguousGroupCount > 0) {
        await sendMail({
          to: conference.secretariat_email,
          subject: `Review queue reminder — ${(pendingRegistrations ?? 0) + (pendingFees ?? 0)} pending, ${ambiguousGroupCount} need cleanup`,
          html: `
            <h2>Daily review queue reminder</h2>
            <ul>
              <li><strong>${pendingRegistrations ?? 0}</strong> registration payment${pendingRegistrations === 1 ? "" : "s"} pending review for more than ${PENDING_BACKLOG_HOURS} hours -- <a href="https://www.asmnigeriaconference.com.ng/admin/registrations">Admin &rarr; Registrations</a></li>
              <li><strong>${pendingFees ?? 0}</strong> co-author certificate fee receipt${pendingFees === 1 ? "" : "s"} pending review for more than ${PENDING_BACKLOG_HOURS} hours -- <a href="https://www.asmnigeriaconference.com.ng/admin/coauthor-fees">Admin &rarr; Co-Author Fees</a></li>
              <li><strong>${ambiguousGroupCount}</strong> abstract${ambiguousGroupCount === 1 ? "" : "s"} with a shared-email author mix-up still needing manual cleanup -- same page, "needs author email cleanup" section</li>
            </ul>
            <p>This email repeats daily until each queue is cleared.</p>
          `,
        })
        adminDigestSent = true
      }
    } catch {
      // Best-effort -- a missed digest email isn't worth failing the whole
      // cron run over; the backlog is still visible on the admin pages
      // directly and this will try again on tomorrow's run.
    }
  }

  // Co-author certificate fee nudge: a one-time (per person, ever) reminder
  // once their abstract has been accepted for at least
  // COAUTHOR_REMINDER_GRACE_DAYS and they still haven't registered, paid, or
  // even submitted a receipt. Capped to COAUTHOR_REMINDER_BATCH_SIZE per
  // run and deduped via audit_logs (action="coauthor_fee_reminder_sent",
  // metadata.email) so clearing a large backlog takes several days of runs
  // rather than one burst -- see the constant comment above for why that
  // matters.
  //
  // Gated on the same presentation_certificates_open pause flag as the
  // public download/fee flow itself -- pointing people at a feature that's
  // currently switched off would just generate confused replies, and this
  // way reopening the flag alone resumes reminders too, with no separate
  // toggle to remember.
  if (conference?.id && conference.presentation_certificates_open) {
    try {
      const { data: decisions } = await supabase
        .from("decisions")
        .select("submission_id, decision, created_at")
        .eq("is_final", true)
        .in("decision", ["accepted", "accepted_oral", "accepted_poster"])
      const decisionBySubmission = new Map((decisions ?? []).map((d) => [d.submission_id, d]))

      const graceCutoff = new Date(now.getTime() - COAUTHOR_REMINDER_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const eligibleSubmissionIds = new Set(
        (decisions ?? []).filter((d) => d.created_at <= graceCutoff).map((d) => d.submission_id)
      )

      const { data: submissions } = await supabase
        .from("submissions")
        .select(
          "id, reference_number, title, payment_status, conference_id, submission_authors(email, first_name, last_name, is_corresponding)"
        )
        .eq("conference_id", conference.id)
        .eq("payment_status", "verified")

      const { data: fees } = await supabase
        .from("coauthor_certificate_fees")
        .select("email, full_name")
        .eq("conference_id", conference.id)
      const { data: registrations } = await supabase
        .from("conference_registrations")
        .select("email, full_name")
        .eq("conference_id", conference.id)
        .eq("payment_status", "verified")

      const { data: alreadyReminded } = await supabase
        .from("audit_logs")
        .select("metadata")
        .eq("action", "coauthor_fee_reminder_sent")
      const remindedEmails = new Set(
        (alreadyReminded ?? [])
          .map((r) => (r.metadata as { email?: string } | null)?.email)
          .filter((e): e is string => Boolean(e))
      )

      type Candidate = { email: string; fullName: string; abstracts: { referenceNumber: string; title: string; acceptedAt: string }[] }
      const candidatesByEmail = new Map<string, Candidate>()

      for (const s of submissions ?? []) {
        if (!eligibleSubmissionIds.has(s.id) || !s.reference_number) continue

        const byEmail = new Map<string, typeof s.submission_authors>()
        for (const a of s.submission_authors) {
          const key = a.email.trim().toLowerCase()
          if (!byEmail.has(key)) byEmail.set(key, [])
          byEmail.get(key)!.push(a)
        }

        for (const [email, authors] of byEmail) {
          // Skip the same shared-email ambiguous case lookupPresentationEligibility
          // dedupes and findAmbiguousAuthorEmails flags -- guessing who to
          // remind here would be worse than not reminding at all.
          const uniqueNames = new Set(authors.map((a) => `${a.first_name} ${a.last_name}`.trim().toLowerCase()))
          if (uniqueNames.size > 1) continue
          if (remindedEmails.has(email)) continue

          const author = authors[0]
          if (author.is_corresponding) continue

          const fullName = `${author.first_name} ${author.last_name}`.trim().replace(/\s+/g, " ")
          const hasRegistration = (registrations ?? []).some(
            (r) => r.email.trim().toLowerCase() === email && namesLikelyMatch(r.full_name, fullName)
          )
          if (hasRegistration) continue
          const hasFeeRow = (fees ?? []).some(
            (f) => f.email.trim().toLowerCase() === email && namesLikelyMatch(f.full_name, fullName)
          )
          if (hasFeeRow) continue // already paid, pending review, or rejected -- not an "unpaid, never tried" case

          if (!candidatesByEmail.has(email)) {
            candidatesByEmail.set(email, { email, fullName, abstracts: [] })
          }
          candidatesByEmail.get(email)!.abstracts.push({
            referenceNumber: s.reference_number,
            title: toPlain(s.title),
            acceptedAt: decisionBySubmission.get(s.id)?.created_at ?? "",
          })
        }
      }

      // Oldest-accepted-first, so a long backlog clears in a fair order
      // across daily runs rather than whichever submission happens to sort
      // first in the query.
      const sortedCandidates = [...candidatesByEmail.values()]
        .sort((a, b) => {
          const aOldest = a.abstracts.reduce((min, x) => (x.acceptedAt < min ? x.acceptedAt : min), a.abstracts[0].acceptedAt)
          const bOldest = b.abstracts.reduce((min, x) => (x.acceptedAt < min ? x.acceptedAt : min), b.abstracts[0].acceptedAt)
          return aOldest < bOldest ? -1 : aOldest > bOldest ? 1 : 0
        })
        .slice(0, COAUTHOR_REMINDER_BATCH_SIZE)

      for (const candidate of sortedCandidates) {
        const list = candidate.abstracts
          .map((a) => `<li><strong>${escapeHtml(a.referenceNumber)}</strong> -- "${escapeHtml(a.title)}"</li>`)
          .join("")
        const firstName = candidate.fullName.trim().split(/\s+/)[0] || candidate.fullName
        try {
          await sendMail({
            to: candidate.email,
            subject: "Reminder: your ASM Nigeria 2026 co-author certificate fee",
            html: `
              <p>Hi ${escapeHtml(firstName)},</p>
              <p>You're listed as a co-author on the following accepted abstract${candidate.abstracts.length > 1 ? "s" : ""}:</p>
              <ul>${list}</ul>
              <p>To download your own Certificate of Presentation, either register and pay for the conference under this
              email (you'd then be automatically exempt from the fee below), or pay the one-time NGN 5,000 co-author
              certificate fee, which covers every abstract you're listed on.</p>
              <p>Start at <a href="https://www.asmnigeriaconference.com.ng/certificate?type=presentation">asmnigeriaconference.com.ng/certificate</a>
              using any of the reference numbers above and this email address -- you'll be guided through whichever step
              is still needed.</p>
            `,
          })
          await supabase.from("audit_logs").insert({
            action: "coauthor_fee_reminder_sent",
            entity_type: "coauthor_certificate_fee_reminder",
            metadata: { email: candidate.email, fullName: candidate.fullName },
          })
          coauthorRemindersSent++
        } catch {
          // Don't mark as reminded if the send itself failed -- leaves it
          // eligible for tomorrow's run instead of silently skipping them.
        }
      }
    } catch {
      // Best-effort -- see the admin digest's catch above for the same
      // reasoning.
    }
  }

  return NextResponse.json({
    queued: queuedIds.length,
    adminDigestSent,
    coauthorRemindersSent,
  })
}
