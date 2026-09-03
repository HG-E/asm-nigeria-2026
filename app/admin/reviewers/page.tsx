import { AlertTriangle, CheckCheck, ClipboardList, Users } from "lucide-react"

import { AddReviewerForm } from "@/components/admin/add-reviewer-form"
import { ReviewerRow } from "@/components/admin/reviewer-row"
import { ReviewerWorkloadDialog, type WorkloadAssignment } from "@/components/admin/reviewer-workload-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createClient } from "@/lib/supabase/server"

export default async function AdminReviewersPage() {
  await requireRole("admin")
  const supabase = await createClient()
  const conference = await getActiveConference()

  const [{ data: reviewers }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("reviewer_profiles")
      .select("*, user_profiles(first_name, last_name, email, institution), conference_subthemes(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("review_assignments")
      .select("*, submissions(id, reference_number, title)")
      .eq("is_active", true),
  ])

  const nowIso = new Date().toISOString()
  const isOpen = (status: string) => status === "pending" || status === "in_progress"

  const byReviewer = new Map<string, typeof assignmentRows>()
  for (const a of assignmentRows ?? []) {
    const list = byReviewer.get(a.reviewer_id) ?? []
    list.push(a)
    byReviewer.set(a.reviewer_id, list)
  }

  const workloadByReviewer = new Map(
    (reviewers ?? []).map((r) => {
      const list = byReviewer.get(r.user_id) ?? []
      const completed = list.filter((a) => a.status === "completed").length
      const pending = list.filter((a) => isOpen(a.status)).length
      const overdue = list.filter(
        (a) => isOpen(a.status) && a.due_date && a.due_date < nowIso
      ).length
      const assignments: WorkloadAssignment[] = list.map((a) => ({
        id: a.id,
        submissionId: a.submissions?.id ?? "",
        referenceNumber: a.submissions?.reference_number ?? null,
        title: a.submissions?.title ?? null,
        status: a.status,
        dueDate: a.due_date,
        overdue: isOpen(a.status) && !!a.due_date && a.due_date < nowIso,
      }))
      return [r.id, { assigned: list.length, completed, pending, overdue, assignments }]
    })
  )

  const totals = [...workloadByReviewer.values()].reduce(
    (acc, w) => ({
      pending: acc.pending + w.pending,
      overdue: acc.overdue + w.overdue,
      completed: acc.completed + w.completed,
    }),
    { pending: 0, overdue: 0, completed: 0 }
  )
  const activeReviewers = (reviewers ?? []).filter((r) => r.is_active).length

  const summary: { label: string; value: number; icon: typeof Users; accent: StatAccent; hint?: string }[] = [
    { label: "Active Reviewers", value: activeReviewers, icon: Users, accent: "blue" },
    { label: "Reviews In Progress", value: totals.pending, icon: ClipboardList, accent: "gold" },
    { label: "Overdue", value: totals.overdue, icon: AlertTriangle, accent: totals.overdue > 0 ? "red" : "muted" },
    { label: "Completed", value: totals.completed, icon: CheckCheck, accent: "gold" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reviewers"
        description="Manage the scientific reviewers for ASM Nigeria 2026. Each reviewer is mapped to a subtheme for automatic submission routing."
      />

      <StatGrid className="sm:grid-cols-4">
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} hint={s.hint} />
        ))}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Add Reviewer</CardTitle>
        </CardHeader>
        <CardContent>
          <AddReviewerForm subthemes={conference?.conference_subthemes ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Reviewers ({reviewers?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {!reviewers || reviewers.length === 0 ? (
            <p className="text-muted-foreground px-6 text-sm sm:px-0">No reviewers added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Reviewer</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewers.map((r) => {
                  const w = workloadByReviewer.get(r.id) ?? {
                    assigned: 0,
                    completed: 0,
                    pending: 0,
                    overdue: 0,
                    assignments: [] as WorkloadAssignment[],
                  }
                  const reviewerName = `${r.user_profiles?.first_name ?? ""} ${r.user_profiles?.last_name ?? ""}`.trim()
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="bg-card sticky left-0 z-10 border-r">
                        <div className="font-medium">{reviewerName || "—"}</div>
                        <div className="text-muted-foreground text-xs">{r.user_profiles?.email}</div>
                      </TableCell>
                      <TableCell>{r.user_profiles?.institution ?? "—"}</TableCell>
                      <TableCell>{r.conference_subthemes?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">
                            {w.completed}/{w.assigned} done
                          </span>
                          {w.overdue > 0 && (
                            <Badge variant="destructive">{w.overdue} overdue</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ReviewerRow reviewerId={r.id} isActive={r.is_active} />
                      </TableCell>
                      <TableCell>
                        <ReviewerWorkloadDialog
                          reviewerName={reviewerName || "This reviewer"}
                          assignments={w.assignments}
                        />
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
