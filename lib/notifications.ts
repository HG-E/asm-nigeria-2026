import "server-only"

import { sendMail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

// Wraps every notification's body in a consistent, branded shell (tricolor
// band, wordmark, tagline, footer with the correct "Admin" contact label)
// instead of the bare unstyled paragraphs every email used to be. Table-
// based layout with inline styles throughout, deliberately -- this is the
// one HTML dialect virtually every email client (Outlook included) renders
// consistently; flexbox/grid/external CSS are not reliable here.
function wrapEmailHtml(bodyHtml: string): string {
  return `
    <div style="background:#eef1f6; padding:32px 16px; margin:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e2e5ea;">
        <tr>
          <td style="padding:0; line-height:0; font-size:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#003087; height:4px; font-size:0; line-height:0;">&nbsp;</td>
              <td style="background:#f5a800; height:4px; font-size:0; line-height:0;">&nbsp;</td>
              <td style="background:#cc2229; height:4px; font-size:0; line-height:0;">&nbsp;</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 4px;">
            <div style="font-family: Georgia, 'Times New Roman', serif; font-size:20px; font-weight:bold; color:#001f5b;">ASM Nigeria 2026</div>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:#c98800; margin-top:3px; font-weight:bold;">One Health, One Future, One Scientific Community</div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px; font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.65; color:#1c2430;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px; background:#f8f9fb; border-top:1px solid #e2e5ea; font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#5b6472;">
            <p style="margin:0 0 4px;">ASM Nigeria 2026 &middot; Abuja, Nigeria</p>
            <p style="margin:0;">Admin: <a href="mailto:asmnigeriaonehealth@gmail.com" style="color:#003087; text-decoration:none;">asmnigeriaonehealth@gmail.com</a> &middot; <a href="https://www.asmnigeriaconference.com.ng" style="color:#003087; text-decoration:none;">www.asmnigeriaconference.com.ng</a></p>
          </td>
        </tr>
      </table>
    </div>
  `
}

const HEADING_STYLE =
  "margin:0 0 14px; font-family: Georgia, 'Times New Roman', serif; color:#001f5b; font-size:19px; font-weight:bold;"

async function renderContent(
  notificationType: string,
  submissionId: string | null,
  recipientId: string | null
): Promise<string> {
  const admin = createAdminClient()

  let authorFirstName: string | null = null
  if (recipientId) {
    const { data: recipientProfile } = await admin
      .from("user_profiles")
      .select("first_name")
      .eq("id", recipientId)
      .maybeSingle()
    authorFirstName = recipientProfile?.first_name ?? null
  }
  const greeting = authorFirstName ? `<p style="margin-top:0;">Dear ${authorFirstName},</p>` : ""
  const finish = (body: string) => wrapEmailHtml(greeting + body)

  if (!submissionId) {
    return finish("<p>You have a new notification from ASM Nigeria 2026.</p>")
  }

  const { data: submission } = await admin
    .from("submissions")
    .select("title, reference_number, conference_subthemes(name), conferences(late_submission_deadline)")
    .eq("id", submissionId)
    .single()

  const title = submission?.title ?? "your abstract"
  const reference = submission?.reference_number ?? ""
  const subtheme = submission?.conference_subthemes?.name ?? ""

  switch (notificationType) {
    case "decision_notification": {
      const { data: decision } = await admin
        .from("decisions")
        .select("id, decision, author_message, revision_deadline")
        .eq("submission_id", submissionId)
        .eq("is_final", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const authorNote = decision?.author_message
        ? `<p><strong>A note from the Scientific Programme Committee:</strong> ${decision.author_message}</p>`
        : ""

      if (decision?.decision === "accepted" || decision?.decision === "accepted_oral" || decision?.decision === "accepted_poster") {
        const presentationType =
          decision.decision === "accepted_oral"
            ? "Oral Presentation"
            : decision.decision === "accepted_poster"
              ? "Poster Presentation"
              : "To be confirmed"

        // Scoped to THIS decision round specifically, not just the
        // submission -- a submission can carry documents from an earlier
        // round too (this exact bug: a second-round email picked up the
        // first round's now-superseded tokens because the query had no
        // decision_id filter and no ordering to prefer the current round).
        const { data: documents } = await admin
          .from("decision_documents")
          .select("doc_type, access_token")
          .eq("submission_id", submissionId)
          .eq("decision_id", decision.id)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        const notificationToken = documents?.find((d) => d.doc_type === "notification")?.access_token
        const letterToken = documents?.find((d) => d.doc_type === "letter")?.access_token

        const documentLinks =
          notificationToken && letterToken
            ? `
              <p>Two official documents are ready for you, both bearing the conference letterhead and signed by the Scientific Programme Committee and Main Organising Committee:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 22px 0;">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${baseUrl}/letters/${notificationToken}" style="display:inline-block; background:#ffffff; color:#003087; border:1.5px solid #003087; font-weight:bold; text-decoration:none; padding:12px 26px; border-radius:6px; font-family: Arial, Helvetica, sans-serif; font-size:14px;">View Your Acceptance Notification</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${baseUrl}/letters/${letterToken}" style="display:inline-block; background:#003087; color:#ffffff; font-weight:bold; text-decoration:none; padding:12px 26px; border-radius:6px; font-family: Arial, Helvetica, sans-serif; font-size:14px;">View &amp; Download Your Official Letter</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px; color:#5b6472;">Both links are unique to you and do not expire, so there's no rush — keep this email for your records. Please don't forward or share them, as they open directly with no further login.</p>
            `
            : ""

        return finish(`
          <h2 style="${HEADING_STYLE}">Congratulations — your abstract has been accepted</h2>
          <p>On behalf of the Scientific Programme Committee, we are pleased to inform you that your abstract has been accepted for <strong>${presentationType}</strong> at ASM Nigeria 2026 — the maiden conference of the American Society for Microbiology (ASM) Nigeria — holding <strong>November 22&ndash;24, 2026</strong> in Abuja, Nigeria.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; background:#eef2fa; border-radius:6px;">
            <tr><td style="padding:16px 18px; font-size:14px; line-height:1.8;">
              <div><strong style="color:#003087;">Reference Number:</strong> ${reference}</div>
              <div><strong style="color:#003087;">Title:</strong> ${title}</div>
              <div><strong style="color:#003087;">Presentation Type:</strong> ${presentationType}</div>
            </td></tr>
          </table>
          ${authorNote}
          ${documentLinks}
          <p>Details of your session schedule will follow from the Scientific Programme Committee closer to the conference date. You can track your submission and its full record at any time from your dashboard.</p>
          <p style="margin-top:26px; margin-bottom:0;">We warmly congratulate you on this achievement and look forward to welcoming you to Abuja this November.</p>
          <p style="margin-top:18px; margin-bottom:0;">Best regards,<br><strong>ASM Nigeria 2026 — Scientific Programme Committee</strong></p>
        `)
      }

      if (decision?.decision === "minor_revision" || decision?.decision === "major_revision") {
        const deadline = decision.revision_deadline
          ? new Date(decision.revision_deadline).toLocaleDateString()
          : "to be confirmed"
        return finish(`
          <h2 style="${HEADING_STYLE}">Revision required</h2>
          <p><strong>Reference number:</strong> ${reference}</p>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Revision deadline:</strong> ${deadline}</p>
          ${authorNote}
          <p>Please log in to your dashboard to review the committee's comments and submit your revised abstract before the deadline.</p>
        `)
      }

      return finish(`
        <h2 style="${HEADING_STYLE}">Decision on your submission</h2>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>After careful review, the Scientific Programme Committee has decided not to accept this submission for ASM Nigeria 2026.</p>
        ${authorNote}
        <p>Thank you for your interest in the conference, and we encourage future submissions.</p>
      `)
    }
    case "submission_acknowledgement":
      return finish(`
        <h2 style="${HEADING_STYLE}">Abstract received</h2>
        <p>Thank you for your submission to ASM Nigeria 2026.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please carefully review your submission before submitting. Once submitted, it enters the conference review process. You can track its status any time from your dashboard.</p>
      `)
    case "reviewer_assignment":
      return finish(`
        <h2 style="${HEADING_STYLE}">New abstract assigned for review</h2>
        <p>An abstract has been assigned to you for scientific review.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to declare any conflict of interest and complete your review.</p>
      `)
    case "reviewer_reassignment":
      return finish(`
        <h2 style="${HEADING_STYLE}">Revised abstract ready for re-review</h2>
        <p>The author has submitted a revised version of an abstract you previously reviewed.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to review the updated abstract.</p>
      `)
    case "payment_verified":
      return finish(`
        <h2 style="${HEADING_STYLE}">Payment confirmed</h2>
        <p>We've verified your payment receipt for the following submission.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>No further action is needed on payment. You can track your submission's review status any time from your dashboard.</p>
      `)
    case "payment_rejected": {
      const { data: submissionRow } = await admin
        .from("submissions")
        .select("payment_rejection_reason")
        .eq("id", submissionId)
        .single()
      const rejectionReason = submissionRow?.payment_rejection_reason
        ? `<p><strong>Reason:</strong> ${submissionRow.payment_rejection_reason}</p>`
        : ""
      return finish(`
        <h2 style="${HEADING_STYLE}">Your payment receipt needs attention</h2>
        <p>We could not verify the payment receipt for your abstract.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        ${rejectionReason}
        <p>Please log in to your dashboard and upload a corrected receipt as soon as possible.</p>
      `)
    }
    case "submission_withdrawn":
      return finish(`
        <h2 style="${HEADING_STYLE}">Submission withdrawn</h2>
        <p>You've withdrawn the following submission from consideration for ASM Nigeria 2026.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>This is a confirmation for your records. If this wasn't intentional, contact the Scientific Programme Committee and Admin as soon as possible.</p>
      `)
    case "review_due_soon":
    case "review_overdue": {
      const { data: assignment } = recipientId
        ? await admin
            .from("review_assignments")
            .select("due_date")
            .eq("submission_id", submissionId)
            .eq("reviewer_id", recipientId)
            .eq("is_active", true)
            .maybeSingle()
        : { data: null }
      const dueDate = assignment?.due_date ? new Date(assignment.due_date).toLocaleDateString() : "soon"

      if (notificationType === "review_overdue") {
        return finish(`
          <h2 style="${HEADING_STYLE}">Review overdue</h2>
          <p>Your review for the abstract below was due on <strong>${dueDate}</strong> and is now overdue.</p>
          <p><strong>Reference number:</strong> ${reference}</p>
          <p><strong>Subtheme:</strong> ${subtheme}</p>
          <p>Please log in to your reviewer dashboard and complete it as soon as possible.</p>
        `)
      }
      return finish(`
        <h2 style="${HEADING_STYLE}">Review due soon</h2>
        <p>Your review for the abstract below is due on <strong>${dueDate}</strong>.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to complete it before the deadline.</p>
      `)
    }
    case "revision_deadline_reminder": {
      const { data: decision } = await admin
        .from("decisions")
        .select("revision_deadline")
        .eq("submission_id", submissionId)
        .eq("is_final", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      const deadline = decision?.revision_deadline
        ? new Date(decision.revision_deadline).toLocaleDateString()
        : "soon"
      return finish(`
        <h2 style="${HEADING_STYLE}">Revision deadline approaching</h2>
        <p>Your revision deadline for the submission below is <strong>${deadline}</strong>.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>Please log in to your dashboard and submit your revised abstract before the deadline.</p>
      `)
    }
    case "submission_deadline_reminder": {
      const submissionDeadline = submission?.conferences?.late_submission_deadline
        ? new Date(submission.conferences.late_submission_deadline).toLocaleDateString()
        : "soon"
      return finish(`
        <h2 style="${HEADING_STYLE}">Submission deadline approaching</h2>
        <p>You have a draft abstract that hasn't been submitted yet for ASM Nigeria 2026.</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Submission deadline:</strong> ${submissionDeadline}</p>
        <p>Please log in to your dashboard to complete and submit it before then.</p>
      `)
    }
    case "reviewer_conflict_needs_reassignment":
      return finish(`
        <h2 style="${HEADING_STYLE}">Action needed: no reviewer available</h2>
        <p>Every reviewer assigned to an abstract declared a conflict of interest, so it currently has no active reviewer.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>The submission has been moved back to screening. Please assign a replacement reviewer from the admin submission page.</p>
      `)
    default:
      return finish(`<p>Update on submission ${reference}: ${title}</p>`)
  }
}

export async function sendNotification(notificationId: string) {
  const admin = createAdminClient()

  const { data: notification } = await admin
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single()

  if (!notification || notification.status === "sent") {
    return
  }

  try {
    const html = await renderContent(
      notification.notification_type,
      notification.submission_id,
      notification.recipient_id
    )
    await sendMail({
      to: notification.recipient_email,
      subject: notification.subject,
      html,
    })

    await admin
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
      .eq("id", notificationId)
  } catch (error) {
    await admin
      .from("notifications")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        retry_count: notification.retry_count + 1,
      })
      .eq("id", notificationId)
  }
}

export async function sendNotifications(notificationIds: string[]) {
  for (const id of notificationIds) {
    await sendNotification(id)
  }
}
