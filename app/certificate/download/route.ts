import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { generateParticipationCertificate } from "@/lib/certificate"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()

  if (!referenceNumber || !email) {
    redirect("/certificate?error=not_found")
  }

  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select("full_name, reference_number, payment_status, attended")
    .eq("reference_number", referenceNumber)
    .ilike("email", email)
    .maybeSingle()

  if (!registration) {
    redirect("/certificate?error=not_found")
  }
  if (registration.payment_status !== "verified") {
    redirect("/certificate?error=not_verified")
  }
  if (!registration.attended) {
    redirect("/certificate?error=not_attended")
  }

  const pdfBytes = await generateParticipationCertificate({
    fullName: registration.full_name,
    certificateNumber: registration.reference_number ?? referenceNumber,
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Certificate-${registration.reference_number}.pdf"`,
    },
  })
}
