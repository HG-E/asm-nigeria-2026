import { type NextRequest, NextResponse } from "next/server"

import { generateCoauthorFeeReceipt } from "@/lib/receipt"
import { COAUTHOR_FEE_NGN, namesLikelyMatch } from "@/lib/presentation-certificate"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim() ?? ""
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? ""

  if (!email || !name) {
    return NextResponse.json({ error: "Missing email or name." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conference } = await admin.from("conferences").select("id").eq("is_active", true).maybeSingle()
  if (!conference) {
    return NextResponse.json({ error: "No active conference configured." }, { status: 404 })
  }

  const normalizedEmail = email.toLowerCase()
  // Same safe pattern as everywhere else in this app: filter server-side on
  // the cheap, known-safe column, then compare the email exactly in JS --
  // never .ilike(column, email). The name check on top is the same
  // namesLikelyMatch guard getCoauthorFeeStatus uses, for the same reason:
  // two different people can share one listed email, and a receipt is
  // exactly the kind of document that must never be handed to the wrong one.
  const { data: rows } = await admin
    .from("coauthor_certificate_fees")
    .select("id, full_name, email, payment_status, verified_at, submitted_at")
    .eq("conference_id", conference.id)
  const fee = rows?.find(
    (r) => r.email.trim().toLowerCase() === normalizedEmail && namesLikelyMatch(r.full_name, name)
  )

  if (!fee || fee.payment_status !== "verified") {
    return NextResponse.json({ error: "No verified co-author fee found for this email and name." }, { status: 404 })
  }

  const pdfBytes = await generateCoauthorFeeReceipt({
    fullName: fee.full_name,
    email: fee.email,
    amountNgn: COAUTHOR_FEE_NGN,
    receiptNumber: `CF-${fee.id.slice(0, 8).toUpperCase()}`,
    issuedAt: fee.verified_at ? new Date(fee.verified_at) : new Date(fee.submitted_at),
  })

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ASM-Nigeria-2026-Coauthor-Fee-Receipt-${fee.id.slice(0, 8)}.pdf"`,
    },
  })
}
