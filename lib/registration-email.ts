import "server-only"

import { escapeHtml } from "@/lib/html"

export function registrationConfirmationHtml(params: {
  fullName: string
  referenceNumber: string
  category: string
  amountExpected: string
}) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  return `
    <h2>Registration received</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for registering for ASM Nigeria 2026. Your reference number is
    <strong>${escapeHtml(params.referenceNumber)}</strong>.</p>
    <p><strong>Category:</strong> ${escapeHtml(params.category)}</p>
    <p><strong>Amount:</strong> ${escapeHtml(params.amountExpected)}</p>
    <p>The admin will verify your payment receipt and confirm your registration. This
    usually takes 2-3 working days. You'll receive a follow-up email once it's verified.</p>
    <p>— ASM Nigeria 2026 Finance &amp; Budget Committee and Admin</p>
  `
}

export function registrationVerifiedHtml(params: { fullName: string; referenceNumber: string }) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  return `
    <h2>Registration confirmed</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Your payment has been verified and your registration for ASM Nigeria 2026 is confirmed.</p>
    <p><strong>Reference number:</strong> ${escapeHtml(params.referenceNumber)}</p>
    <p>We look forward to seeing you at the conference. Further details will follow from the
    admin closer to the date.</p>
    <p>— ASM Nigeria 2026 Finance &amp; Budget Committee and Admin</p>
  `
}

export function registrationRejectedHtml(params: {
  fullName: string
  referenceNumber: string
  reason: string | null
}) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  const reasonNote = params.reason ? `<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ""
  return `
    <h2>Your registration needs attention</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>We could not verify the payment receipt for your registration.</p>
    <p><strong>Reference number:</strong> ${escapeHtml(params.referenceNumber)}</p>
    ${reasonNote}
    <p>Please contact the admin with a corrected receipt or proof of payment.</p>
    <p>— ASM Nigeria 2026 Finance &amp; Budget Committee and Admin</p>
  `
}

export function whatsappGroupInviteHtml(params: { fullName: string; groupLink: string }) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  return `
    <h2>Join the ASM Nigeria 2026 WhatsApp Group</h2>
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thanks for registering for the First ASM Nigeria Conference 2026, One Health in Action, holding 22 to 25 November in Abuja.</p>
    <p>We've set up a WhatsApp group for the conference so you can get programme updates, last minute announcements, and connect with other participants ahead of time. Join here:</p>
    <p><a href="${escapeHtml(params.groupLink)}">${escapeHtml(params.groupLink)}</a></p>
    <p>A couple of things before you join. Your phone number will be visible to other members, same as any WhatsApp group. Please keep discussions on topic and respectful.</p>
    <p>If you have questions before the conference, reach us at asmnigeriaonehealth@gmail.com.</p>
    <p>See you in Abuja.</p>
    <p>ASM Nigeria 2026 Secretariat</p>
  `
}

export function workshopWhatsappGroupInviteHtml(params: { fullName: string; groupLink: string }) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  return `
    <h2>Join the ASM Nigeria 2026 Workshop WhatsApp Group</h2>
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thanks for signing up for the Pre &amp; Post-Conference Hands-On Workshop at the First ASM Nigeria Conference 2026, One Health in Action.</p>
    <p>We've set up a WhatsApp group just for workshop participants, for session reminders, updates, and materials from the facilitators. Join here:</p>
    <p><a href="${escapeHtml(params.groupLink)}">${escapeHtml(params.groupLink)}</a></p>
    <p>This group is reserved for registered workshop participants only. Your phone number will be visible to other members, same as any WhatsApp group.</p>
    <p>See the <a href="https://www.asmnigeriaconference.com.ng/schedule">workshop schedule</a> for facilitators and session times.</p>
    <p>If you have questions, reach us at asmnigeriaonehealth@gmail.com.</p>
    <p>ASM Nigeria 2026 Secretariat</p>
  `
}

export function workshopInviteHtml(params: { fullName: string; referenceNumber: string; zoomRegistrationLink: string }) {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName
  return `
    <h2>Your Pre-Conference Workshop on 22 November</h2>
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thanks for signing up for the pre-conference workshop ahead of the First ASM Nigeria Conference 2026, One Health in Action.</p>
    <p>The workshop will be held virtually on Zoom.</p>
    <p><strong>Date:</strong> Sunday, 22 November 2026<br>
    <strong>Time:</strong> 10:15am (West Africa Time)</p>
    <p>Please register for the Zoom session in advance using this link:</p>
    <p><a href="${escapeHtml(params.zoomRegistrationLink)}">${escapeHtml(params.zoomRegistrationLink)}</a></p>
    <p>After registering, Zoom will send you a confirmation email with the details to join on the day.</p>
    <p>Your reference number is <strong>${escapeHtml(params.referenceNumber)}</strong>. Please keep it for your records.</p>
    <p>If you have any questions, reach us at asmnigeriaonehealth@gmail.com.</p>
    <p>See you there.</p>
    <p>ASM Nigeria 2026 Secretariat</p>
  `
}
