"use server"

import { getActiveConference } from "@/lib/conference"
import { sendMail } from "@/lib/email"
import { contactMessageSchema, type ContactMessageInput } from "@/lib/validations/contact"

export type ContactActionResult = { error: string } | { success: true }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function submitContactMessageAction(input: ContactMessageInput): Promise<ContactActionResult> {
  const parsed = contactMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." }
  }
  // Honeypot tripped -- pretend success so the bot doesn't learn anything.
  if (parsed.data.company) {
    return { success: true }
  }

  const conference = await getActiveConference()
  const recipient = conference?.secretariat_email
  if (!recipient) {
    return { error: "The contact inbox isn't configured yet. Please email the secretariat directly." }
  }

  const { name, email, subject, message } = parsed.data

  try {
    await sendMail({
      to: recipient,
      subject: `[Conference website] ${subject || "General enquiry"} — ${name}`,
      html: `
        <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject || "General enquiry")}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `,
    })
  } catch {
    return { error: "Your message could not be sent right now. Please try again or email us directly." }
  }

  return { success: true }
}
