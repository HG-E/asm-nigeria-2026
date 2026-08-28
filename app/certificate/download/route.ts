import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { generateParticipationCertificate, generatePresentationCertificate } from "@/lib/certificate"
import { createAdminClient } from "@/lib/supabase/admin"

async function handleParticipation(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, payment_status, attended")
    .eq("reference_number", referenceNumber)
    .ilike("email", email)
    .maybeSingle()

  if (!registration) {
    redirect("/certificate?type=participation&error=not_found")
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
    abstractTitle: submission.title,
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

  return type === "presentation" ? handlePresentation(referenceNumber, email) : handleParticipation(referenceNumber, email)
}
