import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type RegistrationLookup =
  | { ok: false }
  | {
      ok: true
      id: string
      fullName: string
      referenceNumber: string
      paymentStatus: "pending" | "verified" | "rejected"
      rejectionReason: string | null
    }

/**
 * Shared by the resubmit page (to decide what to show) and its action (to
 * verify before mutating) so the "does this reference number + email really
 * belong to a rejected registration" check lives in exactly one place.
 * Compared in JS, not via .ilike("email", email) -- see the identical
 * comment in app/certificate/download/route.ts for why that matters: ilike
 * treats "%"/"_" in the submitted value as wildcards.
 */
export async function lookupRegistrationForResubmit(referenceNumber: string, email: string): Promise<RegistrationLookup> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("conference_registrations")
    .select("id, full_name, reference_number, email, payment_status, payment_rejection_reason")
    .eq("reference_number", referenceNumber.trim())
    .maybeSingle()

  if (!data || data.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return { ok: false }
  }

  return {
    ok: true,
    id: data.id,
    fullName: data.full_name,
    referenceNumber: data.reference_number ?? referenceNumber,
    paymentStatus: data.payment_status as "pending" | "verified" | "rejected",
    rejectionReason: data.payment_rejection_reason,
  }
}
