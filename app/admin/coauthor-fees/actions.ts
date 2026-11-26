"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireRole } from "@/lib/auth"
import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { createAdminClient } from "@/lib/supabase/admin"

export type ActionResult = { error: string } | { success: true }

// Co-author fee payers never get an account (same as conference
// registrants), so -- like registration confirmation emails -- this goes
// straight through sendMail rather than the `notifications` table, whose
// recipient_id has a hard NOT NULL FK to user_profiles.
async function notifyCoauthor(email: string, subject: string, html: string) {
  try {
    await sendMail({ to: email, subject, html })
  } catch {
    // The row itself already reflects the real status -- a failed email
    // here doesn't block them, it just means they'll find out by trying
    // the download again rather than by inbox.
  }
}

export async function verifyCoauthorFeeAction(feeId: string): Promise<ActionResult> {
  const session = await requireRole("admin")
  const admin = createAdminClient()

  const { data: fee } = await admin
    .from("coauthor_certificate_fees")
    .select("email, full_name")
    .eq("id", feeId)
    .maybeSingle()

  const { error } = await admin
    .from("coauthor_certificate_fees")
    .update({
      payment_status: "verified",
      verified_by: session.authUserId,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", feeId)

  if (error) {
    return { error: "Could not verify. Please try again." }
  }

  await admin.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "coauthor_fee_verified",
    entity_type: "coauthor_certificate_fee",
    entity_id: feeId,
  })

  if (fee) {
    after(() =>
      notifyCoauthor(
        fee.email,
        "Co-author certificate fee verified",
        `<p>Hi ${escapeHtml(fee.full_name)},</p>
         <p>Your co-author certificate fee has been verified. You can now download your Certificate of Presentation
         at <a href="https://www.asmnigeriaconference.com.ng/certificate?type=presentation">asmnigeriaconference.com.ng/certificate</a>
         using your abstract's reference number and this email address.</p>`
      )
    )
  }

  revalidatePath("/admin/coauthor-fees")
  return { success: true }
}

export async function rejectCoauthorFeeAction(feeId: string, reason: string): Promise<ActionResult> {
  const session = await requireRole("admin")
  if (!reason.trim()) {
    return { error: "Provide a reason so the co-author knows what to fix." }
  }
  const admin = createAdminClient()

  const { data: fee } = await admin
    .from("coauthor_certificate_fees")
    .select("email, full_name")
    .eq("id", feeId)
    .maybeSingle()

  const { error } = await admin
    .from("coauthor_certificate_fees")
    .update({
      payment_status: "rejected",
      verified_by: session.authUserId,
      verified_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
    })
    .eq("id", feeId)

  if (error) {
    return { error: "Could not reject. Please try again." }
  }

  await admin.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "coauthor_fee_rejected",
    entity_type: "coauthor_certificate_fee",
    entity_id: feeId,
    metadata: { reason: reason.trim() },
  })

  if (fee) {
    const trimmedReason = reason.trim()
    after(() =>
      notifyCoauthor(
        fee.email,
        "Co-author certificate fee — receipt not verified",
        `<p>Hi ${escapeHtml(fee.full_name)},</p>
         <p>Your co-author certificate fee receipt could not be verified: ${escapeHtml(trimmedReason)}</p>
         <p>Please submit a clear copy at
         <a href="https://www.asmnigeriaconference.com.ng/certificate/pay-coauthor-fee?email=${encodeURIComponent(fee.email)}&name=${encodeURIComponent(fee.full_name)}">this link</a>.</p>`
      )
    )
  }

  revalidatePath("/admin/coauthor-fees")
  return { success: true }
}
