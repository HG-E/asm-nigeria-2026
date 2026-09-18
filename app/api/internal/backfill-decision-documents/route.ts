import { NextResponse } from "next/server"

import { createDecisionDocuments, isAcceptDecision } from "@/lib/decision-documents"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// One-time operational tool, not a permanent feature: generates and sends
// the acceptance notification + letter for every already-finalized
// accept-type decision that predates the auto-generation feature (shipped
// 2026-09-04/05) and so never got one. Idempotent by construction -- only
// picks up submissions with zero decision_documents rows, so re-running is
// safe and never double-sends. Removed from the repo after use.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Optional scoping to a single submission (?referenceNumber=ASM-...) so
  // one author can be fixed and re-notified on request without touching the
  // other still-pending ones in the same batch.
  const referenceNumber = new URL(request.url).searchParams.get("referenceNumber")

  const { data: decisions } = await admin
    .from("decisions")
    .select("id, submission_id, decision")
    .eq("is_final", true)

  const results: { referenceNumber: string; status: string }[] = []

  for (const decision of decisions ?? []) {
    if (!isAcceptDecision(decision.decision)) continue

    if (referenceNumber) {
      const { data: sub } = await admin
        .from("submissions")
        .select("reference_number")
        .eq("id", decision.submission_id)
        .single()
      if (sub?.reference_number !== referenceNumber) continue
    }

    const { data: existingDocs } = await admin
      .from("decision_documents")
      .select("id")
      .eq("submission_id", decision.submission_id)
      .limit(1)
    if (existingDocs && existingDocs.length > 0) continue

    const { data: submission } = await admin
      .from("submissions")
      .select("id, title, reference_number, presentation_preference, corresponding_author_id")
      .eq("id", decision.submission_id)
      .single()
    if (!submission) continue

    const { data: author } = await admin
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("id", submission.corresponding_author_id)
      .single()

    const presentationType =
      decision.decision === "accepted_oral"
        ? "Oral Presentation"
        : decision.decision === "accepted_poster"
          ? "Poster Presentation"
          : submission.presentation_preference === "oral"
            ? "Oral Presentation"
            : submission.presentation_preference === "poster"
              ? "Poster Presentation"
              : "Oral or Poster Presentation"

    const docResult = await createDecisionDocuments(decision.id, submission.id, {
      authorFullName: `${author?.first_name ?? ""} ${author?.last_name ?? ""}`.trim(),
      abstractTitle: submission.title ?? "Untitled",
      referenceNumber: submission.reference_number ?? submission.id,
      presentationType,
    })

    if ("error" in docResult) {
      results.push({ referenceNumber: submission.reference_number ?? submission.id, status: `doc_error: ${docResult.error}` })
      continue
    }

    const { data: notification } = await admin
      .from("notifications")
      .insert({
        recipient_id: submission.corresponding_author_id,
        recipient_email: author?.email ?? "",
        submission_id: submission.id,
        notification_type: "decision_notification",
        subject: `Decision on your submission: ${submission.reference_number}`,
        status: "pending",
      })
      .select("id")
      .single()

    if (notification) {
      await sendNotifications([notification.id])
    }

    results.push({ referenceNumber: submission.reference_number ?? submission.id, status: "sent" })
  }

  return NextResponse.json({ processed: results.length, results })
}
