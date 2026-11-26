import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import {
  generateParticipationCertificate,
  generatePresentationCertificate,
  generateVolunteerCertificate,
  generateWorkshopCertificate,
} from "@/lib/certificate"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCoauthorFeeStatus, lookupPresentationEligibility } from "@/lib/presentation-certificate"

async function handleParticipation(referenceNumber: string, email: string) {
  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, email, payment_status, attended, participant_category")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  // Compared in JS, not via .ilike("email", email) -- ilike treats "%" and
  // "_" as wildcards, so a submitted email of e.g. "%" would match every
  // row's email and return a certificate with no real knowledge of who it
  // belongs to. Reference numbers are sequential and easily guessed, so
  // that alone was enough to download anyone's certificate. Confirmed
  // exploitable in this exact form before this fix.
  if (!registration || registration.email.toLowerCase() !== email.toLowerCase()) {
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
    .select("full_name, reference_number, email, payment_status, attended, amount_expected")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  // See handleParticipation's comment -- compared in JS rather than via
  // .ilike("email", email), which a wildcard email could bypass entirely.
  if (!registration || registration.email.toLowerCase() !== email.toLowerCase()) {
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
    .select("full_name, reference_number, email, payment_status, attended, participant_category")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  // See handleParticipation's comment -- compared in JS rather than via
  // .ilike("email", email), which a wildcard email could bypass entirely.
  if (!registration || registration.email.toLowerCase() !== email.toLowerCase()) {
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

async function handlePresentation(
  referenceNumber: string,
  email: string,
  authorOrderRaw: string,
  previewToken: string
) {
  const result = await lookupPresentationEligibility(referenceNumber, email, previewToken)

  if (!result.ok) {
    redirect(`/certificate?type=presentation&error=${result.error}`)
  }

  let chosen = result.candidates[0]

  if (result.candidates.length > 1) {
    const authorOrder = Number(authorOrderRaw)
    const requested = Number.isFinite(authorOrder)
      ? result.candidates.find((c) => c.authorOrder === authorOrder)
      : undefined

    if (requested) {
      chosen = requested
    } else {
      // More than one distinct person on this abstract submitted the same
      // email (a real, confirmed data pattern -- see the dedupe comment in
      // lookupPresentationEligibility) and no specific author was chosen
      // yet. Rather than guess, send them to pick their own name; that page
      // posts back here with authorOrder set.
      const params = new URLSearchParams({ referenceNumber, email })
      if (previewToken) params.set("preview", previewToken)
      redirect(`/certificate/select-author?${params.toString()}`)
    }
  }

  // Corresponding authors are exempt (already paid the abstract's own
  // processing fee); every other co-author needs this separate, flat,
  // one-time fee verified before their own certificate is issued -- see
  // migration 0045 and getCoauthorFeeStatus's own comment for why it's
  // looked up by email rather than per-submission.
  const feeStatus = await getCoauthorFeeStatus(result.conferenceId, email, chosen.isCorresponding)
  if (feeStatus !== "exempt" && feeStatus !== "verified") {
    const params = new URLSearchParams({ email, name: chosen.fullName })
    redirect(`/certificate/pay-coauthor-fee?${params.toString()}`)
  }

  const pdfBytes = await generatePresentationCertificate({
    fullName: chosen.fullName,
    abstractTitle: result.abstractTitle,
    presentationType: result.presentationType,
    certificateNumber: result.referenceNumber,
  })

  // Several authors can now download under the same abstract reference
  // number, so the author's own name is folded into the filename -- without
  // this, a corresponding author and a co-author downloading to the same
  // Downloads folder would silently collide (or "(1)"-suffix) on an
  // identical filename despite holding different certificates.
  const authorSlug = chosen.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Presentation-Certificate-${result.referenceNumber}${authorSlug ? `-${authorSlug}` : ""}.pdf"`,
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

  if (type === "presentation") {
    const authorOrder = String(formData.get("authorOrder") ?? "")
    const previewToken = String(formData.get("previewToken") ?? "")
    return handlePresentation(referenceNumber, email, authorOrder, previewToken)
  }
  if (type === "workshop") return handleWorkshop(referenceNumber, email)
  if (type === "volunteer") return handleVolunteer(referenceNumber, email)
  return handleParticipation(referenceNumber, email)
}
