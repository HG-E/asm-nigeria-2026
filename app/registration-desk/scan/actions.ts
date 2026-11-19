"use server"

import { revalidatePath } from "next/cache"

import { requireRegistrationAccess } from "@/lib/auth"
import { referenceNumberFromPayload } from "@/lib/registration-qr"
import { createClient } from "@/lib/supabase/server"

export type CheckInResult =
  | { error: string }
  | {
      success: true
      alreadyAttended: boolean
      registration: {
        fullName: string
        referenceNumber: string
        participantCategory: string
        institution: string | null
        paymentVerified: boolean
      }
    }

// Takes whatever the camera decoded, not a trusted reference number directly
// -- a QR from somewhere else entirely (a different event, a random URL)
// must fail cleanly here, not look up an unrelated row.
export async function checkInByPayloadAction(payload: string): Promise<CheckInResult> {
  const session = await requireRegistrationAccess()

  const referenceNumber = referenceNumberFromPayload(payload)
  if (!referenceNumber) {
    return { error: "That QR code isn't an ASM Nigeria 2026 registration badge." }
  }

  const supabase = await createClient()
  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("id, full_name, reference_number, participant_category, institution, attended, payment_status")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  if (!registration) {
    return { error: `No registration found for ${referenceNumber}.` }
  }

  const alreadyAttended = registration.attended

  if (!alreadyAttended) {
    const { error } = await supabase.rpc("mark_registration_attended", {
      p_registration_id: registration.id,
      p_attended: true,
    })
    if (error) {
      return { error: "Could not check this registrant in. Please try again." }
    }

    await supabase.from("audit_logs").insert({
      actor_id: session.authUserId,
      actor_email: session.email,
      action: "registration_marked_attended",
      entity_type: "conference_registration",
      entity_id: registration.id,
      metadata: { via: "qr_scan" },
    })

    revalidatePath("/admin/registrations")
    revalidatePath("/registration-desk")
  }

  return {
    success: true,
    alreadyAttended,
    registration: {
      fullName: registration.full_name,
      referenceNumber: registration.reference_number ?? referenceNumber,
      participantCategory: registration.participant_category,
      institution: registration.institution,
      paymentVerified: registration.payment_status === "verified",
    },
  }
}
