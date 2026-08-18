import { notFound } from "next/navigation"

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
        .eq("submission_id", id),
    ])

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
          <CardTitle className="text-base">Review Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments && assignments.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {assignments.map((a) => (
                <li key={a.id}>
                  {a.user_profiles?.first_name} {a.user_profiles?.last_name} —{" "}
                  <span className="text-muted-foreground">{a.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Not yet assigned to a reviewer.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
