"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { namesLikelyMatch } from "@/lib/presentation-certificate"
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

  // Matched by email AND a fuzzy name check, not email alone -- live data
  // confirmed real abstracts where two genuinely different co-authors share
  // one listed email, so matching on email alone here would let a second,
  // different person's submission silently overwrite the first person's
  // row instead of creating their own (see namesLikelyMatch's comment in
  // lib/presentation-certificate.ts for the full story). A previously
  // verified fee is final -- re-submitting here shouldn't be able to knock
  // it back to "pending" and block a download that was already unlocked.
  const { data: existingRows } = await admin
    .from("coauthor_certificate_fees")
    .select("id, full_name, payment_status")
    .eq("conference_id", conference.id)
    .eq("email", normalizedEmail)
  const existing = existingRows?.find((r) => namesLikelyMatch(r.full_name, fullName))

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

  // Update the matched existing row in place (keeps its id and history);
  // only insert a new row when no existing row's name plausibly matches --
  // i.e. this really is a different person on the same shared email, or a
  // genuinely first-time submission.
  const { error: saveError } = existing
    ? await admin
        .from("coauthor_certificate_fees")
        .update({
          full_name: fullName,
          payment_status: "pending",
          receipt_path: storagePath,
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", existing.id)
    : await admin.from("coauthor_certificate_fees").insert({
        conference_id: conference.id,
        email: normalizedEmail,
        full_name: fullName,
        payment_status: "pending",
        receipt_path: storagePath,
        submitted_at: new Date().toISOString(),
      })

  if (saveError) {
    await admin.storage.from("coauthor-fee-receipts").remove([storagePath])
    return { error: "Could not record your payment. Please try again." }
  }

  redirect(
    `/certificate/pay-coauthor-fee?submitted=1&email=${encodeURIComponent(normalizedEmail)}&name=${encodeURIComponent(fullName)}`
  )
}
