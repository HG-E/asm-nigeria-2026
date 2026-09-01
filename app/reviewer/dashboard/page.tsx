import Link from "next/link"
import { AlertTriangle, CheckCheck, ClipboardList, Clock } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function ReviewerDashboardPage() {
  const session = await requireRole("reviewer")
  const supabase = await createClient()

  const { data: assignments } = await supabase
    .from("review_assignments")
    .select("*, submissions(reference_number, title, conference_subthemes(name)), reviews(is_submitted)")
    .eq("reviewer_id", session.authUserId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })

  const rows = assignments ?? []
  const nowIso = new Date().toISOString()

  const pending = rows.filter((a) => a.status === "pending" || a.status === "in_progress")
  const completed = rows.filter((a) => a.status === "completed")
  const overdue = rows.filter(
    (a) =>
      (a.status === "pending" || a.status === "in_progress") &&
      a.due_date &&
      a.due_date < nowIso
  )

  const summary: { label: string; value: number; icon: typeof ClipboardList; accent: StatAccent }[] = [
    { label: "Assigned", value: rows.length, icon: ClipboardList, accent: "blue" },
    { label: "Pending", value: pending.length, icon: Clock, accent: "gold" },
    { label: "Completed", value: completed.length, icon: CheckCheck, accent: "gold" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, accent: "red" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${session.profile.first_name}`}
        description="Your assigned abstracts for scientific review."
      />

      <StatGrid className="sm:grid-cols-4">
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Assigned abstracts</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No abstracts assigned yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">
                      {a.submissions?.reference_number ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <Link href={`/reviewer/assignments/${a.id}`} className="hover:underline">
                        {a.submissions?.title || "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell>{a.submissions?.conference_subthemes?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "completed" ? "default" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
