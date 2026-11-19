import { NextResponse } from "next/server"

import { requireRegistrationAccess } from "@/lib/auth"
import { generateQrPng } from "@/lib/registration-qr"
import { createClient } from "@/lib/supabase/server"

// Renders a badge's check-in QR as a PNG. Scoped to a reference number that
// actually belongs to a real registration -- not just any string -- so this
// can't be used to mint a scannable code for something that was never
// registered. The QR itself is generated fresh from plain text each request
// (no stored file, nothing to expire), so it's safe to print once and reuse
// for the life of the badge.
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  await requireRegistrationAccess()
  const { ref } = await params

  const supabase = await createClient()
  const { data: registration } = await supabase
    .from("conference_registrations")
    .select("reference_number")
    .eq("reference_number", ref)
    .maybeSingle()

  if (!registration?.reference_number) {
    return NextResponse.json({ error: "Unknown reference number." }, { status: 404 })
  }

  const png = await generateQrPng(registration.reference_number)
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Printed badges are fixed once made -- a long cache is fine and
      // saves regenerating the same PNG on every repeat view.
      "Cache-Control": "private, max-age=86400",
    },
  })
}
