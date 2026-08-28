"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireRole } from "@/lib/auth"
import { sendMail } from "@/lib/email"
import { registrationRejectedHtml, registrationVerifiedHtml } from "@/lib/registration-email"
import { createClient } from "@/lib/supabase/server"

export type RegistrationActionResult = { error: string } | { success: true }

export async function verifyRegistrationAction(registrationId: string): Promise<RegistrationActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("id, full_name, email, reference_number, payment_status")
    .eq("id", registrationId)
    .single()

  if (!registration || registration.payment_status === "verified") {
    return { error: "Registration not found or already verified." }
  }

  const { error } = await supabase
    .from("conference_registrations")
    .update({
      payment_status: "verified",
      payment_verified_by: session.authUserId,
      payment_verified_at: new Date().toISOString(),
      payment_rejection_reason: null,
    })
    .eq("id", registrationId)

  if (error) {
    return { error: "Could not verify this registration. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "registration_verified",
    entity_type: "conference_registration",
    entity_id: registrationId,
  })

  after(async () => {
    try {
      await sendMail({
        to: registration.email,
        subject: `Registration confirmed — ${registration.reference_number}`,
        html: registrationVerifiedHtml({
          fullName: registration.full_name,
          referenceNumber: registration.reference_number ?? "",
        }),
      })
    } catch {
      // best-effort
    }
  })

  revalidatePath("/admin/registrations")
  return { success: true }
}

// Independent of payment status -- verified only means they paid, not that
// they actually showed up. This is what gates Certificate of Participation
// eligibility, set by hand after the conference.
export async function toggleAttendedAction(registrationId: string, attended: boolean): Promise<RegistrationActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { error } = await supabase
    .from("conference_registrations")
    .update({ attended })
    .eq("id", registrationId)

  if (error) {
    return { error: "Could not update attendance. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: attended ? "registration_marked_attended" : "registration_marked_not_attended",
    entity_type: "conference_registration",
    entity_id: registrationId,
  })

  revalidatePath("/admin/registrations")
  return { success: true }
}

export async function rejectRegistrationAction(registrationId: string, reason: string): Promise<RegistrationActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("id, full_name, email, reference_number")
    .eq("id", registrationId)
    .single()

  if (!registration) {
    return { error: "Registration not found." }
  }

  const { error } = await supabase
    .from("conference_registrations")
    .update({
      payment_status: "rejected",
      payment_rejection_reason: reason.trim() || null,
      payment_verified_by: session.authUserId,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", registrationId)

  if (error) {
    return { error: "Could not reject this registration. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "registration_rejected",
    entity_type: "conference_registration",
    entity_id: registrationId,
    metadata: { reason: reason.trim() || null },
  })

  after(async () => {
    try {
      await sendMail({
        to: registration.email,
        subject: `Registration needs attention — ${registration.reference_number}`,
        html: registrationRejectedHtml({
          fullName: registration.full_name,
          referenceNumber: registration.reference_number ?? "",
          reason: reason.trim() || null,
        }),
      })
    } catch {
      // best-effort
    }
  })

  revalidatePath("/admin/registrations")
  return { success: true }
}
