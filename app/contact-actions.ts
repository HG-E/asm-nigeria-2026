"use server"

import { headers } from "next/headers"
import { after } from "next/server"

import { getActiveConference } from "@/lib/conference"
import { contactAutoReplyHtml } from "@/lib/contact-auto-reply"
import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { createAdminClient } from "@/lib/supabase/admin"
import { contactMessageSchema, type ContactMessageInput } from "@/lib/validations/contact"

export type ContactActionResult = { error: string } | { success: true }

const IP_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const IP_MAX_MESSAGES = 3
const EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const EMAIL_MAX_MESSAGES = 5
const MAX_LINKS_IN_MESSAGE = 2

async function getClientIp(): Promise<string | null> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return headerList.get("x-real-ip")
}

export async function submitContactMessageAction(input: ContactMessageInput): Promise<ContactActionResult> {
  const parsed = contactMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." }
  }

  // Honeypot tripped -- pretend success so the bot doesn't learn anything,
  // and skip the DB round trip entirely.
  if (parsed.data.company) {
    return { success: true }
  }

  const { name, email, message } = parsed.data
  const subject = parsed.data.subject || "General Enquiry"

  const linkCount = (message.match(/https?:\/\//gi) ?? []).length
  if (linkCount > MAX_LINKS_IN_MESSAGE) {
    return { error: "Your message looks like it contains too many links. Please simplify it or email us directly." }
  }

  const admin = createAdminClient()
  const ip = await getClientIp()

  if (ip) {
    const { count } = await admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", new Date(Date.now() - IP_WINDOW_MS).toISOString())
    if ((count ?? 0) >= IP_MAX_MESSAGES) {
      return { error: "Too many messages sent recently. Please wait a few minutes and try again." }
    }
  }

  const { count: emailCount } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - EMAIL_WINDOW_MS).toISOString())
  if ((emailCount ?? 0) >= EMAIL_MAX_MESSAGES) {
    return { error: "You've sent several messages recently. Please wait before sending another, or email us directly." }
  }

  const { data: inserted, error: insertError } = await admin
    .from("contact_messages")
    .insert({ name, email, subject, message, ip_address: ip })
    .select("id")
    .single()

  if (insertError || !inserted) {
    return { error: "Your message could not be sent right now. Please try again or email us directly." }
  }

  // Don't make the visitor wait on two SMTP round trips -- record is already
  // durable in contact_messages, so send both emails after the response is
  // already on its way, same pattern as the submission-notification flow.
  after(async () => {
    const conference = await getActiveConference()
    const recipient = conference?.secretariat_email

    if (recipient) {
      try {
        await sendMail({
          to: recipient,
          subject: `[Conference website] ${subject} — ${name}`,
          html: `
            <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          `,
        })
        await admin
          .from("contact_messages")
          .update({ secretariat_notified_at: new Date().toISOString() })
          .eq("id", inserted.id)
      } catch {
        // contact_messages row still holds the message for manual follow-up
      }
    }

    try {
      await sendMail({
        to: email,
        subject: "We received your message — ASM Nigeria 2026",
        html: contactAutoReplyHtml(name, subject),
      })
      await admin
        .from("contact_messages")
        .update({ auto_reply_sent_at: new Date().toISOString() })
        .eq("id", inserted.id)
    } catch {
      // best-effort -- the secretariat notification above is what matters
    }
  })

  return { success: true }
}
