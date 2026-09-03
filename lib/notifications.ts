import "server-only"

import { sendMail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

async function renderContent(
  notificationType: string,
  submissionId: string | null,
  recipientId: string | null
): Promise<string> {
  const admin = createAdminClient()

  if (!submissionId) {
    return "<p>You have a new notification from ASM Nigeria 2026.</p>"
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
        .select("decision, author_message, revision_deadline")
        .eq("submission_id", submissionId)
        .eq("is_final", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const authorNote = decision?.author_message
        ? `<p>${decision.author_message}</p>`
        : ""

      if (decision?.decision === "accepted" || decision?.decision === "accepted_oral" || decision?.decision === "accepted_poster") {
        const presentationType =
          decision.decision === "accepted_oral"
            ? "Oral presentation"
            : decision.decision === "accepted_poster"
              ? "Poster presentation"
              : "To be confirmed"
        return `
          <h2>Congratulations — your abstract has been accepted</h2>
          <p><strong>Reference number:</strong> ${reference}</p>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Presentation type:</strong> ${presentationType}</p>
          ${authorNote}
          <p>Further details on next steps will follow from the Scientific Programme Committee and Admin. Log in to your dashboard to view your full submission record.</p>
        `
      }

      if (decision?.decision === "minor_revision" || decision?.decision === "major_revision") {
        const deadline = decision.revision_deadline
          ? new Date(decision.revision_deadline).toLocaleDateString()
          : "to be confirmed"
        return `
          <h2>Revision required</h2>
          <p><strong>Reference number:</strong> ${reference}</p>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Revision deadline:</strong> ${deadline}</p>
          ${authorNote}
          <p>Please log in to your dashboard to review the committee's comments and submit your revised abstract before the deadline.</p>
        `
      }

      return `
        <h2>Decision on your submission</h2>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>After careful review, the scientific committee has decided not to accept this submission for ASM Nigeria 2026.</p>
        ${authorNote}
        <p>Thank you for your interest in the conference, and we encourage future submissions.</p>
      `
    }
    case "submission_acknowledgement":
      return `
        <h2>Abstract received</h2>
        <p>Thank you for your submission to ASM Nigeria 2026.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please carefully review your submission before submitting. Once submitted, it enters the conference review process. You can track its status any time from your dashboard.</p>
      `
    case "reviewer_assignment":
      return `
        <h2>New abstract assigned for review</h2>
        <p>An abstract has been assigned to you for scientific review.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to declare any conflict of interest and complete your review.</p>
      `
    case "reviewer_reassignment":
      return `
        <h2>Revised abstract ready for re-review</h2>
        <p>The author has submitted a revised version of an abstract you previously reviewed.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to review the updated abstract.</p>
      `
    case "payment_verified":
      return `
        <h2>Payment confirmed</h2>
        <p>We've verified your payment receipt for the following submission.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>No further action is needed on payment. You can track your submission's review status any time from your dashboard.</p>
      `
    case "payment_rejected": {
      const { data: submissionRow } = await admin
        .from("submissions")
        .select("payment_rejection_reason")
        .eq("id", submissionId)
        .single()
      const rejectionReason = submissionRow?.payment_rejection_reason
        ? `<p><strong>Reason:</strong> ${submissionRow.payment_rejection_reason}</p>`
        : ""
      return `
        <h2>Your payment receipt needs attention</h2>
        <p>We could not verify the payment receipt for your abstract.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        ${rejectionReason}
        <p>Please log in to your dashboard and upload a corrected receipt as soon as possible.</p>
      `
    }
    case "submission_withdrawn":
      return `
        <h2>Submission withdrawn</h2>
        <p>You've withdrawn the following submission from consideration for ASM Nigeria 2026.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>This is a confirmation for your records. If this wasn't intentional, contact the Scientific Programme Committee and Admin as soon as possible.</p>
      `
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
        return `
          <h2>Review overdue</h2>
          <p>Your review for the abstract below was due on <strong>${dueDate}</strong> and is now overdue.</p>
          <p><strong>Reference number:</strong> ${reference}</p>
          <p><strong>Subtheme:</strong> ${subtheme}</p>
          <p>Please log in to your reviewer dashboard and complete it as soon as possible.</p>
        `
      }
      return `
        <h2>Review due soon</h2>
        <p>Your review for the abstract below is due on <strong>${dueDate}</strong>.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>Please log in to your reviewer dashboard to complete it before the deadline.</p>
      `
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
      return `
        <h2>Revision deadline approaching</h2>
        <p>Your revision deadline for the submission below is <strong>${deadline}</strong>.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>Please log in to your dashboard and submit your revised abstract before the deadline.</p>
      `
    }
    case "submission_deadline_reminder": {
      const submissionDeadline = submission?.conferences?.late_submission_deadline
        ? new Date(submission.conferences.late_submission_deadline).toLocaleDateString()
        : "soon"
      return `
        <h2>Submission deadline approaching</h2>
        <p>You have a draft abstract that hasn't been submitted yet for ASM Nigeria 2026.</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Submission deadline:</strong> ${submissionDeadline}</p>
        <p>Please log in to your dashboard to complete and submit it before then.</p>
      `
    }
    case "reviewer_conflict_needs_reassignment":
      return `
        <h2>Action needed: no reviewer available</h2>
        <p>Every reviewer assigned to an abstract declared a conflict of interest, so it currently has no active reviewer.</p>
        <p><strong>Reference number:</strong> ${reference}</p>
        <p><strong>Subtheme:</strong> ${subtheme}</p>
        <p>The submission has been moved back to screening. Please assign a replacement reviewer from the admin submission page.</p>
      `
    default:
      return `<p>Update on submission ${reference}: ${title}</p>`
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
