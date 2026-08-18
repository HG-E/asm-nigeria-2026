import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

const UNDER_REVIEW_STATUSES: SubmissionStatus[] = [
  "screening",
  "assigned",
  "under_review",
  "reviews_completed",
  "decision_pending",
]
const ACCEPTED_STATUSES: SubmissionStatus[] = ["accepted", "accepted_oral", "accepted_poster"]

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  screening: "Screening",
  assigned: "Assigned",
  under_review: "Under review",
  reviews_completed: "Reviews completed",
  decision_pending: "Decision pending",
  revision_required: "Revision required",
  accepted: "Accepted",
  accepted_oral: "Accepted (Oral)",
  accepted_poster: "Accepted (Poster)",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}

function statusVariant(status: SubmissionStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "draft") return "outline"
  if (ACCEPTED_STATUSES.includes(status)) return "default"
  if (status === "rejected" || status === "withdrawn") return "destructive"
  if (status === "revision_required") return "secondary"
  return "secondary"
}

export default async function AuthorDashboardPage() {
  const session = await requireAuth()
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, conference_subthemes(name), decisions(decision, is_final, created_at)")
    .eq("corresponding_author_id", session.authUserId)
    .order("created_at", { ascending: false })

  const rows = submissions ?? []

  const summary = {
    total: rows.length,
    drafts: rows.filter((r) => r.status === "draft").length,
    submitted: rows.filter((r) => r.status === "submitted").length,
    underReview: rows.filter((r) => UNDER_REVIEW_STATUSES.includes(r.status)).length,
    revisionRequired: rows.filter((r) => r.status === "revision_required").length,
    accepted: rows.filter((r) => ACCEPTED_STATUSES.includes(r.status)).length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome, {session.profile.first_name}
          </h1>
          <p className="text-muted-foreground text-sm">
            ASM ID Number: {session.profile.asm_id_number}
          </p>
          <p className="text-muted-foreground text-sm">
            Track and manage your abstract submissions.
          </p>
        </div>
        <Link href="/author/submissions/new" className={buttonVariants()}>
          + Submit New Abstract
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Total", summary.total],
          ["Drafts", summary.drafts],
          ["Submitted", summary.submitted],
          ["Under review", summary.underReview],
          ["Revision required", summary.revisionRequired],
          ["Accepted", summary.accepted],
          ["Rejected", summary.rejected],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center text-sm">
              <p>You haven&apos;t submitted any abstracts yet.</p>
              <Link href="/author/submissions/new" className={buttonVariants({ size: "sm" })}>
                + Submit New Abstract
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((submission) => {
                  const finalDecision = submission.decisions?.find((d) => d.is_final)
                  return (
                    <TableRow key={submission.id}>
                      <TableCell className="font-mono text-xs">
                        {submission.reference_number ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <Link
                          href={
                            submission.status === "draft"
                              ? `/author/submissions/${submission.id}?step=1`
                              : `/author/submissions/${submission.id}`
                          }
                          className="hover:underline"
                        >
                          {submission.title || "Untitled draft"}
                        </Link>
                      </TableCell>
                      <TableCell>{submission.conference_subthemes?.name ?? "—"}</TableCell>
                      <TableCell>
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(submission.status)}>
                          {STATUS_LABELS[submission.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{finalDecision?.decision ?? "—"}</TableCell>
                      <TableCell>
                        {new Date(submission.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
