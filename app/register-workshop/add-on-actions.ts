"use server"

import { after } from "next/server"

import { getActiveConference } from "@/lib/conference"
import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { workshopAddedConfirmationHtml } from "@/lib/registration-email"
import { currentRegistrationPeriod, WORKSHOP_FEE } from "@/lib/registration-fees"
import { createAdminClient } from "@/lib/supabase/admin"

export type WorkshopAddOnResult = { error: string } | { success: true; referenceNumber: string; amountExpected: string }

const DOCUMENT_TYPES = ["pdf", "jpg", "jpeg", "png"]
// Must match the registration-receipts Storage bucket's file_size_limit, same
// as app/register-conference/actions.ts.
const MAX_FILE_MB = 1
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export async function addWorkshopToRegistrationAction(formData: FormData): Promise<WorkshopAddOnResult> {
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const receipt = formData.get("receipt")

  if (!referenceNumber || !email) {
    return { error: "Please enter your registration reference number and email address." }
  }
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Please upload your payment receipt or screenshot for the workshop fee." }
  }
  const extension = receipt.name.split(".").pop()?.toLowerCase() ?? ""
  if (!DOCUMENT_TYPES.includes(extension)) {
    return { error: "Your receipt must be a PDF, JPG, or PNG file." }
  }
  if (receipt.size > MAX_FILE_BYTES) {
    const sizeMb = (receipt.size / (1024 * 1024)).toFixed(1)
    return { error: `Your receipt is ${sizeMb}MB, which is over the ${MAX_FILE_MB}MB limit. Please compress it and try again.` }
  }

  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("id, conference_id, full_name, email, reference_number, payment_status, amount_expected")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  // Compared in JS, not via .ilike("email", email) -- ilike treats "%" and
  // "_" as wildcards, so a submitted email of e.g. "%" would match this row
  // regardless of its real email, letting anyone who knows (or guesses) a
  // reference number add a receipt to someone else's registration and flip
  // it back to pending with no knowledge of the real email at all.
  if (!registration || registration.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "We couldn't find a match for that reference number and email. Double-check both and try again." }
  }
  if (registration.payment_status === "rejected") {
    return {
      error: "Your original registration payment was rejected, so this can't be added yet. Please resolve that with the admin first.",
    }
  }
  if (registration.amount_expected?.toLowerCase().includes("workshop")) {
    return { error: "The Pre & Post-Conference Hands-On Workshop is already on this registration." }
  }

  const period = currentRegistrationPeriod()
  const amountExpected = `${registration.amount_expected} + ${WORKSHOP_FEE[period]} (pre & post-conference workshop)`

  // Kept separate from the original payment_receipt_path (see migration 0043)
  // so the admin can see both receipts rather than one overwriting the other.
  const safeName = receipt.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "file"
  const path = `${registration.conference_id}/workshop-addon/${Date.now()}-${safeName}`
  const { error: uploadError } = await admin.storage
    .from("registration-receipts")
    .upload(path, await receipt.arrayBuffer(), { contentType: receipt.type || undefined })
  if (uploadError) {
    return { error: "Could not upload your receipt. Please try again." }
  }

  // Adding a new, not-yet-verified amount to an already-verified registration
  // means the total paid is no longer confirmed -- send it back to pending so
  // the admin re-checks both the original and the new receipt together.
  const wasVerified = registration.payment_status === "verified"
  const { error: updateError } = await admin
    .from("conference_registrations")
    .update({
      amount_expected: amountExpected,
      workshop_receipt_path: path,
      workshop_added_at: new Date().toISOString(),
      ...(wasVerified ? { payment_status: "pending" } : {}),
    })
    .eq("id", registration.id)

  if (updateError) {
    await admin.storage.from("registration-receipts").remove([path])
    return { error: "Could not update your registration. Please try again." }
  }

  const conference = await getActiveConference()

  after(async () => {
    if (conference?.secretariat_email) {
      try {
        await sendMail({
          to: conference.secretariat_email,
          subject: `Workshop add-on requested — ${registration.reference_number}`,
          html: `
            <p><strong>Reference:</strong> ${escapeHtml(registration.reference_number ?? referenceNumber)}</p>
            <p><strong>Name:</strong> ${escapeHtml(registration.full_name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(registration.email)}</p>
            <p><strong>New amount expected:</strong> ${escapeHtml(amountExpected)}</p>
            <p>Review and verify the new workshop receipt (alongside the original) from the admin registrations page.</p>
          `,
        })
      } catch {
        // registration row + receipt are already durable; admin can still find it
      }
    }
    try {
      await sendMail({
        to: registration.email,
        subject: `Workshop added to your registration — ${registration.reference_number}`,
        html: workshopAddedConfirmationHtml({
          fullName: registration.full_name,
          referenceNumber: registration.reference_number ?? referenceNumber,
          amountExpected,
        }),
      })
    } catch {
      // best-effort
    }
  })

  return { success: true, referenceNumber: registration.reference_number ?? referenceNumber, amountExpected }
}
