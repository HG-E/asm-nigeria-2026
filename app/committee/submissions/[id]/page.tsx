import { notFound } from "next/navigation"

import { proposeDecisionAction } from "./actions"
import { DecisionForm } from "@/components/committee/decision-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function CommitteeSubmissionDetailPage(
  props: PageProps<"/committee/submissions/[id]">
) {
  await requireRole("committee")
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

  const [{ data: authors }, { data: versions }, { data: assignments }, { data: decisions }] =
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
        .order("version_number", { ascending: true }),
      supabase
        .from("review_assignments")
        .select("*, user_profiles:reviewer_id(first_name, last_name), reviews(*)")
        .eq("submission_id", id)
        .eq("is_active", true),
      supabase
        .from("decisions")
        .select("*")
        .eq("submission_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
    ])

  const currentVersion = versions?.find((v) => v.version_number === submission.current_version)
  const latestDecision = decisions?.[0]
  // A finalized decision from an earlier review round (the committee asked
  // for a revision, the author resubmitted) is history, not a lock on the
  // current round -- only the submission's own status says whether a new
  // decision can be proposed right now.
  const DECIDABLE_STATUSES = ["reviews_completed", "decision_pending"]
  const isLocked = !DECIDABLE_STATUSES.includes(submission.status)
  const draftDecision = latestDecision && !latestDecision.is_final ? latestDecision : null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{submission.title || "Untitled"}</h1>
          <p className="text-muted-foreground font-mono text-sm">{submission.reference_number}</p>
        </div>
        <Badge variant="secondary">{submission.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {submission.conference_subthemes?.name} · {submission.presentation_preference}
          </p>
          <p className="whitespace-pre-wrap">{currentVersion?.abstract_text}</p>
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
                {a.is_corresponding && <span className="text-muted-foreground"> (Corresponding)</span>}
                {a.institution && <span className="text-muted-foreground"> — {a.institution}</span>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!assignments || assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviewer assigned yet.</p>
          ) : (
            assignments.map((a) => {
              const review = a.reviews
              return (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {a.user_profiles?.first_name} {a.user_profiles?.last_name}
                    </span>
                    <Badge variant="secondary">{a.status}</Badge>
                  </div>
                  {review?.is_submitted ? (
                    <div className="mt-2 space-y-1">
                      <p>
                        Average score: <strong>{review.average_score}</strong> · Recommendation:{" "}
                        <strong>{review.recommendation?.replaceAll("_", " ")}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        Originality {review.score_originality}, Relevance {review.score_relevance},
                        Methodology {review.score_methodology}, Clarity {review.score_clarity},
                        Significance {review.score_significance}
                      </p>
                      {review.comments_to_committee && (
                        <p>
                          <span className="text-muted-foreground">To committee: </span>
                          {review.comments_to_committee}
                        </p>
                      )}
                      {review.comments_to_author && (
                        <p>
                          <span className="text-muted-foreground">To author: </span>
                          {review.comments_to_author}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-2">
                      {a.status === "conflict" ? "Declared a conflict of interest." : "Review not yet submitted."}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {versions && versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.id}>
                  Version {v.version_number}
                  {v.version_number === 1 ? " (original submission)" : ""} —{" "}
                  <span className="text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString()}, {v.word_count} words
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionForm
            isFinal={isLocked}
            defaultValues={{
              decision: draftDecision?.decision,
              decisionNotes: draftDecision?.decision_notes ?? "",
              authorMessage: draftDecision?.author_message ?? "",
              revisionDeadline: draftDecision?.revision_deadline?.slice(0, 10) ?? "",
            }}
            onSave={proposeDecisionAction.bind(null, id)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
