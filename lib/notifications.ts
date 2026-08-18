import "server-only"

import { sendMail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

async function renderContent(
  notificationType: string,
  submissionId: string | null
): Promise<string> {
  const admin = createAdminClient()

  if (!submissionId) {
    return "<p>You have a new notification from ASM Nigeria 2026.</p>"
  }

  const { data: submission } = await admin
    .from("submissions")
    .select("title, reference_number, conference_subthemes(name)")
    .eq("id", submissionId)
    .single()

  const title = submission?.title ?? "your abstract"
  const reference = submission?.reference_number ?? ""
  const subtheme = submission?.conference_subthemes?.name ?? ""

  switch (notificationType) {
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
    const html = await renderContent(notification.notification_type, notification.submission_id)
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
