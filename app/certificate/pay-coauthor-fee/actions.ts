"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

export type SubmitCoauthorFeeResult = { error: string } | { success: true }

const schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
})

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
const MAX_BYTES = 1 * 1024 * 1024

export async function submitCoauthorFeeAction(formData: FormData): Promise<SubmitCoauthorFeeResult> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }
  const { fullName, email } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  const file = formData.get("receipt")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach your payment receipt or screenshot." }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only PDF, JPG, or PNG files are permitted." }
  }
  if (file.size > MAX_BYTES) {
    return { error: "This file exceeds the 1MB limit." }
  }

  const admin = createAdminClient()
  const { data: conference } = await admin.from("conferences").select("id").eq("is_active", true).maybeSingle()
  if (!conference) {
    return { error: "No active conference is configured. Contact the Admin." }
  }

  // A previously verified fee is final -- re-submitting here shouldn't be
  // able to knock it back to "pending" and block a download that was
  // already unlocked.
  const { data: existing } = await admin
    .from("coauthor_certificate_fees")
    .select("id, payment_status")
    .eq("conference_id", conference.id)
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existing?.payment_status === "verified") {
    return { error: "This fee has already been verified for this email. You can download your certificate now." }
  }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "receipt"
  const storagePath = `${conference.id}/${normalizedEmail.replace(/[^a-z0-9._-]+/g, "_")}/${Date.now()}-${safeName}`

  const { error: uploadError } = await admin.storage
    .from("coauthor-fee-receipts")
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })
  if (uploadError) {
    return { error: "Could not upload your receipt. Please try again." }
  }

  const { error: upsertError } = await admin.from("coauthor_certificate_fees").upsert(
    {
      conference_id: conference.id,
      email: normalizedEmail,
      full_name: fullName,
      payment_status: "pending",
      receipt_path: storagePath,
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
    },
    { onConflict: "conference_id,email" }
  )

  if (upsertError) {
    await admin.storage.from("coauthor-fee-receipts").remove([storagePath])
    return { error: "Could not record your payment. Please try again." }
  }

  redirect(
    `/certificate/pay-coauthor-fee?submitted=1&email=${encodeURIComponent(normalizedEmail)}&name=${encodeURIComponent(fullName)}`
  )
}
