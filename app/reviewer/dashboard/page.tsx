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

export default async function ReviewerDashboardPage(props: PageProps<"/reviewer/dashboard">) {
  const session = await requireRole("reviewer")
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const filter = typeof searchParams.filter === "string" ? searchParams.filter : ""

  const { data: assignments } = await supabase
    .from("review_assignments")
    .select("*, submissions(reference_number, title, conference_subthemes(name)), reviews(is_submitted)")
    .eq("reviewer_id", session.authUserId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })

  const allRows = assignments ?? []
  const nowIso = new Date().toISOString()
  const isOpen = (a: (typeof allRows)[number]) => a.status === "pending" || a.status === "in_progress"
  const isOverdue = (a: (typeof allRows)[number]) => isOpen(a) && !!a.due_date && a.due_date < nowIso

  const pending = allRows.filter(isOpen)
  const completed = allRows.filter((a) => a.status === "completed")
  const overdue = allRows.filter(isOverdue)

  const summary: { label: string; value: number; icon: typeof ClipboardList; accent: StatAccent; href: string }[] = [
    { label: "Assigned", value: allRows.length, icon: ClipboardList, accent: "blue", href: "/reviewer/dashboard" },
    { label: "Pending", value: pending.length, icon: Clock, accent: "gold", href: "/reviewer/dashboard?filter=pending" },
    { label: "Completed", value: completed.length, icon: CheckCheck, accent: "gold", href: "/reviewer/dashboard?filter=completed" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, accent: overdue.length > 0 ? "red" : "muted", href: "/reviewer/dashboard?filter=overdue" },
  ]

  const rows =
    filter === "pending"
      ? pending
      : filter === "completed"
        ? completed
        : filter === "overdue"
          ? overdue
          : allRows

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${session.profile.first_name}`}
        description="Your assigned abstracts for scientific review."
      />

      <StatGrid className="sm:grid-cols-4">
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} href={s.href} />
        ))}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>
            {filter ? `${filter[0].toUpperCase()}${filter.slice(1)} abstracts` : "Assigned abstracts"} ({rows.length})
            {filter && (
              <Link href="/reviewer/dashboard" className="text-muted-foreground ml-2 text-xs font-normal hover:underline">
                Clear filter
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {allRows.length === 0 ? "No abstracts assigned yet." : "No abstracts match this filter."}
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
