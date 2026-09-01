import Link from "next/link"
import {
  CircleCheck,
  ClipboardList,
  FilePlus2,
  Inbox,
  Layers,
  RotateCcw,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import {
  Card,
  CardContent,
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
import { STATUS_HINTS } from "@/lib/submission-status"
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

function statusVariant(status: SubmissionStatus): "gold" | "secondary" | "destructive" | "outline" {
  if (status === "draft") return "outline"
  if (ACCEPTED_STATUSES.includes(status)) return "gold"
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

  const summaryCards: { label: string; value: number; icon: typeof Layers; accent: StatAccent }[] = [
    { label: "Total", value: summary.total, icon: Layers, accent: "muted" },
    { label: "Drafts", value: summary.drafts, icon: FilePlus2, accent: "muted" },
    { label: "Submitted", value: summary.submitted, icon: Inbox, accent: "blue" },
    { label: "Under review", value: summary.underReview, icon: ClipboardList, accent: "blue" },
    { label: "Revision required", value: summary.revisionRequired, icon: RotateCcw, accent: "muted" },
    { label: "Accepted", value: summary.accepted, icon: CircleCheck, accent: "gold" },
    { label: "Rejected", value: summary.rejected, icon: XCircle, accent: "red" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${session.profile.first_name}`}
        description={
          session.profile.asm_id_number
            ? `ASM ID ${session.profile.asm_id_number} · Track and manage your abstract submissions.`
            : "Track and manage your abstract submissions."
        }
        actions={
          <Link href="/author/submissions/new" className={buttonVariants()}>
            + Submit New Abstract
          </Link>
        }
      />

      <StatGrid className="lg:grid-cols-7">
        {summaryCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </StatGrid>

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
                      <TableCell className="max-w-40 truncate" title={submission.conference_subthemes?.name ?? undefined}>
                        {submission.conference_subthemes?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(submission.status)}>
                          {STATUS_LABELS[submission.status]}
                        </Badge>
                        {STATUS_HINTS[submission.status] && (
                          <p className="text-muted-foreground mt-1 max-w-48 text-xs text-balance">
                            {STATUS_HINTS[submission.status]}
                          </p>
                        )}
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
