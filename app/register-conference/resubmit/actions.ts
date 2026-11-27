"use server"

import { redirect } from "next/navigation"
import { after } from "next/server"
import { z } from "zod"

import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { getActiveConference } from "@/lib/conference"
import { lookupRegistrationForResubmit } from "@/lib/registration-resubmit"
import { createAdminClient } from "@/lib/supabase/admin"

export type ResubmitReceiptResult = { error: string } | { success: true }

const schema = z.object({
  referenceNumber: z.string().trim().min(1, "Enter your reference number."),
  email: z.email("Enter a valid email address."),
})

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
const MAX_BYTES = 1 * 1024 * 1024

export async function resubmitRegistrationReceiptAction(formData: FormData): Promise<ResubmitReceiptResult> {
  const parsed = schema.safeParse({
    referenceNumber: formData.get("referenceNumber"),
    email: formData.get("email"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." }
  }
  const { referenceNumber, email } = parsed.data

  const file = formData.get("receipt")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach your corrected payment receipt or screenshot." }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only PDF, JPG, or PNG files are permitted." }
  }
  if (file.size > MAX_BYTES) {
    return { error: "This file exceeds the 1MB limit." }
  }

  const registration = await lookupRegistrationForResubmit(referenceNumber, email)
  if (!registration.ok) {
    return { error: "We couldn't find a match for that reference number and email. Double-check both and try again." }
  }
  // Only a rejected registration can be resubmitted this way -- a pending
  // or verified one already has an up-to-date receipt on file, and letting
  // either be overwritten here would knock a verified registration back to
  // pending with no admin action involved.
  if (registration.paymentStatus === "verified") {
    return { error: "This registration is already verified — no need to resubmit anything." }
  }
  if (registration.paymentStatus === "pending") {
    return { error: "A receipt for this registration is already awaiting review — no need to resubmit yet." }
  }

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "Registration is not open right now. Please try again later." }
  }

  const admin = createAdminClient()
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "receipt"
  const storagePath = `${conference.id}/receipts/${Date.now()}-${safeName}`

  const { error: uploadError } = await admin.storage
    .from("registration-receipts")
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })
  if (uploadError) {
    return { error: "Could not upload your receipt. Please try again." }
  }

  const { error: updateError } = await admin
    .from("conference_registrations")
    .update({
      payment_receipt_path: storagePath,
      payment_status: "pending",
      payment_rejection_reason: null,
      payment_verified_by: null,
      payment_verified_at: null,
    })
    .eq("id", registration.id)

  if (updateError) {
    await admin.storage.from("registration-receipts").remove([storagePath])
    return { error: "Could not record your corrected receipt. Please try again." }
  }

  await admin.from("audit_logs").insert({
    action: "registration_receipt_resubmitted",
    entity_type: "conference_registration",
    entity_id: registration.id,
  })

  after(async () => {
    if (!conference.secretariat_email) return
    try {
      await sendMail({
        to: conference.secretariat_email,
        subject: `Corrected receipt resubmitted — ${registration.referenceNumber}`,
        html: `
          <p><strong>Reference:</strong> ${escapeHtml(registration.referenceNumber)}</p>
          <p><strong>Name:</strong> ${escapeHtml(registration.fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p>This registration was previously rejected and the registrant has uploaded a corrected receipt. Review it from the admin registrations page.</p>
        `,
      })
    } catch {
      // The row and uploaded receipt are already durable -- admin can still
      // find and review it even if this email fails.
    }
  })

  redirect(`/register-conference/resubmit?submitted=1&ref=${encodeURIComponent(registration.referenceNumber)}&email=${encodeURIComponent(email)}`)
}
