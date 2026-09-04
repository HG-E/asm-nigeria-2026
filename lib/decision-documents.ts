import "server-only"

import { randomBytes } from "node:crypto"

import { generateAcceptanceLetterPdf, generateAcceptanceNotificationPdf, type DecisionLetterData } from "@/lib/decision-letter"
import { createAdminClient } from "@/lib/supabase/admin"

const ACCEPT_DECISIONS = ["accepted", "accepted_oral", "accepted_poster"]

export function isAcceptDecision(decision: string): boolean {
  return ACCEPT_DECISIONS.includes(decision)
}

// Generates both PDFs, uploads them to the private decision-documents
// bucket, and records a long, unguessable access token for each -- the
// email links to these tokens directly (see app/letters/[token]/route.ts),
// not to a short-lived signed URL, since an author may open the link months
// later. Only called for accept-type decisions (accepted, accepted_oral,
// accepted_poster); revision/reject decisions never get a letter.
export async function createDecisionDocuments(
  decisionId: string,
  submissionId: string,
  data: DecisionLetterData
): Promise<{ notificationToken: string; letterToken: string } | { error: string }> {
  const admin = createAdminClient()

  const [notificationBytes, letterBytes] = await Promise.all([
    generateAcceptanceNotificationPdf(data),
    generateAcceptanceLetterPdf(data),
  ])

  const notificationToken = randomBytes(24).toString("base64url")
  const letterToken = randomBytes(24).toString("base64url")

  const notificationPath = `${submissionId}/notification-${decisionId}.pdf`
  const letterPath = `${submissionId}/letter-${decisionId}.pdf`

  const [notificationUpload, letterUpload] = await Promise.all([
    admin.storage
      .from("decision-documents")
      .upload(notificationPath, notificationBytes, { contentType: "application/pdf", upsert: true }),
    admin.storage
      .from("decision-documents")
      .upload(letterPath, letterBytes, { contentType: "application/pdf", upsert: true }),
  ])

  if (notificationUpload.error || letterUpload.error) {
    return { error: notificationUpload.error?.message ?? letterUpload.error?.message ?? "Upload failed" }
  }

  const rows = [
    {
      decision_id: decisionId,
      submission_id: submissionId,
      doc_type: "notification",
      access_token: notificationToken,
      storage_path: notificationPath,
    },
    {
      decision_id: decisionId,
      submission_id: submissionId,
      doc_type: "letter",
      access_token: letterToken,
      storage_path: letterPath,
    },
  ]

  // The row being finalized (decisions.is_final = true, a moment ago, on a
  // separate request/connection) can occasionally not be visible yet to
  // this insert's FK check under Supabase's pooled connections -- a brief
  // retry absorbs that instead of losing the whole finalize over it.
  let insertError: { message: string } | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await admin.from("decision_documents").insert(rows)
    insertError = result.error
    if (!insertError) break
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400))
  }

  if (insertError) {
    return { error: insertError.message }
  }

  return { notificationToken, letterToken }
}
