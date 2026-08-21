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
    <p>— ASM Nigeria 2026 Admin</p>
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
    <p>— ASM Nigeria 2026 Admin</p>
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
    <p>— ASM Nigeria 2026 Admin</p>
  `
}
