"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireRegistrationAccess, requireRole } from "@/lib/auth"
import { sendMail } from "@/lib/email"
import { registrationConfirmationHtml, registrationRejectedHtml, registrationVerifiedHtml } from "@/lib/registration-email"
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
      attended: true,
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

// Covers someone who registered (or tried to) before being told committee
// registration is free -- e.g. a pending paid registration sitting on an
// unverified receipt, or one already rejected. Converting in place keeps
// their existing reference number and dodges the duplicate-registration
// check in submitRegistrationAction (keyed on email), which would otherwise
// block a fresh free submission while their old row is still pending.
// Deliberately refuses an already-verified row: that money has actually
// moved, and reversing it is a refund conversation to have manually, not
// something this button should paper over.
export async function convertToCommitteeMemberAction(
  registrationId: string,
  subcommittee: string
): Promise<RegistrationActionResult> {
  const session = await requireRole("admin")
  const supabase = await createClient()

  if (!subcommittee.trim()) {
    return { error: "Enter at least one subcommittee." }
  }

  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("id, full_name, email, reference_number, participant_category, payment_status")
    .eq("id", registrationId)
    .single()

  if (!registration) {
    return { error: "Registration not found." }
  }
  if (registration.payment_status === "verified") {
    return { error: "This registration is already verified as paid -- converting it isn't a refund, handle that manually first." }
  }
  if (registration.participant_category === "Committee Member") {
    return { error: "This registration is already a Committee Member registration." }
  }

  const { error } = await supabase
    .from("conference_registrations")
    .update({
      participant_category: "Committee Member",
      amount_expected: "Free",
      subcommittee: subcommittee.trim(),
      payment_status: "verified",
      payment_verified_by: session.authUserId,
      payment_verified_at: new Date().toISOString(),
      payment_rejection_reason: null,
      attended: true,
    })
    .eq("id", registrationId)

  if (error) {
    return { error: "Could not convert this registration. Please try again." }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.authUserId,
    actor_email: session.email,
    action: "registration_converted_to_committee_member",
    entity_type: "conference_registration",
    entity_id: registrationId,
    metadata: { previous_category: registration.participant_category, subcommittee: subcommittee.trim() },
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

// Verifying payment now sets attended=true automatically (see
// verifyRegistrationAction/convertToCommitteeMemberAction above) -- this
// toggle exists for the exception cases: correcting a registration that was
// verified but the person never actually showed up, or the reverse, a
// walk-in who paid at the door and is checked in here before their payment
// is formally verified. This is what gates Certificate of Participation
// eligibility.
//
// registration_desk can't UPDATE conference_registrations directly (RLS only
// grants that to admin) -- this is the one thing that role exists to do, so
// it goes through mark_registration_attended, a SECURITY DEFINER function
// that only flips the attended column and nothing else, rather than widening
// the row-level UPDATE policy to that role.
export async function toggleAttendedAction(registrationId: string, attended: boolean): Promise<RegistrationActionResult> {
  const session = await requireRegistrationAccess()
  const supabase = await createClient()

  const { error } = await supabase.rpc("mark_registration_attended", {
    p_registration_id: registrationId,
    p_attended: attended,
  })

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
  revalidatePath("/registration-desk")
  return { success: true }
}

export async function retryRegistrationConfirmationAction(registrationId: string): Promise<RegistrationActionResult> {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("id, full_name, email, reference_number, participant_category, registration_period, amount_expected")
    .eq("id", registrationId)
    .single()

  if (!registration) {
    return { error: "Registration not found." }
  }

  try {
    await sendMail({
      to: registration.email,
      subject: `Registration received — ${registration.reference_number}`,
      html: registrationConfirmationHtml({
        fullName: registration.full_name,
        referenceNumber: registration.reference_number ?? "",
        category: registration.participant_category,
        amountExpected: registration.amount_expected,
      }),
    })
    await supabase
      .from("conference_registrations")
      .update({ confirmation_email_status: "sent", confirmation_email_sent_at: new Date().toISOString(), confirmation_email_error: null })
      .eq("id", registrationId)
  } catch (error) {
    await supabase
      .from("conference_registrations")
      .update({
        confirmation_email_status: "failed",
        confirmation_email_error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", registrationId)
    return { error: "Could not send the confirmation email. Please try again." }
  }

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
      const resubmitLink = `https://www.asmnigeriaconference.com.ng/register-conference/resubmit?ref=${encodeURIComponent(registration.reference_number ?? "")}&email=${encodeURIComponent(registration.email)}`
      await sendMail({
        to: registration.email,
        subject: `Registration needs attention — ${registration.reference_number}`,
        html: registrationRejectedHtml({
          fullName: registration.full_name,
          referenceNumber: registration.reference_number ?? "",
          reason: reason.trim() || null,
          resubmitLink,
        }),
      })
    } catch {
      // best-effort
    }
  })

  revalidatePath("/admin/registrations")
  return { success: true }
}
