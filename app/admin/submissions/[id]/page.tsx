import { notFound } from "next/navigation"

import { proposeDecisionAction } from "@/app/committee/submissions/[id]/actions"
import { DecisionFinalizePanel } from "@/components/admin/decision-finalize-panel"
import { PaymentVerificationPanel } from "@/components/admin/payment-verification-panel"
import { ReviewerAssignmentPanel } from "@/components/admin/reviewer-assignment-panel"
import { DecisionForm } from "@/components/committee/decision-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function AdminSubmissionDetailPage(
  props: PageProps<"/admin/submissions/[id]">
) {
  await requireRole("admin")
  const { id } = await props.params
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, conference_subthemes(name)")
    .eq("id", id)
    .maybeSingle()

  if (!submission) {
    notFound()
  }

  const [{ data: authors }, { data: version }, { data: documents }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("submission_authors")
        .select("*")
        .eq("submission_id", id)
        .order("author_order", { ascending: true }),
      supabase
        .from("submission_versions")
        .select("*")
        .eq("submission_id", id)
        .eq("version_number", submission.current_version)
        .maybeSingle(),
      supabase.from("submission_documents").select("*").eq("submission_id", id).eq("is_current", true),
      supabase
        .from("review_assignments")
        .select("*, user_profiles:reviewer_id(first_name, last_name)")
        .eq("submission_id", id)
        .eq("is_active", true),
    ])

  const { data: decisionRows } = await supabase
    .from("decisions")
    .select("*")
    .eq("submission_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
  const latestDecision = decisionRows?.[0]

  // Same admin/super_admin ("ASM") login already satisfies requireRole("committee")
  // via the role hierarchy -- this mirrors /committee/submissions/[id]'s propose
  // form directly on the admin page so ASM can propose AND finalize in one place,
  // without needing a separate committee-role account for a single-person review.
  const DECIDABLE_STATUSES = ["reviews_completed", "decision_pending"]
  const hasFinalDecision = latestDecision?.is_final ?? false
  const isNotYetDecidable = !hasFinalDecision && !DECIDABLE_STATUSES.includes(submission.status)
  const proposeLockReason = hasFinalDecision ? "final" : isNotYetDecidable ? "not_decidable" : null
  const draftDecision = latestDecision && !latestDecision.is_final ? latestDecision : null
  const decisionToPropose = hasFinalDecision ? latestDecision : draftDecision

  const { data: reviewerPool } = await supabase
    .from("reviewer_profiles")
    .select("user_id, user_profiles:user_id(first_name, last_name)")
    .eq("conference_id", submission.conference_id)
    .eq("is_active", true)

  let receiptUrl: string | null = null
  if (submission.payment_receipt_path) {
    const { data: signed } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(submission.payment_receipt_path, 60 * 10)
    receiptUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{submission.title || "Untitled"}</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {submission.reference_number ?? "No reference (draft)"}
          </p>
        </div>
        <Badge variant="secondary">{submission.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-y-2">
            <dt className="text-muted-foreground">Subtheme</dt>
            <dd>{submission.conference_subthemes?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Presentation</dt>
            <dd className="capitalize">{submission.presentation_preference}</dd>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd>
              {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "—"}
            </dd>
          </dl>
          {submission.keywords && submission.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.keywords.map((k) => (
                <Badge key={k} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authors</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {authors?.map((a) => (
              <li key={a.id}>
                {a.first_name} {a.last_name}
                {a.is_corresponding && (
                  <span className="text-muted-foreground"> (Corresponding)</span>
                )}
                {a.institution && <span className="text-muted-foreground"> — {a.institution}</span>}
                {" · "}
                <span className="text-muted-foreground">{a.email}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abstract ({version?.word_count ?? 0} words)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {version?.abstract_text || "No content yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Declarations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>No conflict of interest: {submission.no_conflict_of_interest ? "Yes" : "No"}</p>
          <p>Ethical approval obtained: {submission.ethical_approval_obtained ? "Yes" : "No"}</p>
          <p>Funding/support: {submission.funding_declaration || "—"}</p>
          <p>Originality confirmed: {submission.originality_confirmed ? "Yes" : "No"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document</CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <p className="text-sm">{documents[0].file_name}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No document uploaded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentVerificationPanel
            submissionId={id}
            status={submission.payment_status}
            currency={submission.payment_currency}
            receiptUrl={receiptUrl}
            receiptFileName={submission.payment_receipt_path?.split("/").pop() ?? null}
            rejectionReason={submission.payment_rejection_reason}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewerAssignmentPanel
            submissionId={id}
            assignments={(assignments ?? []).map((a) => ({
              id: a.id,
              status: a.status,
              reviewerId: a.reviewer_id,
              reviewerName: a.user_profiles
                ? `${a.user_profiles.first_name} ${a.user_profiles.last_name}`
                : "Unknown reviewer",
            }))}
            availableReviewers={(reviewerPool ?? []).map((r) => ({
              id: r.user_id,
              name: r.user_profiles
                ? `${r.user_profiles.first_name} ${r.user_profiles.last_name}`
                : "Unknown reviewer",
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Propose Decision (as Committee)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Your ASM admin login already has committee sign-in rights, so you can propose the
            decision here directly — no separate committee-member account or reviewer step
            needed.
          </p>
          <DecisionForm
            lockReason={proposeLockReason}
            defaultValues={{
              decision: decisionToPropose?.decision,
              decisionNotes: decisionToPropose?.decision_notes ?? "",
              authorMessage: decisionToPropose?.author_message ?? "",
              revisionDeadline: decisionToPropose?.revision_deadline?.slice(0, 10) ?? "",
            }}
            onSave={proposeDecisionAction.bind(null, id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finalize Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionFinalizePanel
            submissionId={id}
            decision={
              latestDecision
                ? {
                    id: latestDecision.id,
                    decision: latestDecision.decision,
                    decisionNotes: latestDecision.decision_notes,
                    authorMessage: latestDecision.author_message,
                    revisionDeadline: latestDecision.revision_deadline,
                    isFinal: latestDecision.is_final,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
