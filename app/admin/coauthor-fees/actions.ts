"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export type ActionResult = { error: string } | { success: true }

export async function verifyCoauthorFeeAction(feeId: string): Promise<ActionResult> {
  const session = await requireRole("admin")
  const admin = createAdminClient()

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

  revalidatePath("/admin/coauthor-fees")
  return { success: true }
}

export async function rejectCoauthorFeeAction(feeId: string, reason: string): Promise<ActionResult> {
  const session = await requireRole("admin")
  if (!reason.trim()) {
    return { error: "Provide a reason so the co-author knows what to fix." }
  }
  const admin = createAdminClient()

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

  revalidatePath("/admin/coauthor-fees")
  return { success: true }
}
