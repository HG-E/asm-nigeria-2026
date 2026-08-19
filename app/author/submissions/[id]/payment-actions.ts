"use server"

import { requireAuth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type PaymentActionResult = { error: string } | { success: true }

const MAX_RECEIPT_BYTES = 1 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]

export async function recordPaymentReceiptAction(
  id: string,
  input: {
    storagePath: string
    fileType: string
    fileSizeBytes: number
    currency: "NGN" | "USD"
  }
): Promise<PaymentActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, corresponding_author_id, status, payment_status, payment_receipt_path")
    .eq("id", id)
    .single()

  if (!submission || submission.corresponding_author_id !== session.authUserId) {
    return { error: "Submission not found." }
  }

  // Payment is a one-time, per-abstract requirement satisfied during the
  // original draft flow -- it isn't re-asked for during a later revision.
  // The one exception is a rejected receipt, which the author needs a way
  // to fix even after the abstract has already been submitted.
  const editable = submission.status === "draft" || submission.payment_status === "rejected"
  if (!editable) {
    return { error: "Payment can no longer be updated for this submission." }
  }

  if (!input.storagePath.startsWith(`${session.authUserId}/`)) {
    return { error: "Upload failed. Please try again." }
  }
  if (!ALLOWED_RECEIPT_TYPES.includes(input.fileType)) {
    await supabase.storage.from("payment-receipts").remove([input.storagePath])
    return { error: "Only PDF, JPG, or PNG files are permitted for the receipt." }
  }
  if (input.fileSizeBytes > MAX_RECEIPT_BYTES) {
    await supabase.storage.from("payment-receipts").remove([input.storagePath])
    return { error: "This file exceeds the 1MB limit for receipts." }
  }

  // Rejected-payment remediation can happen after the submission has left
  // draft status, which authors_update_own_draft_submissions' RLS policy
  // doesn't cover -- the admin client is used for the actual write since
  // ownership was already verified above via the RLS-scoped read.
  const admin = createAdminClient()

  if (submission.payment_receipt_path && submission.payment_receipt_path !== input.storagePath) {
    await admin.storage.from("payment-receipts").remove([submission.payment_receipt_path])
  }

  const updateFields: {
    payment_receipt_path: string
    payment_receipt_uploaded_at: string
    payment_currency: "NGN" | "USD"
    payment_status?: "pending"
    payment_rejection_reason?: null
  } = {
    payment_receipt_path: input.storagePath,
    payment_receipt_uploaded_at: new Date().toISOString(),
    payment_currency: input.currency,
  }
  if (submission.payment_status === "rejected") {
    updateFields.payment_status = "pending"
    updateFields.payment_rejection_reason = null
  }

  const { error } = await admin.from("submissions").update(updateFields).eq("id", id)

  if (error) {
    return { error: "Could not save the receipt. Please try again." }
  }

  return { success: true }
}
