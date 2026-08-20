import "server-only"

import { escapeHtml } from "@/lib/html"

const SUBMISSION_PORTAL_NOTE =
  "You can submit or check on an abstract any time from the submission portal at " +
  '<a href="https://www.asmnigeriaconference.com.ng/register">the registration page</a>.'

const AUTO_REPLIES: Record<string, string> = {
  "Abstract Submission": `
    <p>Early abstracts are due <strong>August 22, 2026</strong>, and the final deadline is
    <strong>November 2, 2026</strong>. The processing fee is ₦3,000 (or $5 USD).</p>
    <p>${SUBMISSION_PORTAL_NOTE}</p>
  `,
  "Registration Help": `
    <p>Conference registration (attending the event itself) is separate from abstract
    submission. Early/Regular registration closes <strong>October 22, 2026</strong> — see the
    registration section on the conference website for current rates and how to register.</p>
  `,
  "Payment Confirmation": `
    <p>Payments are confirmed once your bank transfer receipt is verified. If you've already
    sent a receipt and haven't heard back within 2-3 working days, reply to this email and
    we'll check on it.</p>
  `,
  Accommodation: `
    <p>A range of accommodation options near the venue, from budget dormitory rooms to serviced
    apartments, are listed in the Accommodation section of the conference website.</p>
  `,
  "Speaking Opportunity": `
    <p>Thank you for your interest in speaking at ASM Nigeria 2026. The secretariat reviews
    speaker enquiries directly and will follow up with you.</p>
  `,
  Sponsorship: `
    <p>Thank you for your interest in sponsoring ASM Nigeria 2026. The secretariat will follow
    up with sponsorship details and packages.</p>
  `,
  "Media / Press": `
    <p>Thank you for reaching out. The secretariat handles media and press enquiries directly
    and will be in touch.</p>
  `,
}

const DEFAULT_REPLY = `<p>Thank you for your message — the secretariat will review it and respond directly.</p>`

export function contactAutoReplyHtml(name: string, subject: string) {
  const body = AUTO_REPLIES[subject] ?? DEFAULT_REPLY
  const firstName = name.trim().split(/\s+/)[0] || name
  return `
    <h2>We received your message</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for contacting ASM Nigeria 2026 (subject: <strong>${escapeHtml(subject)}</strong>).
    This is an automatic acknowledgement — we'll respond within 2 working days.</p>
    ${body}
    <p>— ASM Nigeria 2026 Secretariat</p>
  `
}
