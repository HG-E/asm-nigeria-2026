import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { generatePaymentReceipt } from "@/lib/receipt"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()

  if (!referenceNumber || !email) {
    redirect("/receipt?error=not_found")
  }

  const admin = createAdminClient()
  const { data: registration } = await admin
    .from("conference_registrations")
    .select(
      "full_name, email, phone, institution, participant_category, registration_period, amount_expected, payment_status, reference_number, payment_verified_at"
    )
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  // Exact match + JS comparison, not .ilike("email", email) -- ilike treats
  // "%" and "_" as wildcards, which would let a submitted email of "%"
  // match this row regardless of its real email (the exact bug fixed in
  // app/certificate/download/route.ts after it was confirmed exploitable
  // there).
  if (!registration || registration.email.toLowerCase() !== email.toLowerCase()) {
    redirect("/receipt?error=not_found")
  }

  if (registration.payment_status !== "verified") {
    redirect("/receipt?error=not_verified")
  }

  // "Free" registrations (Committee Member, Volunteer) have nothing to
  // issue a payment receipt for -- no money changed hands. Anyone who also
  // added the paid workshop on top of a free category still has a real
  // amount_expected (e.g. "Free + ₦8,000 (...)"), so this only excludes the
  // genuinely zero-payment case, not a free-category-plus-workshop one.
  if (registration.amount_expected.trim() === "Free") {
    redirect("/receipt?error=no_payment")
  }

  const pdfBytes = await generatePaymentReceipt({
    fullName: registration.full_name,
    email: registration.email,
    phone: registration.phone,
    institution: registration.institution,
    participantCategory: registration.participant_category,
    registrationPeriod: registration.registration_period,
    amountExpected: registration.amount_expected,
    referenceNumber: registration.reference_number ?? referenceNumber,
    issuedAt: registration.payment_verified_at ? new Date(registration.payment_verified_at) : new Date(),
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Payment-Receipt-${registration.reference_number}.pdf"`,
    },
  })
}
