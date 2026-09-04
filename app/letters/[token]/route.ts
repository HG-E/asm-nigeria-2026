import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// Public, unauthenticated by design -- the long random token in the URL
// itself is the access control, matching the "click the emailed link, see
// your letter, no login" flow the acceptance email offers. Redirects to a
// freshly-generated 10-minute signed URL on every visit rather than storing
// one, so the token in the email keeps working no matter how long after
// finalization someone opens it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: doc } = await admin
    .from("decision_documents")
    .select("storage_path")
    .eq("access_token", token)
    .maybeSingle()

  if (!doc) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 })
  }

  const { data: signed } = await admin.storage
    .from("decision-documents")
    .createSignedUrl(doc.storage_path, 60 * 10)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open this document. Please try again shortly." }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
