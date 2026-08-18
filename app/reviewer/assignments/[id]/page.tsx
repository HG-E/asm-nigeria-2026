import { notFound } from "next/navigation"

import { declareConflictAction, saveReviewDraftAction, submitReviewAction } from "./actions"
import { ConflictDeclaration } from "@/components/reviewer/conflict-declaration"
import { ReviewForm } from "@/components/reviewer/review-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function ReviewAssignmentPage(
  props: PageProps<"/reviewer/assignments/[id]">
) {
  const session = await requireRole("reviewer")
  const { id } = await props.params
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("review_assignments")
    .select("*, submissions(id, reference_number, title, keywords, presentation_preference, current_version, conference_subthemes(name))")
    .eq("id", id)
    .eq("reviewer_id", session.authUserId)
    .maybeSingle()

  if (!assignment || !assignment.submissions) {
    notFound()
  }

  const submission = assignment.submissions

  const [{ data: version }, { data: documents }, { data: existingReview }] = await Promise.all([
    supabase
      .from("submission_versions")
      .select("abstract_text, word_count")
      .eq("submission_id", submission.id)
      .eq("version_number", submission.current_version)
      .maybeSingle(),
    supabase
      .from("submission_documents")
      .select("id, file_name, storage_path")
      .eq("submission_id", submission.id)
      .eq("is_current", true),
    supabase.from("reviews").select("*").eq("assignment_id", id).maybeSingle(),
  ])

  let documentUrl: string | null = null
  if (documents && documents.length > 0) {
    const { data: signed } = await supabase.storage
      .from("abstracts")
      .createSignedUrl(documents[0].storage_path, 60 * 10)
    documentUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{submission.title}</h1>
          <p className="text-muted-foreground font-mono text-sm">{submission.reference_number}</p>
        </div>
        <Badge variant="secondary">{assignment.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abstract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {submission.conference_subthemes?.name} &middot; {submission.presentation_preference}
            {version ? ` · ${version.word_count} words` : ""}
          </p>
          {submission.keywords && submission.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.keywords.map((k) => (
                <Badge key={k} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap">{version?.abstract_text}</p>
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              View submitted document ({documents?.[0].file_name})
            </a>
          )}
          <p className="text-muted-foreground text-xs">
            Double-blind review: author identity is not shown.
          </p>
        </CardContent>
      </Card>

      {assignment.status === "pending" && (
        <ConflictDeclaration assignmentId={id} onSubmit={declareConflictAction.bind(null, id)} />
      )}

      {assignment.status === "conflict" && (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-center text-sm">
            You declared a conflict of interest for this abstract. No further action is needed —
            the secretariat has been notified for reassignment.
          </CardContent>
        </Card>
      )}

      {(assignment.status === "in_progress" || assignment.status === "completed") && (
        <ReviewForm
          readOnly={assignment.status === "completed"}
          defaultValues={{
            scoreOriginality: existingReview?.score_originality ?? undefined,
            scoreRelevance: existingReview?.score_relevance ?? undefined,
            scoreMethodology: existingReview?.score_methodology ?? undefined,
            scoreClarity: existingReview?.score_clarity ?? undefined,
            scoreSignificance: existingReview?.score_significance ?? undefined,
            recommendation: existingReview?.recommendation ?? undefined,
            commentsToCommittee: existingReview?.comments_to_committee ?? "",
            commentsToAuthor: existingReview?.comments_to_author ?? "",
          }}
          onSave={saveReviewDraftAction.bind(null, id)}
          onSubmitReview={submitReviewAction.bind(null, id)}
        />
      )}
    </div>
  )
}
