import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import {
  generateParticipationCertificate,
  generatePresentationCertificate,
  generateVolunteerCertificate,
  generateWorkshopCertificate,
} from "@/lib/certificate"
import { createAdminClient } from "@/lib/supabase/admin"
import { toPlain } from "@/lib/rich-text"

async function handleParticipation(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, payment_status, attended, participant_category")
    .eq("reference_number", referenceNumber)
    .ilike("email", email)
    .maybeSingle()

  if (!registration) {
    redirect("/certificate?type=participation&error=not_found")
  }
  // A "Workshop Only" registrant never registered for the main conference,
  // so a generic Participation certificate would overstate what they
  // attended -- they get the Workshop certificate instead (handleWorkshop
  // below), issued under the same reference number and email.
  if (registration.participant_category === "Workshop Only") {
    redirect("/certificate?type=participation&error=workshop_only")
  }
  // Likewise a "Volunteer" registrant gets the Volunteer certificate
  // (handleVolunteer below), not a generic Participation one.
  if (registration.participant_category === "Volunteer") {
    redirect("/certificate?type=participation&error=volunteer_only")
  }
  if (registration.payment_status !== "verified") {
    redirect("/certificate?type=participation&error=not_verified")
  }
  if (!registration.attended) {
    redirect("/certificate?type=participation&error=not_attended")
  }

  const pdfBytes = await generateParticipationCertificate({
    fullName: registration.full_name,
    certificateNumber: registration.reference_number ?? referenceNumber,
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Participation-Certificate-${registration.reference_number}.pdf"`,
    },
  })
}

async function handleWorkshop(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, payment_status, attended, amount_expected")
    .eq("reference_number", referenceNumber)
    .ilike("email", email)
    .maybeSingle()

  if (!registration) {
    redirect("/certificate?type=workshop&error=not_found")
  }
  // The registration's amount_expected only mentions the workshop fee when
  // the add-on was actually selected at registration (see
  // app/register-conference/actions.ts) -- this is the only record of who
  // opted in, there's no separate boolean column for it.
  if (!registration.amount_expected?.toLowerCase().includes("workshop")) {
    redirect("/certificate?type=workshop&error=no_workshop")
  }
  if (registration.payment_status !== "verified") {
    redirect("/certificate?type=workshop&error=not_verified")
  }
  if (!registration.attended) {
    redirect("/certificate?type=workshop&error=not_attended")
  }

  const pdfBytes = await generateWorkshopCertificate({
    fullName: registration.full_name,
    certificateNumber: registration.reference_number ?? referenceNumber,
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Workshop-Certificate-${registration.reference_number}.pdf"`,
    },
  })
}

async function handleVolunteer(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, payment_status, attended, participant_category")
    .eq("reference_number", referenceNumber)
    .ilike("email", email)
    .maybeSingle()

  if (!registration) {
    redirect("/certificate?type=volunteer&error=not_found")
  }
  if (registration.participant_category !== "Volunteer") {
    redirect("/certificate?type=volunteer&error=not_volunteer")
  }
  if (registration.payment_status !== "verified") {
    redirect("/certificate?type=volunteer&error=not_verified")
  }
  if (!registration.attended) {
    redirect("/certificate?type=volunteer&error=not_attended")
  }

  const pdfBytes = await generateVolunteerCertificate({
    fullName: registration.full_name,
    certificateNumber: registration.reference_number ?? referenceNumber,
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Volunteer-Certificate-${registration.reference_number}.pdf"`,
    },
  })
}

async function handlePresentation(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: submission } = await admin
    .from("submissions")
    .select("id, title, reference_number, presentation_preference, submission_authors(email, is_corresponding, first_name, last_name)")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  const correspondingAuthor = submission?.submission_authors.find((a) => a.is_corresponding)

  if (!submission || !correspondingAuthor || correspondingAuthor.email.toLowerCase() !== email.toLowerCase()) {
    redirect("/certificate?type=presentation&error=not_found")
  }

  const { data: decision } = await admin
    .from("decisions")
    .select("decision")
    .eq("submission_id", submission.id)
    .eq("is_final", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const ACCEPTED = ["accepted", "accepted_oral", "accepted_poster"]
  if (!decision || !ACCEPTED.includes(decision.decision)) {
    redirect("/certificate?type=presentation&error=not_accepted")
  }

  let presentationType: "Oral Presentation" | "Poster Presentation"
  if (decision.decision === "accepted_oral") {
    presentationType = "Oral Presentation"
  } else if (decision.decision === "accepted_poster") {
    presentationType = "Poster Presentation"
  } else if (submission.presentation_preference === "oral") {
    presentationType = "Oral Presentation"
  } else if (submission.presentation_preference === "poster") {
    presentationType = "Poster Presentation"
  } else {
    // Generic "accepted" with no oral/poster preference on record -- there's
    // no honest value to print here, so this isn't ready yet rather than a
    // guess.
    redirect("/certificate?type=presentation&error=format_pending")
  }

  const pdfBytes = await generatePresentationCertificate({
    fullName: `${correspondingAuthor.first_name} ${correspondingAuthor.last_name}`,
    abstractTitle: toPlain(submission.title),
    presentationType,
    certificateNumber: submission.reference_number ?? referenceNumber,
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Presentation-Certificate-${submission.reference_number}.pdf"`,
    },
  })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const type = String(formData.get("type") ?? "participation")
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()

  if (!referenceNumber || !email) {
    redirect(`/certificate?type=${type}&error=not_found`)
  }

  if (type === "presentation") return handlePresentation(referenceNumber, email)
  if (type === "workshop") return handleWorkshop(referenceNumber, email)
  if (type === "volunteer") return handleVolunteer(referenceNumber, email)
  return handleParticipation(referenceNumber, email)
}
